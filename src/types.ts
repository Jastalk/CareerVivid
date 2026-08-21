export * from './types/whiteboard';

export interface PersonalDetails {
  jobTitle: string;
  photo: string; // URL to image in Firebase Storage
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface WebsiteLink {
  id: string;
  label: string;
  url: string;
  icon?: string; // Optional custom icon ID from AVAILABLE_ICONS
  showUrl?: boolean; // Toggle to show full URL on resume
  platform?: string; // Optional platform identifier (e.g. 'tiktok', 'linkedin')
}

export interface Skill {
  id: string;
  name: string;
  level: 'Novice' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface Language {
  id: string;
  name: string;
  level: string;
}

export interface EmploymentHistory {
  id: string;
  jobTitle: string;
  employer: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
}

export type SharePermission = 'viewer' | 'commenter' | 'editor';

export interface ShareConfig {
  enabled: boolean;
  permission: SharePermission;
  shareId?: string; // Optional unique token if we want to obfuscate IDs later
  readyForRecruiters?: boolean;
  readyAt?: string | null;
}

export interface SectionTitles {
  contact?: string;
  profile?: string;
  skills?: string;
  experience?: string;
  education?: string;
  languages?: string;
  websites?: string;
}

export interface CustomIcons {
  email?: string;
  phone?: string;
  location?: string;
}

// Advanced Formatting Settings for fine-tuning resume layout
export interface FormattingSettings {
  bodyScale: number;      // Font scale multiplier (0.85 - 1.2)
  lineHeight: number;     // Line-height value (1.0 - 2.0)
  sectionGap: number;     // Gap between sections in rem (0.5 - 3)
  paragraphGap: number;   // Gap between paragraphs in rem (0 - 1)
  pageMargin: number;     // Page padding in rem (1 - 4)
}

export const DEFAULT_FORMATTING_SETTINGS: FormattingSettings = {
  bodyScale: 1,
  lineHeight: 1.4,
  sectionGap: 1.5,
  paragraphGap: 0.5,
  pageMargin: 2,
};

export interface ResumeData {
  id: string;
  title: string;
  updatedAt: string;
  templateId: TemplateId;
  personalDetails: PersonalDetails;
  professionalSummary: string;
  websites: WebsiteLink[];
  skills: Skill[];
  employmentHistory: EmploymentHistory[];
  education: Education[];
  languages: Language[];
  themeColor: string;
  titleFont: string;
  bodyFont: string;
  language: string;
  section?: string;
  sectionTitles?: SectionTitles; // Custom section headers
  customIcons?: CustomIcons; // New field for custom icons
  shareConfig?: ShareConfig; // New field for sharing settings
  formattingSettings?: FormattingSettings; // Advanced formatting controls
  customCss?: string; // AI Code Customizer: scoped CSS overrides for resume preview
  isDefault?: boolean;
}

export type TemplateId = string;

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  availableColors: string[];
}

export interface TemplateProps {
  resume: ResumeData;
  themeColor: string;
  titleFont: string;
  bodyFont: string;
  onUpdate?: (data: Partial<ResumeData>) => void;
  onFocus?: (fieldId: string) => void;
}

// --- NEW ---
export interface EmailPreferences {
  enabled: boolean;
  frequency: 'daily' | 'every_3_days' | 'every_5_days' | 'every_week' | 'every_10_days' | 'every_14_days';
  topicSource: 'smart' | 'manual';
  manualTopic: string;
  lastSentAt?: any; // Firestore Timestamp
  /** Set when the user turns email on themselves; ends the first-week window. */
  optInAt?: any;
  disabled?: boolean;
  unsubscribed?: boolean;
  disabledCategories?: string[];
  disabledTracks?: string[];
  categories?: Partial<Record<
    | 'onboarding'
    | 'activation'
    | 'feature_spotlight'
    | 'weekly_digest'
    | 'lifecycle'
    | 'milestone'
    | 'transactional'
    | 'billing'
    | 'practice'
    | 'marketing'
    | 'advocacy'
    | 'system',
    boolean
  >>;
  tracks?: Record<string, boolean>;
  lifecycleCategories?: Record<string, boolean>;
}

export type SidebarNodeType = 'system' | 'custom-folder' | 'custom-file' | 'resume' | 'portfolio' | 'whiteboard' | 'post' | 'sop' | 'project' | 'interview';

export interface SidebarNode {
  id: string;           // Unique identifier (e.g., path or UUID)
  parent: string | 0;   // 0 indicates root level, otherwise references parent id
  text: string;         // The display title
  droppable?: boolean;   // Whether this node can accept children
  data: {
    isSystemNode: boolean;
    type: SidebarNodeType;
    isHidden: boolean;
    icon?: string;
    isCreationLink?: boolean;
    timestamp?: number;
    createdAt?: number;
    updatedAt?: number;
  };
}

// --- Admin & User Management Types ---
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string; // Added for admin display
  displayNameSource?: 'email' | 'manual' | 'google';
  createdAt: any; // Firestore timestamp
  status: 'active' | 'suspended';
  // Stripe-related fields
  stripeCustomerId?: string; // Renamed from stripeId for clarity
  stripeSubscriptionId?: string; // Added for subscription tracking
  stripeSubscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'active_canceling' | null;
  source?: string;
  // Plan and limits
  plan?: 'free' | 'pro' | 'max' | 'pro_max' | 'enterprise' | 'pro_monthly' | 'pro_sprint' | 'premium';
  resumeLimit?: number; // 1 (free), 9999 (unlimited for paid)
  downloadCredits?: number; // One-time PDF export credits for free users
  expiresAt?: any; // Firestore Timestamp - for sprint plan
  promotions: {
    isPremium?: boolean;
    tokenCredits?: number;
  };
  emailPreferences?: EmailPreferences;
  updatedAt?: any; // Added for tracking when plan changes
  sidebarNodes?: SidebarNode[]; // Flat array representing the nested tree structure

