import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import cors from "cors";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const DEFAULT_PUBLIC_RESUME_ID = "9JHMyYQbNZPvFAANsb5e";

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:5173",
  "https://jiawenzhu.github.io",
]);

const corsHandler = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CareerVivid public resume API CORS policy.`));
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 86400,
});

interface PublicResumeExperience {
  company: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  bullets: string[];
}

interface PublicResumeEducation {
  school: string;
  degree: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

interface PublicResumeSkill {
  name: string;
  level: string | null;
}

interface PublicResumeResponse {
  schemaVersion: "1.0";
  id: string;
  userId: string;
  title: string;
  updatedAt: string | null;
  profile: {
    name: string;
    headline: string | null;
    location: string | null;
    summary: string | null;
    websites: Array<{
      label: string;
      url: string;
    }>;
  };
  experience: PublicResumeExperience[];
  skills: PublicResumeSkill[];
  education: PublicResumeEducation[];
}

const isPubliclySharedResume = (data: admin.firestore.DocumentData | undefined): boolean => {
  return Boolean(data?.shareConfig?.enabled);
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const toIsoString = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
};

const htmlToText = (value: unknown): string => {
  if (typeof value !== "string") return "";

  const normalized = value
    // 1. Replace structural HTML tags with whitespace equivalents
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  // 2. Strip all remaining HTML tags BEFORE decoding entities.
  //    Apply repeatedly until stable to avoid incomplete multi-character sanitization.
  let stripped = normalized;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(/<[^>]+>/g, "");
  } while (stripped !== previous);

  // 3. Decode safe whitespace / symbol entities only (no angle brackets)
  return stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
};

const descriptionToBullets = (description: unknown): string[] => {
  const text = htmlToText(description);
  if (!text) return [];

  return text
    .split(/\n|(?:\s*[\u2022*-]\s+)/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);
};

const getPathSegments = (req: functions.Request): string[] => {
  const rawPath = req.path || req.originalUrl.split("?")[0] || "";
  const marker = "/api/public/resume";
  const routePath = rawPath.includes(marker) ? rawPath.slice(rawPath.indexOf(marker) + marker.length) : rawPath;

  return routePath
    .split("/")
    .map((segment) => decodeURIComponent(segment.trim()))
    .filter(Boolean);
};

const buildPublicResumeResponse = (
  userId: string,
  resumeId: string,
  data: admin.firestore.DocumentData,
): PublicResumeResponse => {
  const personal = data.personalDetails || {};
  const firstName = normalizeString(personal.firstName) || "";
  const lastName = normalizeString(personal.lastName) || "";
  const city = normalizeString(personal.city);
  const country = normalizeString(personal.country);
  const location = [city, country].filter(Boolean).join(", ") || null;

  return {
    schemaVersion: "1.0",
    id: resumeId,
    userId,
    title: normalizeString(data.title) || "Untitled Resume",
    updatedAt: toIsoString(data.updatedAt),
    profile: {
      name: [firstName, lastName].filter(Boolean).join(" ") || "CareerVivid User",
      headline: normalizeString(personal.jobTitle),
      location,
      summary: normalizeString(htmlToText(data.professionalSummary)),
      websites: Array.isArray(data.websites)
        ? data.websites
          .map((site: any) => ({
            label: normalizeString(site?.label) || normalizeString(site?.url) || "Website",
            url: normalizeString(site?.url) || "",
          }))
          .filter((site: { url: string }) => site.url)
        : [],
    },
    experience: Array.isArray(data.employmentHistory)
      ? data.employmentHistory.map((job: any) => ({
        company: normalizeString(job?.employer) || "",
        title: normalizeString(job?.jobTitle) || "",
        location: normalizeString(job?.city),
        startDate: normalizeString(job?.startDate),
        endDate: normalizeString(job?.endDate) || "Present",
        bullets: descriptionToBullets(job?.description),
      }))
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills
        .map((skill: any) => ({
          name: normalizeString(skill?.name ?? skill) || "",
          level: normalizeString(skill?.level),
        }))
        .filter((skill: PublicResumeSkill) => skill.name)
      : [],
    education: Array.isArray(data.education)
      ? data.education.map((edu: any) => ({
        school: normalizeString(edu?.school) || "",
        degree: normalizeString(edu?.degree) || "",
        location: normalizeString(edu?.city),
        startDate: normalizeString(edu?.startDate),
        endDate: normalizeString(edu?.endDate),
        description: normalizeString(htmlToText(edu?.description)),
      }))
      : [],
  };
};

const fetchResume = async (userId: string, resumeId?: string) => {
  if (resumeId) {
    const doc = await db.collection("users").doc(userId).collection("resumes").doc(resumeId).get();
    return doc.exists ? { userId, doc } : null;
  }

  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();

  return snapshot.empty ? null : { userId, doc: snapshot.docs[0] };
};

const fetchResumeById = async (resumeId: string) => {
  const usersSnapshot = await db.collection("users").select().limit(500).get();

  for (const userDoc of usersSnapshot.docs) {
    const doc = await userDoc.ref.collection("resumes").doc(resumeId).get();
    if (doc.exists) {
      return { userId: userDoc.id, doc };
    }
  }

  return null;
};

export const publicResumeApi = functions
  .region("us-west1")
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      if (req.method !== "GET") {
        res.set("Allow", "GET, OPTIONS");
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      const [firstPathSegment, secondPathSegment] = getPathSegments(req);
      const queryUserId = normalizeString(req.query.userId);
      const queryResumeId = normalizeString(req.query.resumeId);
      const userId = queryUserId || (secondPathSegment ? firstPathSegment : undefined);
      const resumeId = queryResumeId || secondPathSegment || firstPathSegment || DEFAULT_PUBLIC_RESUME_ID;

      if (!resumeId && !userId) {
        res.status(400).json({
          error: "Missing resumeId or userId",
          usage: "GET /api/public/resume/:resumeId, /api/public/resume/:userId, or /api/public/resume/:userId/:resumeId",
        });
        return;
      }

      try {
        let result: Awaited<ReturnType<typeof fetchResume>> | Awaited<ReturnType<typeof fetchResumeById>>;

        if (userId) {
          result = await fetchResume(userId, secondPathSegment || queryResumeId || undefined);
        } else if (resumeId) {
          result = await fetchResumeById(resumeId);
        } else {
          result = null;
        }

        if (!result) {
          res.status(404).json({ error: "Resume not found" });
          return;
        }

        const { doc: resumeDoc } = result;
        const data = resumeDoc.data();
        if (!data) {
          res.status(404).json({ error: "Resume not found" });
          return;
        }

        if (!isPubliclySharedResume(data)) {
          res.status(403).json({ error: "Resume is not shared publicly." });
          return;
        }

        res.set("Cache-Control", "public, max-age=60, s-maxage=300");
        res.status(200).json(buildPublicResumeResponse(result.userId, resumeDoc.id, data));
      } catch (error: any) {
        console.error("[publicResumeApi] Failed to fetch public resume:", error);
        res.status(500).json({ error: "Failed to fetch public resume" });
      }
    });
  });
