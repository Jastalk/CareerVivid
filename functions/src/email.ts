import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import {
    escapeHtml,
    generateSupportTriage,
    renderSupportTriageHtml,
    renderSupportTriageText,
} from "./customerSupport";

const smtpEmail = defineSecret("SMTP_EMAIL");
const smtpPassword = defineSecret("SMTP_PASSWORD");
const SUPPORT_RECIPIENTS = "support@careervivid.app, evan@careervivid.app";
const CONTACT_FORM_BCC = "zhujiawen519@gmail.com";

// Initialize Transporter
const getTransporter = () => {
    const user = smtpEmail.value().trim();
    const pass = smtpPassword.value().replace(/\s+/g, '');

    console.log(`Initializing transporter with user: '${user}' (length: ${user.length})`);

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: user,
            pass: pass,
        },
    });
};

interface EmailRequest {
    to: string | string[];
    message: {
        subject: string;
        text?: string;
        html?: string;
    };
}

interface ContactMessageInput {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
}

interface ContactMessageData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

const cleanContactString = (value: unknown, maxLength: number) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeContactMessage = (input: ContactMessageInput): ContactMessageData => ({
    name: cleanContactString(input.name, 160),
    email: cleanContactString(input.email, 254),
    subject: cleanContactString(input.subject, 240),
    message: cleanContactString(input.message, 8000),
});

