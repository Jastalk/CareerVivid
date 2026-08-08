export type EmailNotificationCategory =
  | "onboarding"
  | "activation"
  | "feature_spotlight"
  | "weekly_digest"
  | "lifecycle"
  | "milestone"
  | "transactional"
  | "billing"
  | "practice"
  | "marketing"
  | "advocacy"
  | "system";

export const CAREERVIVID_APP_URL = "https://careervivid.app";

export const CAREERVIVID_SYSTEM_NOTIFICATION_FOOTER =
  "You are receiving this system notification because you are a registered user of CareerVivid. You can easily modify your delivery frequency or opt-out of specific communication tracks at any time by updating your account settings directly at https://careervivid.app/profile.";

export type EmailDigestFrequency =
  | "daily"
  | "every_3_days"
  | "every_5_days"
  | "every_week"
  | "every_10_days"
  | "every_14_days";

const EMAIL_FREQUENCY_DAYS: Record<EmailDigestFrequency, number> = {
  daily: 1,
  every_3_days: 3,
  every_5_days: 5,
  every_week: 7,
  every_10_days: 10,
  every_14_days: 14,
};

const CATEGORY_ALIASES: Record<EmailNotificationCategory, string[]> = {
  onboarding: ["onboarding", "activation", "lifecycle", "marketing"],
  activation: ["activation", "onboarding", "lifecycle", "marketing"],
  feature_spotlight: ["feature_spotlight", "featureSpotlight", "features", "product_updates", "marketing"],
  weekly_digest: ["weekly_digest", "weeklyDigest", "digest", "retention", "lifecycle"],
  lifecycle: ["lifecycle", "activation", "onboarding", "retention"],
  milestone: ["milestone", "resume_performance", "resumePerformance", "score_update", "lifecycle"],
  transactional: ["transactional", "system"],
  billing: ["billing", "transactional", "system"],
  practice: ["practice", "scheduled_practice", "interview_practice"],
  marketing: ["marketing", "product_updates", "features"],
  advocacy: ["advocacy", "reviews", "feedback", "marketing"],
  system: ["system", "transactional"],
};

const REQUIRED_EMAIL_CATEGORIES = new Set<EmailNotificationCategory>([
  "transactional",
  "billing",
  "system",
]);

export function isRequiredEmailCategory(category: EmailNotificationCategory): boolean {
  return REQUIRED_EMAIL_CATEGORIES.has(category);
}

export function normalizeEmailDigestFrequency(frequency: unknown): EmailDigestFrequency {
  const normalized = String(frequency || "every_week")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as EmailDigestFrequency | "weekly" | "every_day" | "day" | "week";

  if (normalized === "daily" || normalized === "every_day" || normalized === "day") return "daily";
  if (normalized === "weekly" || normalized === "week") return "every_week";
  if (normalized in EMAIL_FREQUENCY_DAYS) return normalized as EmailDigestFrequency;

  return "every_week";
}

const hasDisabledAlias = (values: unknown, aliases: string[]): boolean => {
  if (!Array.isArray(values)) return false;
  const normalized = values.map((value) => String(value).trim().toLowerCase().replace(/[\s-]+/g, "_"));
  return aliases.some((alias) => normalized.includes(String(alias).trim().toLowerCase().replace(/[\s-]+/g, "_")));
};

const readBoolean = (source: unknown, aliases: string[]): boolean | null => {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;

  for (const alias of aliases) {
    if (typeof record[alias] === "boolean") {
      return record[alias] as boolean;
    }
  }

  return null;
};

const timestampToMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  const maybeTimestamp = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof maybeTimestamp.toMillis === "function") return maybeTimestamp.toMillis();
  if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().getTime();
  return 0;
};

export function getEmailFrequencyDays(frequency: unknown): number {
  const normalized = normalizeEmailDigestFrequency(frequency);
  return EMAIL_FREQUENCY_DAYS[normalized] || EMAIL_FREQUENCY_DAYS.every_week;
}

