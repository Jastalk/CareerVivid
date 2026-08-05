import * as functions from "firebase-functions/v1";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { getAIClient } from "./utils/ai.js";
import { runPassiveDeepResearchTask } from "./deepResearch";
import { purgeExpiredJobsCTS } from "./talentSolution";
import { canonicalInterviewStudioUrl } from "./emailPolicy";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
// Helper to create job ID - matches frontend logic
const createJobId = (title: string, company: string): string => {
    const sanitizedTitle = title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');
    const sanitizedCompany = company.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');
    return `${sanitizedTitle}-${sanitizedCompany}`.replace(/[\s/]/g, '-').slice(0, 100);
}

function getFrequencyDays(freq: string): number {
    switch (freq) {
        case 'daily': return 1;
        case 'every_3_days': return 3;
        case 'every_5_days': return 5;
        case 'every_week': return 7;
        case 'every_10_days': return 10;
        case 'every_14_days': return 14;
        default: return 7;
    }
}

async function generateSmartTopic(baseRole: string): Promise<string> {
    const ai = getAIClient();
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a specific, engaging interview topic or scenario for a ${baseRole}. Return ONLY the topic title, nothing else. Example: "System Design for High Scale", "Crisis Management Scenario". Keep it short.`
        });
        return (result.text || "").trim().replace(/^"|"$/g, '') || baseRole;
    } catch (e) {
        console.error("Gemini Topic Gen Error", e);
        return baseRole;
    }
}

async function generateQuestions(topic: string): Promise<string[]> {
    const ai = getAIClient();
    try {
        const prompt = `Generate 5 challenging interview questions for: "${topic}". Return ONLY the questions as a JSON array of strings. Do not use markdown code blocks.`;
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        const text = result.text || "";
        // Clean markdown code blocks if any
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Gemini Question Gen Error", e);
        return [
            "Tell me about yourself.",
            "Why are you interested in this topic?",
            "Describe a challenge you faced related to this.",
            "What comes to mind when you think of this?",
            "How would you explain this to a beginner?"
        ];
    }
}

export const sendPracticeEmails = onSchedule({
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 540,
    memory: "512MiB",
    region: "us-west1"
}, async (event) => {
    const now = admin.firestore.Timestamp.now();

    try {
        const usersSnapshot = await db.collection('users').where('emailPreferences.enabled', '==', true).get();

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const prefs = userData.emailPreferences;

            if (!prefs || !prefs.enabled) continue;

            // Check Frequency
            const lastSent = prefs.lastSentAt?.toDate() || new Date(0);
            const frequencyDays = getFrequencyDays(prefs.frequency);
            const nextDate = new Date(lastSent);
            nextDate.setDate(nextDate.getDate() + frequencyDays);

            // If strictly greater than now (future), skip. 
            // If now >= nextDate, it's due.
            if (now.toDate() < nextDate) continue;

            console.log(`Processing scheduled interview for user ${userDoc.id}`);

            try {
                let topic = "General Interview";
                if (prefs.topicSource === 'manual' && prefs.manualTopic) {
                    topic = prefs.manualTopic;
                } else {
                    const jobTitle = userData.personalDetails?.jobTitle || "Software Engineer";
                    topic = await generateSmartTopic(jobTitle);
                }

                // Generate Questions
                const questions = await generateQuestions(topic);


                // Save to Practice History
                const jobData = {
                    title: topic,
                    company: "Scheduled Practice",
                    location: "Remote",
                    description: `Scheduled practice session for ${topic}`,
                    url: ""
                };

                // Use random suffix to ensure uniqueness even if topic repeats
                const randomIds = Math.random().toString(36).substring(7);
                const jobId = createJobId(jobData.title, jobData.company) + '-' + randomIds;

                await db.collection('users').doc(userDoc.id).collection('practiceHistory').doc(jobId).set({
                    id: jobId,
                    job: { ...jobData, id: jobId },
                    questions: questions,
                    timestamp: now,
                    section: 'interviews'
                });

                // Send Email
                const emailLink = canonicalInterviewStudioUrl(jobId);

                await db.collection('mail').add({
                    to: userData.email,
                    message: {
                        subject: `Practice Time: ${topic}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #4F46E5;">Hi ${userData.personalDetails?.firstName || 'there'},</h2>
                                <p>It's time for your scheduled practice session!</p>
                                <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin: 0; color: #1F2937;">${topic}</h3>
                                    <p style="margin: 5px 0 0; color: #6B7280;">${questions.length} Questions • AI Interviewer Ready</p>
                                </div>
                                <p style="text-align: center; margin: 30px 0;">
                                    <a href="${emailLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Interview Now</a>
                                </p>
                                <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                                    Or copy this link: <a href="${emailLink}">${emailLink}</a>
                                </p>
                            </div>
                        `
                    }
                });

                // Update Last Sent
                await userDoc.ref.update({
                    'emailPreferences.lastSentAt': now
                });

            } catch (error) {
                console.error(`Error processing individual user ${userDoc.id}:`, error);
            }
        }
    } catch (error) {
        console.error("Error in sendPracticeEmails job:", error);
    }
});

// Scheduled cleanup for job search cache
// Runs daily and deletes cache entries not accessed in 14 days
export const cleanupJobSearchCache = onSchedule({
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 300,
    memory: "512MiB",
    region: "us-west1"
}, async (event) => {
    console.log("[cleanupJobSearchCache] Starting cache cleanup...");

    try {
        const twoWeeksAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        );

        // Query for stale entries
        const staleEntriesSnapshot = await db.collection('jobSearchCache')
            .where('lastAccessedAt', '<', twoWeeksAgo)
            .get();

        if (staleEntriesSnapshot.empty) {
            console.log("[cleanupJobSearchCache] No stale cache entries found.");
            return;
        }

        // Batch delete (Firestore batches are limited to 500 operations)
        const batchSize = 500;
        let deletedCount = 0;

        for (let i = 0; i < staleEntriesSnapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const chunk = staleEntriesSnapshot.docs.slice(i, i + batchSize);

            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            deletedCount += chunk.length;
        }

        console.log(`[cleanupJobSearchCache] Deleted ${deletedCount} stale cache entries.`);
    } catch (error) {
        console.error("[cleanupJobSearchCache] Error during cleanup:", error);
    }
});

// Scheduled cleanup for usage logs (login, activity, error logs)
// Runs daily and deletes logs older than 14 days
export const cleanupUsageLogs = onSchedule({
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 300,
    memory: "512MiB",
    region: "us-west1"
}, async (event) => {
    console.log("[cleanupUsageLogs] Starting usage logs cleanup...");

    try {
        const twoWeeksAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        );

        // Query for old logs
        const oldLogsSnapshot = await db.collection('usage_logs')
            .where('timestamp', '<', twoWeeksAgo)
            .get();

        if (oldLogsSnapshot.empty) {
            console.log("[cleanupUsageLogs] No old logs found.");
            return;
        }

        // Batch delete (Firestore batches are limited to 500 operations)
        const batchSize = 500;
        let deletedCount = 0;

        for (let i = 0; i < oldLogsSnapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const chunk = oldLogsSnapshot.docs.slice(i, i + batchSize);

            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            deletedCount += chunk.length;
        }

        console.log(`[cleanupUsageLogs] Deleted ${deletedCount} old usage logs.`);
    } catch (error) {
        console.error("[cleanupUsageLogs] Error during cleanup:", error);
    }
});

/**
 * Passive Mode: Autonomous Deep Research Agent
 * Checks daily if it should run based on admin_settings/blog_automation
 */
export const passiveDeepResearchCron = onSchedule({
    schedule: "every day 00:00", // Runs daily but logic dictates if it proceeds
    timeZone: "America/Chicago", // Defaulting to Central
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "us-west1"
}, async (event) => {
    console.log("[passiveDeepResearchCron] Checking automation schedule...");

    try {
        const configSnap = await db.collection("admin_settings").doc("blog_automation").get();
        if (!configSnap.exists) {
            console.log("No blog_automation config found. Skipping.");
            return;
        }

        const config = configSnap.data();
        if (!config?.isActive) {
            console.log("Blog automation is not marked active. Skipping.");
            return;
        }

        // Extremely simplified check: if config says "Weekly" and "Monday", we ideally check if today is Monday.
        // For demonstration of the feature, we will log the check and proceed if logic matches.
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });

        if (config.frequency === 'Weekly' && config.day !== today) {
            console.log(`Schedule requires ${config.day}, but today is ${today}. Skipping.`);
            return;
        }

        // Ideally fetch a trending topic using Gemini or a News API
        // For now, we will use Gemini to invent a pertinent topic if not provided
        const ai = getAIClient();
        const topicRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Give me exactly one modern, highly-relevant, and catchy blog post title about the future of tech careers, AI, or software engineering. Return nothing but the string."
        });
        const topic = (topicRes.text || "").trim();

        console.log(`[passiveDeepResearchCron] Selected autonomous topic: ${topic}`);

        // Run the agent
        await runPassiveDeepResearchTask(topic);

    } catch (error) {
        console.error("[passiveDeepResearchCron] Error during execution:", error);
    }
});

/**
 * Daily scheduler to purge expired jobs from Google Cloud Talent Solution & Firestore cache.
 * Keeps storage costs down and ensures data freshness by enforcing 14-day TTL.
 */
export const purgeExpiredTalentJobsCron = onSchedule({
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 540,
    memory: "512MiB",
    region: "us-west1"
}, async (event) => {
    console.log("[purgeExpiredTalentJobsCron] Starting daily Cloud Talent Solution expired jobs cleanup...");
    try {
        await purgeExpiredJobsCTS();
        console.log("[purgeExpiredTalentJobsCron] Daily CTS expired jobs cleanup completed successfully.");
    } catch (error) {
        console.error("[purgeExpiredTalentJobsCron] Critical error during execution:", error);
    }
});