const validateContactMessage = (data: ContactMessageData) => {
    if (!data.name || !data.email || !data.subject || !data.message) {
        throw new functions.https.HttpsError("invalid-argument", "Please fill in all fields.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new functions.https.HttpsError("invalid-argument", "Please enter a valid email address.");
    }
};

const sendContactNotification = async (messageId: string, data: ContactMessageData) => {
    const subject = data.subject ? `[Contact Form] ${data.subject}` : `[Contact Form] New Message from ${data.name || data.email}`;
    const triage = await generateSupportTriage({
        source: "contact_form",
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
    });

    // Internal notification for support. BCC gives us a separate delivery path if
    // Google Workspace alias/group routing hides messages from the support inbox.
    const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 4px solid black; background-color: #f0f0f0;">
            <h2 style="background-color: black; color: white; padding: 10px; display: inline-block;">New Contact Message</h2>
            <div style="margin-top: 20px; background-color: white; border: 2px solid black; padding: 20px; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);">
                <p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
                <p><strong>Subject:</strong> ${escapeHtml(data.subject || "No Subject")}</p>
                <hr style="border-top: 2px solid #ddd;"/>
                <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
            </div>
            ${renderSupportTriageHtml(triage)}
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Sent from CareerVivid Contact Form • ID: ${escapeHtml(messageId)}</p>
        </div>
    `;

    const mailOptions = {
        from: `"CareerVivid Contact" <${smtpEmail.value()}>`,
        to: SUPPORT_RECIPIENTS,
        bcc: CONTACT_FORM_BCC,
        replyTo: data.email,
        subject,
        text: `Name: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\nMessage:\n${data.message}\n\n${renderSupportTriageText(triage)}`,
        html: htmlContent,
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    return {
        triage,
        messageId: info.messageId,
        accepted: Array.isArray(info.accepted) ? info.accepted : [],
        rejected: Array.isArray(info.rejected) ? info.rejected : [],
        recipients: [SUPPORT_RECIPIENTS, CONTACT_FORM_BCC],
    };
};

/**
 * Public contact form entry point.
 * Unlike the Firestore-only form path, this returns success only after SMTP accepts the notification.
 */
export const submitContactMessage = functions
    .region("us-west1")
    .runWith({
        secrets: [smtpEmail, smtpPassword],
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .https.onCall(async (input: ContactMessageInput) => {
        const data = normalizeContactMessage(input);
        validateContactMessage(data);

        const docRef = admin.firestore().collection("contact_messages").doc();
        await docRef.set({
            ...data,
            status: "sending",
            deliveryMode: "callable",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        try {
            const delivery = await sendContactNotification(docRef.id, data);

            await docRef.update({
                status: "forwarded",
                aiSupport: delivery.triage,
                aiSupportGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                supportStatus: delivery.triage.needsHumanReview ? "needs_review" : "triaged",
                emailMessageId: delivery.messageId,
                emailAccepted: delivery.accepted,
                emailRejected: delivery.rejected,
                emailRecipients: delivery.recipients,
                emailForwardedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                ok: true,
                messageId: docRef.id,
                emailMessageId: delivery.messageId,
            };
        } catch (error: any) {
            console.error(`Failed to submit contact message ${docRef.id}:`, error);
            await docRef.update({
                status: "error",
                error: error.message || "Unknown email delivery error",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            throw new functions.https.HttpsError("internal", "We could not send your message. Please email support@careervivid.app directly.");
        }
    });

/**
 * Triggered when a document is created in the 'mail' collection.
 * Sends an email using Nodemailer and updates the document with the result.
 */
export const onEmailRequestCreated = functions
    .region("us-west1")
    .runWith({
        secrets: [smtpEmail, smtpPassword],
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .firestore.document("mail/{mailId}")
    .onCreate(async (snapshot, context) => {
        const mailId = context.params.mailId;
        const data = snapshot.data() as EmailRequest;

        if (!data.to || !data.message) {
            console.error(`Invalid email request ${mailId}: Missing 'to' or 'message' fields.`);
            await snapshot.ref.update({
                delivery: {
                    state: "ERROR",
                    error: "Missing 'to' or 'message' fields.",
                    endTime: admin.firestore.FieldValue.serverTimestamp(),
                },
            });
            return;
        }

        const mailOptions = {
            from: `"CareerVivid Support" <${smtpEmail.value()}>`,
            to: data.to,
            subject: data.message.subject,
            text: data.message.text,
            html: data.message.html,
        };

        try {
            const transporter = getTransporter();
            const info = await transporter.sendMail(mailOptions);

            console.log(`Email sent for request ${mailId}: ${info.messageId}`);

            await snapshot.ref.update({
                delivery: {
                    state: "SUCCESS",
                    messageId: info.messageId,
                    endTime: admin.firestore.FieldValue.serverTimestamp(),
                },
            });
        } catch (error: any) {
            console.error(`Failed to send email for request ${mailId}:`, error);

            await snapshot.ref.update({
                delivery: {
                    state: "ERROR",
                    error: error.message || "Unknown error",
                    endTime: admin.firestore.FieldValue.serverTimestamp(),
                },
            });
        }
    });

/**
 * Triggered when a document is created in the 'contact_messages' collection.
 * Converts the contact message into an email to support.
 */
export const onContactMessageCreated = functions
    .region("us-west1")
    .runWith({
        secrets: [smtpEmail, smtpPassword],
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .firestore.document("contact_messages/{messageId}")
    .onCreate(async (snapshot, context) => {
        const messageId = context.params.messageId;
        const data = snapshot.data();

        if (data?.deliveryMode === "callable") {
            console.log(`Skipping contact trigger for callable-submitted message ${messageId}.`);
            return;
        }

        if (!data || !data.email || !data.message) {
            console.error(`Invalid contact message ${messageId}: Missing fields.`);
            return;
        }

        try {
            const delivery = await sendContactNotification(messageId, normalizeContactMessage(data));

            console.log(`Contact email sent for ${messageId}: ${delivery.messageId}`);

            // Mark as forwarded
            await snapshot.ref.update({
                status: 'forwarded',
                aiSupport: delivery.triage,
                aiSupportGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                supportStatus: delivery.triage.needsHumanReview ? "needs_review" : "triaged",
                emailMessageId: delivery.messageId,
                emailAccepted: delivery.accepted,
                emailRejected: delivery.rejected,
                emailRecipients: delivery.recipients,
                emailForwardedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error: any) {
            console.error(`Failed to forward contact email ${messageId}:`, error);
            await snapshot.ref.update({
                status: 'error',
                error: error.message || "Unknown error"
            });
        }
    });