  // Team & Enterprise Fields
  teamWorkspaceId?: string; // ID of the enterprise team
  seats?: number;           // Number of seats for Enterprise tier
  adminUid?: string;        // UID of the team admin

  // Partner Fields
  role?: 'user' | 'admin' | 'academic_partner' | 'business_partner' | 'agency_partner'; // Deprecated - kept for backward compatibility
  roles?: ('admin' | 'academic_partner' | 'business_partner' | 'agency_partner')[]; // New: Users can have multiple roles
  referralCode?: string; // For partners: their unique code OR for premium users: their personal referral code
  referredBy?: string; // For students: code they used
  referredByUid?: string; // UID of user who referred this user
  academicPartnerId?: string; // For students: ID of their professor
  referralStats?: {
    totalReferred: number;      // Count of successful referrals
    maxReferrals: number;        // Maximum allowed (15 for premium users)
    referredUsers: string[];     // UIDs of referred users
  };

  // AI Usage Tracking
  aiUsage?: {
    count: number;        // Current month's usage (aggregated sum)
    lastResetDate: any;   // Firestore Timestamp - when counter was last reset
    monthlyLimit: number; // 100 (free), 1000 (pro), 4500 (max), or pooled limit
  };
}

export type TrackEventType =
  | 'sign_in' | 'sign_out'
  | 'ai_assistant_query' | 'image_generation' | 'image_generation_prompt' | 'diagram_generation'
  | 'interview_start' | 'interview_analysis'
  | 'resume_suggestion' | 'question_generation'
  | 'resume_parse_text' | 'resume_parse_file' | 'resume_generate_prompt'
  | 'resume_created'
  | 'resume_download'
  | 'cover_letter_export'
  | 'checkout_session_start'
  | 'job_prep_generation'
  | 'job_prep_regeneration'
  | 'job_parse_description'
  | 'resume_match_analysis'
  | 'resume_review_completed'
  | 'first_job_saved'
  | 'shared_resume_viewed'
  | 'portfolio_generation'
  | 'portfolio_refinement'
  | 'lifecycle_email_queued';


// --- Interview Studio Types ---

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

export type InterviewStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error' | 'analyzing';

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  isFinal: boolean;
  timestamp?: number;
}

export interface QuestCodingArtifact {
  type: 'coding';
  challengeId: string;
  language: 'javascript' | 'python' | 'cpp' | 'java' | 'csharp';
  code: string;
  codeByLanguage?: Partial<Record<'javascript' | 'python' | 'cpp' | 'java' | 'csharp', string>>;
}