export function isEmailFrequencyDue(
  preferences: Record<string, unknown> | undefined,
  nowMs = Date.now()
): boolean {
  const lastSentAt = timestampToMillis(preferences?.lastSentAt);
  if (!lastSentAt) return true;
  const cadenceMs = getEmailFrequencyDays(preferences?.frequency) * 24 * 60 * 60 * 1000;
  return nowMs - lastSentAt >= cadenceMs;
}

export function getEmailFrequencySuppressionReason(
  preferences: Record<string, unknown> | undefined,
  nowMs = Date.now()
): string | null {
  return isEmailFrequencyDue(preferences, nowMs) ? null : "frequency_not_due";
}

export function getEmailPreferenceSuppressionReason(
  userData: Record<string, unknown> | undefined,
  category: EmailNotificationCategory,
  key?: string
): string | null {
  if (!userData) return "missing_user_profile";

  if (isRequiredEmailCategory(category)) {
    return null;
  }

  const aliases = Array.from(new Set([category, key || "", ...CATEGORY_ALIASES[category]].filter(Boolean)));
  const lifecycleEmails = userData.lifecycleEmails as Record<string, unknown> | undefined;
  if (lifecycleEmails?.unsubscribed === true || lifecycleEmails?.unsubscribedAt) {
    return "lifecycle_unsubscribed";
  }

  const preferences = (userData.emailPreferences || {}) as Record<string, unknown>;
  if (preferences.unsubscribed === true || preferences.disabled === true) {
    return "email_preferences_unsubscribed";
  }

  if (preferences.enabled === false) {
    return "optional_email_disabled";
  }

  if (hasDisabledAlias(preferences.disabledCategories, aliases)) {
    return "category_disabled";
  }

  if (hasDisabledAlias(preferences.disabledTracks, aliases)) {
    return "track_disabled";
  }

  const directPreference = readBoolean(preferences, aliases);
  if (directPreference === false) return "category_preference_disabled";

  const categoryPreference = readBoolean(preferences.categories, aliases);
  if (categoryPreference === false) return "category_preference_disabled";

  const trackPreference = readBoolean(preferences.tracks, aliases);
  if (trackPreference === false) return "track_preference_disabled";

  const lifecyclePreference = readBoolean(preferences.lifecycleCategories, aliases);
  if (lifecyclePreference === false) return "lifecycle_category_disabled";

  return null;
}

export function canonicalCareerVividUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const raw = String(path || "/").trim();
  let pathOnly = raw;

  if (/^https?:\/\//i.test(raw)) {
    const parsed = new URL(raw);
    pathOnly = parsed.hash.startsWith("#/") ? parsed.hash.slice(1) : parsed.pathname;
    for (const [key, value] of parsed.searchParams.entries()) {
      if (params?.[key] === undefined) {
        params = { ...(params || {}), [key]: value };
      }
    }
  }

  if (pathOnly.startsWith("/#/")) {
    pathOnly = pathOnly.slice(2);
  } else if (pathOnly.startsWith("#/")) {
    pathOnly = pathOnly.slice(1);
  }

  const normalizedPath = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const url = new URL(`${CAREERVIVID_APP_URL}${normalizedPath}`);

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function canonicalInterviewStudioUrl(jobId: string, source?: string): string {
  return canonicalCareerVividUrl(
    `/interview-studio/${encodeURIComponent(jobId)}`,
    source ? { source } : undefined
  );
}

export function canonicalSignupUrl(source = "lifecycle_email"): string {
  return canonicalCareerVividUrl("/signup", { source });
}

export function canonicalDashboardUrl(source = "lifecycle_email"): string {
  return canonicalCareerVividUrl("/dashboard", { source });
}

export function canonicalProfileUrl(source = "lifecycle_email"): string {
  return canonicalCareerVividUrl("/profile", { source });
}

export function canonicalResumeEditUrl(resumeId: string | undefined, source = "lifecycle_email"): string {
  if (!resumeId) return canonicalDashboardUrl(source);
  return canonicalCareerVividUrl(`/edit/${encodeURIComponent(resumeId)}`, { source });
}
