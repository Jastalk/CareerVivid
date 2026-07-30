import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { secureCorsHandler } from "./utils/corsUtils.js";
import { randomUUID } from "crypto";
const uuidv4 = randomUUID;
import { resolveAuth } from "./utils/authUtils.js";

const db = admin.firestore();
const corsHandler = secureCorsHandler;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Auth helper shared by the portfolio agent API
//
// The generic /firestoreCrud endpoint that used to live here was removed: it was
// an Admin-SDK read/write primitive reachable with any signed-in user's ID token,
// so a PATCH on your own users/{uid} document bypassed the protectedUserFields()
// guard in firestore.rules and could set plan/role directly.
// ─────────────────────────────────────────────────────────────────────────────

async function handleApiAuth(req: any, res: any) {
  const authResult = await resolveAuth(req);
  if (!authResult) {
    res.status(401).json({
      error: "Unauthorized.",
      hint: "Provide a CareerVivid API key in the x-api-key header.",
    });
    return null;
  }
  return authResult;
}
// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Specific Portfolio Agent API
//
// Targets the exact document: portfolio/JiawenEvanZhu/edit/hcvcJXT92g70vQ5Ipbez
//
// Schema (matching editPortfolio.ts):
//   hero         { headline, subheadline, ctaPrimaryLabel, ctaPrimaryUrl, ... }
//   about        string
//   timeline     Array<{ id, jobTitle, employer, city, startDate, endDate, description }>
//   education    Array<{ id, degree, school, startDate, endDate, description }>
//   techStack    Array<{ id, name, rating? }>
//   projects     Array<{ id, title, description, url?, githubUrl?, thumbnailUrl?, techUsed? }>
//   socialLinks  Array<{ id, label, url, icon? }>
//   contactEmail string
//   sectionLabels { about, timeline, techStack, projects, contact }
// ─────────────────────────────────────────────────────────────────────────────

async function resolveUserPortfolioRef(uid: string): Promise<admin.firestore.DocumentReference> {
  const snap = await db.collection("users").doc(uid).collection("portfolios")
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();
  
  if (snap.empty) {
    throw new Error("No portfolio found for this user. Please create one first.");
  }
  return snap.docs[0].ref;
}

async function getPortfolioDoc(uid: string): Promise<{ ref: admin.firestore.DocumentReference, data: Record<string, any> }> {
  const ref = await resolveUserPortfolioRef(uid);
  const snap = await ref.get();
  return { ref, data: snap.data() || {} };
}