export interface QuestCodingDraft {
  challengeId: string;
  language: 'javascript' | 'python' | 'cpp' | 'java' | 'csharp';
  code: string;
  codeByLanguage?: Partial<Record<'javascript' | 'python' | 'cpp' | 'java' | 'csharp', string>>;
  updatedAt: number;
}

export interface QuestSystemDesignArtifact {
  type: 'system_design';
  challengeId: string;
  /**
   * Firestore cannot persist deeply nested arrays inside arrayUnion payloads.
   * Store whiteboard scene data as JSON strings for new reports, while keeping
   * the array fields optional so older local/report records can still reopen.
   */
  elementsJson?: string;
  filesJson?: string;
  elements?: any[];
  files?: Record<string, any>;
}

export interface QuestSystemDesignDraft extends QuestSystemDesignArtifact {
  /** Allows the newest local or cloud draft to win without overwriting a submitted artifact. */
  updatedAt: number;
}

export type QuestPracticeArtifact = QuestCodingArtifact | QuestSystemDesignArtifact;

export interface InterviewAnalysis {
  id: string;
  timestamp: number;
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  relevanceScore: number;
  // New v2 scoring dimensions
  problemSolvingScore?: number;
  experienceScore?: number;
  roleAlignmentScore?: number;
  leadershipScore?: number | null;
  strengths: string;
  areasForImprovement: string;
  transcript: TranscriptEntry[];
  questArtifact?: QuestPracticeArtifact;
}

export interface InterviewSessionDraft {
  status: 'in_progress' | 'ended_without_feedback';
  transcript: TranscriptEntry[];
  questions: string[];
  questionIndex: number;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
}

export interface PracticeHistoryEntry {
  id: string;
  job: Job;
  questions: string[];
  timestamp: any; // Can be a number or a Firestore Timestamp
  interviewHistory: InterviewAnalysis[];
  section?: string;
  transcript?: TranscriptEntry[];
  activeInterviewDraft?: InterviewSessionDraft | null;
  /** Coding work is keyed by challenge so changing problems never replaces another draft. */
  activeCodingDrafts?: Record<string, QuestCodingDraft>;
  /** Whiteboard work is also keyed by challenge so every prompt keeps its own canvas. */
  activeSystemDesignDrafts?: Record<string, QuestSystemDesignDraft>;
}

// --- Job Tracker Types ---
export type ApplicationStatus = 'To Apply' | 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';
export type WorkModel = 'On-site' | 'Hybrid' | 'Remote';
export type JobPriority = 'Low' | 'Medium' | 'High';

export const APPLICATION_STATUSES: ApplicationStatus[] = ['To Apply', 'Applied', 'Interviewing', 'Offered', 'Rejected'];
export const WORK_MODELS: WorkModel[] = ['On-site', 'Hybrid', 'Remote'];
export const JOB_PRIORITIES: JobPriority[] = ['Low', 'Medium', 'High'];
export const NO_NEXT_ACTION = 'No action';
export const NEXT_ACTION_OPTIONS = [
  NO_NEXT_ACTION,
  'Review job fit',
  'Tailor resume',
  'Generate cover letter',
  'Submit application',
  'Mark as applied',
  'Find recruiter/contact',
  'Draft outreach message',
  'Send LinkedIn message',
  'Send email',
  'Ask for referral',
  'Follow up',
  'Check application status',
  'Prepare interview',
  'Send thank-you note',
  'Review offer',
  'Negotiate offer',
  'Archive or skip',
] as const;

// --- Career-Ops AI Types ---

/** Structured result from the A-F block career-ops evaluation */
export interface AIJobEvaluation {
  score: number;                  // Weighted 1.0–5.0
  archetype: string;              // e.g. "AI Platform / LLMOps", "Solutions Architect"
  blocksA_F: {
    roleOverview: string;         // Block A: what this role actually is
    cvMatch: string;              // Block B: gaps + proof points vs CV
    levelStrategy: string;        // Block C: seniority positioning advice
    compResearch: string;         // Block D: market comp data
    personalizationPlan: string;  // Block E: top 5 CV tweaks
    interviewPrep: string;        // Block F: STAR stories mapped to JD
  };
  atsKeywords: string[];          // 15-20 keywords extracted from JD
  recommendApply: boolean;        // true if score >= 4.0
  evaluatedAt: any;               // Firestore Timestamp
}

/** User's master career profile — feeds the AI evaluation engine */
export interface PortalConfig {
  trackedCompanies: Array<{
    name: string;
    careersUrl: string;
    enabled: boolean;
  }>;
  titleFilters: {
    positive: string[];           // Must contain one of these
    negative: string[];           // Exclude if contains these
    seniorityBoost: string[];     // Boost score if title contains these
  };
}

export interface CareerProfile {
  uid: string;
  cvMarkdown: string;             // Master CV as markdown (career-ops cv.md equivalent)
  articleDigest?: string;         // Proof points / articles / projects
  targetArchetypes: string[];     // e.g. ["AI Platform / LLMOps", "Solutions Architect"]
  targetSalaryMin?: number;
  targetSalaryMax?: number;
  targetLocations?: string[];
  portalConfig?: PortalConfig;
  updatedAt: any;                 // Firestore Timestamp
}

/** A single STAR+R interview story that grows over time */
export interface STARStory {
  id: string;
  uid: string;
  title: string;                  // Short descriptor, e.g. "Led migration to microservices"
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;             // The "+R" — what you learned / how you'd do it differently
  tags: string[];                 // Competencies: "leadership", "technical", "cross-functional"
  usedForJobs: string[];          // jobTracker IDs where this story was applied
  createdAt: any;
  updatedAt?: any;
}

/** Validation state of an external apply link (mirrors functions/src/scrapedJobs.ts). */
export type JobLinkValidationStatus = 'valid' | 'stale' | 'expired' | 'blocked' | 'unknown';

export interface JobApplicationData {
  id: string; // Firestore doc ID
  userId: string;

  // External apply-link validation (set when the job came from the verified feed)
  externalLinkValidationStatus?: JobLinkValidationStatus;
  externalLinkValidationReason?: string;
  externalLinkValidatedAt?: number | null;

  // Core Job Info
  jobTitle: string;
  companyName: string;
  jobPostingId?: string; // Link to original job posting for sync
  location?: string;
  jobPostURL: string;
  applicationURL?: string;
  jobDescription?: string;

  // Tracking Info
  applicationStatus: ApplicationStatus;
  workModel?: WorkModel;
  interviewStage?: string;
  dateApplied?: any; // Firestore Timestamp
  salaryRange?: string;
  priority?: JobPriority;
  nextAction?: string;
  nextActionDueDate?: any;
  contactName?: string;
  contactUrl?: string;
  contactChannel?: string;
  resumeId?: string;
  resumeTitle?: string;

  // Prep Notes
  prep_RoleOverview?: string;
  prep_MyStory?: string;
  prep_InterviewPrep?: string;
  prep_QuestionsForInterviewer?: string;
  notes?: string;
  matchAnalyses?: Record<string, ResumeMatchAnalysis>; // Persist analysis results per resume

  // --- Career-Ops AI Fields (all optional — added progressively) ---
  aiEvaluation?: AIJobEvaluation;             // Full A-F evaluation result
  tailoredResumeUrl?: string;                 // Firebase Storage URL of tailored PDF
  linkedInOutreach?: string;                  // Generated LinkedIn connection message (≤300 chars)
  deepResearchPrompt?: string;                // Generated Perplexity/research prompt
  applicationAnswers?: Record<string, string>; // form field → AI-generated answer
  portalSource?: string;                      // Which portal scanner discovered this job
  lastScannedAt?: any;                        // When portal scanner last touched this

  // Timestamps
  createdAt: any;
  updatedAt: any;

  // Dashboard organization
  section?: string;
}

export interface GranularMatchCategory {
  score: number;       // 0 - 100
  rating: string;      // "Great", "Good", "Missing", "Fair"
  impact: string;      // "High Impact", "Medium Impact", "Low Impact"
  details: string[];   // Specific list of matching suggestions/bullet points
}