async function applyPortfolioPatch(uid: string, patch: Record<string, any>): Promise<void> {
  const ref = await resolveUserPortfolioRef(uid);
  await ref.set(
    { ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  // Mirror to public_portfolios
  await db.collection("public_portfolios").doc(ref.id).set(
    { ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

// ── B1. Read the whole portfolio ──────────────────────────────────────────────
export const readPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "GET") { res.status(405).json({ error: "Use GET." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    try {
      const { ref, data } = await getPortfolioDoc(authResult.uid);
      res.status(200).json({ path: ref.path, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B2. Add a project ─────────────────────────────────────────────────────────
/**
 * POST body:
 *   title         string   required
 *   description   string   required
 *   url?          string
 *   githubUrl?    string
 *   thumbnailUrl? string
 *   techUsed?     string[]
 *   id?           string   (auto-generated if omitted)
 */
export const addProjectToPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { title, description, url, githubUrl, thumbnailUrl, techUsed, id } = req.body || {};
    if (!title || !description) {
      res.status(400).json({ error: "Missing required fields: title and description." });
      return;
    }

    try {
      const { data } = await getPortfolioDoc(authResult.uid);
      const projects: any[] = Array.isArray(data.projects) ? data.projects : [];

      const newProject = {
        id: id || `proj_agent_${Date.now()}`,
        title,
        description,
        url: url || "",
        githubUrl: githubUrl || "",
        thumbnailUrl: thumbnailUrl || "",
        techUsed: Array.isArray(techUsed) ? techUsed : [],
      };

      projects.push(newProject);
      await applyPortfolioPatch(authResult.uid, { projects });

      res.status(201).json({
        success: true,
        message: `Project "${title}" added to portfolio.`,
        project: newProject,
        totalProjects: projects.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B3. Remove a project by ID ────────────────────────────────────────────────
export const removeProjectFromPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "DELETE") { res.status(405).json({ error: "Use DELETE." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { projectId } = req.body || {};
    if (!projectId) { res.status(400).json({ error: "Missing projectId." }); return; }

    try {
      const { data } = await getPortfolioDoc(authResult.uid);
      const projects: any[] = Array.isArray(data.projects) ? data.projects : [];
      const updated = projects.filter(p => p.id !== projectId);
      if (updated.length === projects.length) {
        res.status(404).json({ error: `Project with id "${projectId}" not found.` });
        return;
      }
      await applyPortfolioPatch(authResult.uid, { projects: updated });
      res.status(200).json({ success: true, message: `Project "${projectId}" removed.`, totalProjects: updated.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B4. Add a timeline (experience) entry ─────────────────────────────────────
/**
 * POST body:
 *   jobTitle    string  required
 *   employer    string  required
 *   startDate   string  "YYYY-MM" required
 *   endDate?    string  "YYYY-MM" | "Present"
 *   city?       string
 *   description string
 *   id?         string  (auto-generated if omitted)
 */
export const addExperienceToPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { jobTitle, employer, startDate, endDate, city, description, id } = req.body || {};
    if (!jobTitle || !employer || !startDate) {
      res.status(400).json({ error: "Missing required fields: jobTitle, employer, startDate." });
      return;
    }

    try {
      const { data } = await getPortfolioDoc(authResult.uid);
      const timeline: any[] = Array.isArray(data.timeline) ? data.timeline : [];

      const newEntry = {
        id: id || `tl_agent_${Date.now()}`,
        jobTitle,
        employer,
        city: city || "",
        startDate,
        endDate: endDate || "Present",
        description: description || "",
      };

      timeline.push(newEntry);
      await applyPortfolioPatch(authResult.uid, { timeline });

      res.status(201).json({
        success: true,
        message: `Experience "${jobTitle} at ${employer}" added to portfolio.`,
        entry: newEntry,
        totalEntries: timeline.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B5. Remove an experience entry by ID ──────────────────────────────────────
export const removeExperienceFromPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "DELETE") { res.status(405).json({ error: "Use DELETE." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { entryId } = req.body || {};
    if (!entryId) { res.status(400).json({ error: "Missing entryId." }); return; }

    try {
      const { data } = await getPortfolioDoc(authResult.uid);
      const timeline: any[] = Array.isArray(data.timeline) ? data.timeline : [];
      const updated = timeline.filter(t => t.id !== entryId);
      if (updated.length === timeline.length) {
        res.status(404).json({ error: `Timeline entry "${entryId}" not found.` });
        return;
      }
      await applyPortfolioPatch(authResult.uid, { timeline: updated });
      res.status(200).json({ success: true, message: `Experience "${entryId}" removed.`, totalEntries: updated.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B6. Patch any top-level section ──────────────────────────────────────────
/**
 * Supports hero · about · timeline · education · techStack · projects ·
 * socialLinks · contactEmail · sectionLabels
 *
 * PATCH body: { section: string, value: any }
 */
export const patchPortfolioSection = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "PATCH") { res.status(405).json({ error: "Use PATCH." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const ALLOWED_SECTIONS = [
      "hero", "about", "timeline", "education", "techStack",
      "projects", "socialLinks", "contactEmail", "sectionLabels",
    ];

    const { section, value } = req.body || {};
    if (!section || value === undefined) {
      res.status(400).json({ error: "Missing 'section' and 'value' in request body." });
      return;
    }
    if (!ALLOWED_SECTIONS.includes(section)) {
      res.status(400).json({ error: `Invalid section. Allowed: ${ALLOWED_SECTIONS.join(", ")}` });
      return;
    }

    try {
      await applyPortfolioPatch(authResult.uid, { [section]: value });
      res.status(200).json({ success: true, message: `Section "${section}" updated successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ── B7. Add a skill to techStack ─────────────────────────────────────────────
export const addSkillToPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { name, rating } = req.body || {};
    if (!name) { res.status(400).json({ error: "Missing required field: name." }); return; }

    try {
      const { data } = await getPortfolioDoc(authResult.uid);
      const techStack: any[] = Array.isArray(data.techStack) ? data.techStack : [];
      const duplicate = techStack.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        res.status(409).json({ error: `Skill "${name}" already exists.` });
        return;
      }
      const newSkill = { id: `ts_agent_${Date.now()}`, name, ...(rating !== undefined ? { rating } : {}) };
      techStack.push(newSkill);
      await applyPortfolioPatch(authResult.uid, { techStack });
      res.status(201).json({
        success: true,
        message: `Skill "${name}" added.`,
        skill: newSkill,
        totalSkills: techStack.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Preserved: Legacy Portfolio Functions + Firestore Trigger
// ─────────────────────────────────────────────────────────────────────────────

import { onDocumentUpdated } from "firebase-functions/v2/firestore";

export const initPortfolio = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed. Use POST." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const body = req.body || {};
    const title = body.title || "My Dev Portfolio";
    const templateId = body.templateId || "developer";

    const newPortfolio: any = {
      userId: authResult.uid,
      title,
      templateId,
      section: "portfolios",
      mode: "portfolio",
      hero: {
        headline: "Software Engineer",
        subheadline: "Building the future.",
        ctaPrimaryLabel: "View Resume",
        ctaPrimaryUrl: "/resume",
      },
      about: "I am a passionate software engineer.",
      projects: [],
      techStack: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const docRef = db.collection("users").doc(authResult.uid).collection("portfolios").doc();
      const batch = db.batch();
      batch.set(docRef, newPortfolio);
      batch.set(db.collection("public_portfolios").doc(docRef.id), newPortfolio);
      await batch.commit();
      res.status(201).json({
        success: true,
        portfolioId: docRef.id,
        url: `https://careervivid.app/portfolio/edit/${docRef.id}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

export const updatePortfolioProjects = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "PATCH") { res.status(405).json({ error: "Method Not Allowed. Use PATCH." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { portfolioId, projects, techStack } = req.body;
    if (!portfolioId || !projects || !Array.isArray(projects)) {
      res.status(400).json({ error: "Missing highly required portfolioId or projects array." });
      return;
    }

    try {
      const docRef = db.collection("users").doc(authResult.uid).collection("portfolios").doc(portfolioId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) { res.status(404).json({ error: "Portfolio not found." }); return; }

      const updates: any = {
        projects,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (techStack && Array.isArray(techStack)) {
        updates.techStack = admin.firestore.FieldValue.arrayUnion(...techStack);
      }

      const batch = db.batch();
      batch.set(docRef, updates, { merge: true });
      batch.set(db.collection("public_portfolios").doc(portfolioId), updates, { merge: true });
      await batch.commit();

      res.status(200).json({ success: true, message: "Projects updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

export const updatePortfolioHero = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "PATCH") { res.status(405).json({ error: "Method Not Allowed. Use PATCH." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { portfolioId, hero, theme, seoMetadata } = req.body;
    if (!portfolioId) { res.status(400).json({ error: "Missing portfolioId." }); return; }

    try {
      const docRef = db.collection("users").doc(authResult.uid).collection("portfolios").doc(portfolioId);
      const updates: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      if (hero) updates.hero = hero;
      if (theme) updates.theme = theme;
      if (seoMetadata) updates.seoMetadata = seoMetadata;

      const batch = db.batch();
      batch.set(docRef, updates, { merge: true });
      batch.set(db.collection("public_portfolios").doc(portfolioId), updates, { merge: true });
      await batch.commit();

      res.status(200).json({ success: true, message: "Hero and settings updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

export const uploadPortfolioAsset = onRequest({ region: "us-west1", memory: "512MiB" }, async (req, res) => {
  corsHandler(req as any, res as any, async () => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed. Use POST." }); return; }

    const authResult = await handleApiAuth(req, res);
    if (!authResult) return;

    const { image, path, mimeType } = req.body;
    if (!image || !path || !mimeType) {
      res.status(400).json({ error: "Missing image (base64), path, or mimeType." });
      return;
    }

    try {
      const bucket = admin.storage().bucket();
      const securePath = `users/${authResult.uid}/portfolio_assets/${path}`;
      const file = bucket.file(securePath);
      const buffer = Buffer.from(image, "base64");
      const token = uuidv4();

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(securePath)}?alt=media&token=${token}`;
      res.status(200).json({ success: true, downloadUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

export const onPortfolioProjectsUpdated = onDocumentUpdated(
  { document: "users/{userId}/portfolios/{portfolioId}", region: "us-west1", memory: "512MiB" },
  async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();
    if (!newData || !oldData) return;

    const newLen = Array.isArray(newData.projects) ? newData.projects.length : 0;
    const oldLen = Array.isArray(oldData.projects) ? oldData.projects.length : 0;
    if (newLen <= oldLen || newLen === 0) return;

    const latestProject = newData.projects[newData.projects.length - 1];

    let linkedinSummary = "";
    try {
      const { getAIClient } = await import("./utils/ai.js");
      const ai = getAIClient();
      const prompt = `Write a professional, engaging 2-paragraph LinkedIn post (with emojis and 3 hashtags) announcing this new developer side project:\nTitle: ${latestProject.title || "A new feature"}\nDescription: ${latestProject.description || "N/A"}\nTech Stack: ${(latestProject.techStack || []).join(", ")}`;
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      linkedinSummary = (result.text || "").trim();
    } catch (err) {
      console.error("LinkedIn gen failed", err);
    }

    if (linkedinSummary) {
      await event.data?.after.ref.update({ latestLinkedInPost: linkedinSummary });
    }

    const resumesSnap = await db
      .collection("users")
      .doc(event.params.userId)
      .collection("resumes")
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    if (!resumesSnap.empty) {
      const resumeRef = resumesSnap.docs[0].ref;
      const resumeData = resumesSnap.docs[0].data();
      const history = resumeData.employmentHistory || [];

      history.push({
        id: uuidv4(),
        jobTitle: "Creator / Developer",
        employer: `Project: ${latestProject.title || "Side Project"}`,
        city: "Remote",
        startDate: new Date().toISOString().substring(0, 7),
        endDate: "Present",
        description: latestProject.description || "Developed and shipped this project.",
      });

      await resumeRef.update({
        employmentHistory: history,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