export interface ResumeMatchAnalysis {
  totalKeywords: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchPercentage: number;
  summary: string;
  verdict?: string;         // Overall AI text summary
  verdictCategory?: string; // "Great", "Good", "Missing"
  strongMatches?: string[]; // Specific proof points that make the job worth pursuing
  experienceGaps?: string[]; // Practical gaps to address before applying or networking
  suggestedResumeAngle?: string; // One concise positioning angle for tailoring
  recommendedAction?: 'apply_now' | 'tailor_first' | 'network_first' | 'skip_for_now' | string;
  qualifications?: GranularMatchCategory;
  responsibilities?: GranularMatchCategory;
  keywords?: GranularMatchCategory;
  jobTitle?: GranularMatchCategory;
}


export interface Folder {
  id: string;
  title: string;
  order: number;
}

export interface GenAIBlob {
  data: string; // base64 encoded string
  mimeType: string;
}

// --- NEW: Contact & Blog Types ---

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'forwarded' | 'error';
  timestamp: any; // Firestore Timestamp
  aiSupport?: CustomerSupportTriage;
  supportStatus?: 'needs_review' | 'triaged';
}

export interface CustomerSupportTriage {
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  nextAction: string;
  replyDraft: string;
  internalNotes: string;
  needsHumanReview: boolean;
}

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug?: string; // Optional URL friendly version
  excerpt: string;
  content: string; // Markdown supported
  author: string;
  category: string;
  coverImage: string;
  publishedAt: any; // Firestore Timestamp
  readTime?: string;
  faqs?: FAQEntry[];
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: any;
}

// --- HR Partner Job Platform Types ---

export type JobLocationType = 'remote' | 'hybrid' | 'onsite';
export type JobEmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type JobPostingStatus = 'draft' | 'published' | 'closed';
export type JobApplicationStatus = 'new' | 'screening' | 'phone_screen' | 'interview' | 'final_round' | 'offer' | 'hired' | 'rejected' | 'withdrawn' | 'submitted';

// Pipeline Stage Configuration
export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string; // Tailwind color name (e.g., 'blue', 'green', 'red')
  isTerminal?: boolean; // If true, candidates can't be moved from this stage
  isCustom?: boolean; // If true, this is a user-created custom stage
}

// Default pipeline stages
export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'new', name: 'New', order: 0, color: 'blue' },
  { id: 'screening', name: 'Screening', order: 1, color: 'purple' },
  { id: 'phone_screen', name: 'Phone Screen', order: 2, color: 'indigo' },
  { id: 'interview', name: 'Interview', order: 3, color: 'orange' },
  { id: 'final_round', name: 'Final Round', order: 4, color: 'pink' },
  { id: 'offer', name: 'Offer', order: 5, color: 'emerald' },
  { id: 'hired', name: 'Hired', order: 6, color: 'green', isTerminal: true },
  { id: 'rejected', name: 'Rejected', order: 7, color: 'red', isTerminal: true },
];

// Pipeline customization settings
export type PipelineBackgroundTheme = 'none' | 'gradient' | 'geometric' | 'mountains' | 'abstract' | 'particles' | 'custom';

export interface PipelineSettings {
  customStages?: PipelineStage[];
  backgroundTheme: PipelineBackgroundTheme;
  customBackgroundUrl?: string; // Custom uploaded background
  columnTransparency: number; // 0-100, percentage of transparency
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface JobPosting {
  id: string;
  hrUserId: string; // Creator's UID
  companyName: string;
  companyLogo?: string;
  jobTitle: string;
  department: string;
  location: string;
  locationType: JobLocationType;
  employmentType: JobEmploymentType;

  // Job Details
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];

  // Compensation
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  benefits: string[];

  // Application Settings
  applicationDeadline?: any; // Firestore Timestamp
  maxApplications?: number;
  status: JobPostingStatus;

  // Metadata
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  publishedAt?: any; // Firestore Timestamp
  viewCount: number;
  applicationCount: number;

  // Integration
  /** @legacy Use `isPartnerJob` for new code. */
  source?: 'internal' | 'google';
  /** @legacy Use `externalUrl` for new code. */
  applyUrl?: string;

  // --- B2B Partner Job fields ---
  /**
   * `true`  → Job is posted by a CareerVivid Business Partner.
   *            Show the primary "Apply Now" button that triggers the internal modal.
   * `false` → Job is scraped/aggregated from the internet.
   *            Show "Apply Externally" (or disable if `externalUrl` is absent).
   */
  isPartnerJob?: boolean;
  /** Original listing URL for scraped/external jobs. Fallback to `applyUrl`. */
  externalUrl?: string;

  // Public Job Board
  companySlug?: string; // URL-friendly company identifier (e.g., "turbo-ai")
  seoDescription?: string; // Custom meta description for public page
  ogImage?: string; // Custom Open Graph image URL
}

// --- Public Job Board & Embed Types ---

export type EmbedWidgetTheme = 'minimalist' | 'executive' | 'creative';
export type EmbedWidgetMode = 'inline' | 'floating';
export type EmbedFontFamily = 'inter' | 'roboto' | 'outfit' | 'system';

export interface CompanyProfile {
  id: string;
  hrUserId: string; // Owner's UID
  slug: string; // Unique, URL-friendly (e.g., "turbo-ai")
  companyName: string;
  logo?: string;

  // Branding
  primaryColor: string; // Hex color (e.g., "#7c3aed")
  secondaryColor?: string;
  fontFamily: EmbedFontFamily;
  theme: EmbedWidgetTheme;
  customCss?: string; // Advanced: custom CSS overrides

  // Public Page Settings
  showSalary: boolean; // Whether to display salary ranges
  showBenefits: boolean;
  heroImage?: string; // Banner image for public job board
  tagline?: string; // Company tagline

  // Metadata
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

// --- Agency Partner Pilot Types ---

export type PartnerApplicationType = 'academic' | 'business' | 'agency' | 'student';
export type AgencyPilotStatus = 'pending' | 'active' | 'paused' | 'converted';
export type AgencyPrepSessionStatus = 'invited' | 'started' | 'resume_imported' | 'reviewed' | 'ready' | 'shared' | 'inactive';

export interface AgencyBranchProfile {
  id: string;
  ownerUserId: string;
  organization: string;
  branchName: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  website?: string;
  primaryColor?: string;
  pilotStatus: AgencyPilotStatus;
  inviteLimit?: number;
  createdAt: any;
  updatedAt: any;
}

export interface AgencyReadinessReport {
  resumeId: string;
  latestScore: number;
  scoreDelta: number;
  summary: string;
  generatedAt: any;
}

export interface AgencyPrepSession {
  id: string;
  agencyBranchId: string;
  agencyOwnerUserId: string;
  agencySlug: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  resumeId?: string;
  resumeTitle?: string;
  resumeSharePath?: string;
  status: AgencyPrepSessionStatus;
  startingScore?: number;
  latestScore?: number;
  scoreDelta?: number;
  consentToShare: boolean;
  readinessReport?: AgencyReadinessReport;
  createdAt: any;
  updatedAt: any;
  startedAt?: any;
  sharedAt?: any;
  positionTags?: string[];
  overLimit?: boolean;
}

export interface StatusHistoryEntry {
  status: JobApplicationStatus;
  timestamp: any; // Firestore Timestamp
  note?: string;
}

export interface CustomAnswer {
  questionId: string;
  answer: string;
}

export interface JobApplication {
  id: string;
  jobPostingId: string;
  applicantUserId: string;
  resumeId: string; // Which resume they submitted

  // Application Data
  coverLetter?: string;
  customAnswers?: CustomAnswer[];

  // Status Tracking
  status: JobApplicationStatus;
  statusHistory: StatusHistoryEntry[];

  // HR Notes
  hrNotes?: string;
  rating?: number; // 1-5 stars
  matchAnalysis?: ResumeMatchAnalysis; // Verification of match percentage

  // Metadata
  appliedAt: any; // Firestore Timestamp
  lastUpdated: any; // Firestore Timestamp
}

export interface CoverLetter {
  id: string;
  userId: string;
  resumeId: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription: string;
  content: string;
  createdAt: any; // Firestore Timestamp
}

// --- Stitch Commerce Types ---

export interface StitchUser extends UserProfile {
  // Extends existing profile with commerce-specific fields
  zone_id?: string;
  stripe_id?: string; // Merchant/Host specific Stripe Connect ID
}

export type DropStatus = 'open' | 'locked' | 'delivering';

export interface Drop {
  id: string;
  title: string;
  scheduled_date: any; // Firestore Timestamp
  cutoff_timestamp: any; // Firestore Timestamp
  status: DropStatus;
  zones: string[]; // List of zone_ids (e.g. ['urbana'])
}

export interface Product {
  id: string;
  name: string;
  price: number;
  host_uid?: string;
  merchant_uid?: string;
  max_quantity?: number;
  image_url?: string; // Standardized naming for images
  description?: string;
  unit?: string; // e.g. "bag", "lb", "bunch"
}

export interface DropInventoryItem {
  product_id: string;
  stock_remaining: number;
  price_at_drop: number; // Snapshot of price for this specific drop
}

export type OrderStatus = 'confirmed' | 'paid' | 'packed' | 'delivered';

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number; // Price per unit
  name: string; // Snapshot of name
}

export interface Order {
  id: string;
  drop_id: string;
  user_id: string;
  items: OrderItem[];
  status: OrderStatus;
  payment_status: string; // Added for granularity
  delivery_proof_img?: string;
  total_amount: number;
  created_at: any; // Firestore Timestamp
}

// ─────────────────────────────────────────────
// SOP (Standard Operating Procedure) Types
// ─────────────────────────────────────────────

export type SOPSectionType =
  | 'header'
  | 'overview'
  | 'ppe'
  | 'tools'
  | 'steps'
  | 'specs'
  | 'images'
  | 'system_diagrams'
  | 'tools'
  | 'verification'
  | 'checklist'
  | 'footer_notes'
  | 'safety_panel';

// ── Per-section content payloads ──

export interface SOPOverviewContent {
  description: string;
  purpose: string;
  scope: string;
  applicability?: string;
  objectives?: string[];
  outcomes?: string[];
}

export interface SOPPPEItem {
  id: string;
  icon: string;       // key from PPE_ICONS constant
  label: string;
  required: boolean;
  imageUrl?: string;  // Optional custom photo for the gear
}

export interface SOPPPEContent {
  items: SOPPPEItem[];
}

export interface SOPToolItem {
  id: string;
  name: string;
  partNumber?: string;
  quantity?: string;
  notes?: string;
}

export interface SOPToolsContent {
  items: SOPToolItem[];
}

export interface SOPStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;   // Rich text / markdown
  warning?: string;       // Caution/danger note
  note?: string;          // Informational note
  imageUrl?: string;      // Optional inline photo
  imageCaption?: string;
  videoUrl?: string;      // Optional: video link for this step
  assignedTo?: string;
  tools?: string;
}

export interface SOPStepsContent {
  steps: SOPStep[];
}

export interface SOPSpecRow {
  id: string;
  parameter: string;
  value: string;
  unit: string;
  tolerance?: string;
  notes?: string;
}

export interface SOPSpecsContent {
  rows: SOPSpecRow[];
  tableTitle?: string;
}

export interface SOPImageAnnotation {
  id: string;
  x: number;       // percentage 0-100
  y: number;       // percentage 0-100
  label: string;
}

export interface SOPImageItem {
  id: string;
  url: string;
  caption: string;
  alignment?: 'left' | 'center' | 'right' | 'full';
  label?: string;               // e.g. "Fig. 1"
  width?: 'half' | 'full';      // layout in the editor grid
  annotations?: SOPImageAnnotation[];
  videoUrl?: string;            // Optional: YouTube/Vimeo/direct URL; click on image plays this
}

/** Alias kept for semantic clarity in the SOP editor */
export type SOPImageEntry = SOPImageItem;

export interface SOPImagesContent {
  images: SOPImageItem[];
}

export interface SOPSystemDiagramsContent {
  diagrams: SOPImageItem[];
}

export interface SOPChecklistItem {
  id: string;
  text: string;
  category?: 'pre-op' | 'post-op' | 'general' | 'safety' | 'quality' | 'environmental';
}

export interface SOPChecklistContent {
  items: SOPChecklistItem[];
  subtitle?: string;
}

export interface SOPVerificationRow {
  id: string;
  requirement: string;
  method: string;
  acceptanceCriteria: string;
  status?: 'pending' | 'pass' | 'fail' | 'na';
  evidence?: string;
}

export interface SOPVerificationContent {
  rows: SOPVerificationRow[];
}

export interface SOPFooterNotesContent {
  notes: string;          // free text / markdown
  revisionHistory?: { revision: string; date: string; description: string; author: string }[];
  stakeholderFeedback?: { name: string; role: string; feedback: string; date: string }[];
}

/** A labelled text item used in the safety panel (hazard list, equipment list, etc.) */
export interface SOPSafetyListItem {
  id: string;
  text: string;
  severity?: 'low' | 'medium' | 'high'; // optional colour-coding for hazards
}

/** Content for the combined Safety Panel section */
export interface SOPSafetyPanelContent {
  /** Left column – required PPE icons (reuses SOPPPEItem) */
  ppeItems: SOPPPEItem[];
  /** Left column – safety equipment text list */
  safetyEquipment: SOPSafetyListItem[];
  /** Right column – main machine / process image */
  machineImage?: SOPImageItem;
  /** Right column – potential hazards text list */
  hazards: SOPSafetyListItem[];
}

export type SOPSectionContent =
  | SOPOverviewContent
  | SOPPPEContent
  | SOPToolsContent
  | SOPStepsContent
  | SOPSpecsContent
  | SOPImagesContent
  | SOPSystemDiagramsContent
  | SOPToolsContent
  | SOPVerificationContent
  | SOPChecklistContent
  | SOPFooterNotesContent
  | SOPSafetyPanelContent
  | Record<string, any>; // fallback for header

export interface SOPSection {
  id: string;
  type: SOPSectionType;
  title: string;
  content: SOPSectionContent;
  order: number;
  isHidden?: boolean;
}

export interface SOPBranding {
  companyName: string;
  companyLogo?: string;     // Firebase Storage URL
  primaryColor: string;     // Hex color
  accentColor: string;      // Hex color
  titleFont: string;
  bodyFont: string;
}

export interface SOPData {
  id: string;
  userId: string;
  title: string;
  documentNumber: string;   // e.g. "SOP-2024-001"
  revision: string;         // e.g. "Rev A"
  effectiveDate: string;    // ISO date string
  department: string;
  preparedBy: string;
  approvedBy: string;
  sections: SOPSection[];
  branding: SOPBranding;
  createdAt: any;           // Firestore Timestamp
  updatedAt: any;           // Firestore Timestamp
  section?: string;         // Dashboard sidebar folder
  /** Freeform BlockNote content zones keyed by zone ID (e.g. "before-0", "after-last") */
  customBlocks?: Record<string, string>;
  layoutMode?: 'standard' | 'manual' | 'business';
}

// --- Gamification / Learner Progress Types ---

export type XpEventType =
  | 'interview_completed'
  | 'daily_login'
  | 'resume_created'
  | 'lesson_completed'
  | 'quest_stage_cleared'
  | 'quest_completed';

export interface XpEvent {
  /** Deterministic dedupe key, doubles as the Firestore doc id (e.g. `interview_analysis_123`). */
  id: string;
  type: XpEventType;
  xp: number;
  createdAt: number;
  meta?: Record<string, string | number | boolean>;
}

export interface BadgeAward {
  id: string;
  earnedAt: number;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Local calendar day of last qualifying activity, formatted YYYY-MM-DD. */
  lastActiveDay: string;
}

export interface ProgressCounters {
  interviewsCompleted: number;
  interviewsPassed: number;
  lessonsCompleted: number;
  questStagesCleared: number;
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: StreakState;
  badges: BadgeAward[];
  counters: ProgressCounters;
  updatedAt: number;
}

// --- Company Quest Types ---

export interface QuestStageResult {
  bestScore: number;
  attempts: number;
  clearedAt: number | null;
  lastAnalysisId: string;
  /**
   * Coding and system-design stages: ids of the challenges the user has
   * already solved for this company. Lets the quest hand out a fresh problem
   * or prompt from the company's pool each time the user comes back.
   */
  clearedChallengeIds?: string[];
}

export interface CompanyQuestProgress {
  slug: string;
  company: string;
  stageResults: Record<string, QuestStageResult>;
  startedAt: number;
  completedAt: number | null;
  updatedAt: number;
}

// --- Learning Course Types ---

export interface CourseProgress {
  completedModuleIds: string[];
  startedAt: number;
  completedAt: number | null;
  updatedAt: number;
}
