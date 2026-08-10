import type { ResumeData } from '../types';

export type AIReviewLanguageCode = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'other';

export interface AIReviewLanguageProfile {
  code: AIReviewLanguageCode;
  label: string;
  isEnglish: boolean;
  useLocalizedUI: boolean;
  ui: {
    groupBy: string;
    section: string;
    priority: string;
    clearReview: string;
    suggestions: string;
    selected: string;
    score: string;
    old: string;
    new: string;
    add: string;
    remove: string;
    ignore: string;
    apply: string;
    scanResume: string;
    scanAgain: string;
    noActionableEdits: string;
    scanWithAIReview: string;
    assessmentLabel: string;
    selectAll: string;
    deselectAll: string;
    noEditsBody: (score: number) => string;
    scanBody: string;
    progress: string[];
    proofPoints: string[];
    sections: Record<string, string>;
    priorities: Record<string, string>;
    tags: Record<string, string>;
  };
}

export const NATURAL_PROFESSIONAL_TERMS = [
  'Google Cloud Platform',
  'Amazon Web Services',
  'Firebase Cloud Functions',
  'Google Cloud Functions',
  'Cloud Functions',
  'Microsoft Office',
  'Microsoft Excel',
  'Google Workspace',
  'Google Analytics',
  'Google Search Console',
  'Firebase Auth',
  'Firebase Hosting',
  'Cloud Scheduler',
  'Secret Manager',
  'Google Secret Manager',
  'Chrome Extension',
  'iOS App Clip',
  'Chrome extension',
  'RESTful APIs',
  'RESTful API',
  'REST APIs',
  'REST API',
  'Reddit API',
  'GraphQL',
  'WebSocket',
  'WebRTC',
  'PostgreSQL',
  'MongoDB',
  'BigQuery',
  'Snowflake',
  'Databricks',
  'Tableau',
  'Power BI',
  'Looker',
  'Redis',
  'Elasticsearch',
  'Kafka',
  'RabbitMQ',
  'Firestore',
  'Firebase',
  'Supabase',
  'PlanetScale',
  'Stripe',
  'PayPal',
  'OpenAI',
  'OpenAI API key',
  'OpenAI API Key',
  'Anthropic',
  'Gemini API Key',
  'Gemini API key',
  'Gemini API',
  'Gemini',
  'Vertex AI',
  'Claude',
  'ChatGPT',
  'Tailwind CSS',
  'HTML/CSS',
  'Vite',
  'Playwright',
  'CareerVivid',
  'LinkedIn',
  'GitHub',
  'GitLab',
  'Bitbucket',
  'WordPress',
  'Shopify',
  'Webflow',
  'Notion',
  'Slack',
  'HubSpot',
  'Airtable',
  'Zapier',
  'Windows',
  'macOS',
  'Linux',
  'iOS',
  'Android',
  'ChromeOS',
  'TypeScript',
  'JavaScript',
  'Kubernetes',
  'ServiceNow',
  'Salesforce',
  'Next.js',
  'Node.js',
  'Express.js',
  'React Native',
  'React',
  'Vue',
  'Svelte',
  'Docker',
  'Python',
  'Java',
  'C++',
  'C#',
  'Ruby',
  'Golang',
  'Swift',
  'Kotlin',
  'Figma',
  'Jira',
  'AWS',
  'Azure',
  'GCP',
  'Google Docs',
  'LLM',
  'SDK',
  'CLI',
  'SSO',
  'SAML',
  'OAuth',
  'OAuth 2.0',
  'JWT',
  'API key',
  'API Key',
  'API',
  'HTTP',
  'HTTPS',
  'URL',
  'URI',
  'JSON',
  'CSV',
  'PDF',
  'DOCX',
  'TXT',
  'Markdown',
  'Email',
  'e-mail',
  'npm',
  'npm install',
  'npm run build',
  'npm run build:vite',
  'firebase deploy',
  'firebase deploy --only hosting',
  'cv publish',
  'cv preview',
  'cv import',
  'SQL',
  'NoSQL',
  'HTML',
  'CSS',
  'WLAN',
  'LAN',
  'Wi-Fi',
  'VPN',
  'IAM',
  'CI/CD',
  'SLA',
  'SLO',
  'KPI',
  'OKR',
  'ATS',
  'UI/UX',
  'NFC',
  'NFC Tap Tags',
  'NFC Tap Tag',
  'QR code',
  'QR',
  'Tap Tag',
  'App Clip',
] as const;

export const buildNaturalProfessionalLanguageGuidance = (targetLanguageLabel: string): string => {
  const examples = NATURAL_PROFESSIONAL_TERMS.join(', ');
  return [
    `Write user-visible resume advice in ${targetLanguageLabel}, but use natural mixed-language professional terminology when it is clearer, more standard, or more searchable.`,
    'Do not force-translate company names, product names, operating systems, platform names, role acronyms, programming languages, technical acronyms, certifications, libraries, frameworks, APIs, or globally recognized tools.',
    `Keep terms such as ${examples} in their normal industry form when recruiters would search for them that way.`,
    'For Chinese resumes, use polished professional Chinese sentence structure, while preserving English or other-language technical terms when those terms are more precise than a translated version.',
    'For other languages, localize the sentence and grammar, but keep an English or other-language term when that term is the clearest professional standard.',
  ].join('\n');
};

const englishUI: AIReviewLanguageProfile['ui'] = {
  groupBy: 'Group by:',
  section: 'Section',
  priority: 'Priority',
  clearReview: 'Clear Review',
  suggestions: 'Suggestions',
  selected: 'Selected',
  score: 'Score',
  old: 'Old:',
  new: 'New:',
  add: 'Add:',
  remove: 'Remove:',
  ignore: 'Ignore',
  apply: 'Apply',
  scanResume: 'Scan Resume',
  scanAgain: 'Scan Again',
  noActionableEdits: 'No Actionable Edits Found',
  scanWithAIReview: 'Scan Resume with AI Review',
  assessmentLabel: 'AI Recruiter Agent',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  noEditsBody: (score) => `Your current resume score is ${score}. CareerVivid did not find any verified edits that would improve this version.`,
  scanBody: 'Our advanced AI recruiter runs a deep-level assessment of spelling, ATS keyword densities, action verbs, and impact metrics.',
  progress: [
    'Assessing ATS keyword densities...',
    'Analyzing grammar and action verbs...',
    'Evaluating achievement impact metrics...',
    'Reviewing visual layout structure...',
    'Polishing recommended edits...',
  ],
  proofPoints: [
    'Fix typos & grammar ("Illustraotr" -> "Illustrator")',
    'Tailor skills & add core ATS keywords',
    'Strengthen bullets & inject quantifiable metrics',
  ],
  sections: {
    other: 'Other',
    skills: 'Skills',
    experience: 'Work Experience',
    summary: 'Professional Summary',
    personalDetails: 'Personal Details',
  },
  priorities: {
    high: 'High Impact',
    medium: 'Medium Impact',
    low: 'Low Impact',
  },
  tags: {
    'Stay Relevant': 'Stay Relevant',
    'Tailor Resume': 'Tailor Resume',
    Quantifiable: 'Quantifiable',
    Grammar: 'Grammar',
    'Score Impact': 'Score Impact',
    'Interview Ready': 'Interview Ready',
    'Action Verbs': 'Action Verbs',
    'ATS Match': 'ATS Match',
  },
};

const simplifiedChineseUI: AIReviewLanguageProfile['ui'] = {
  groupBy: '分组：',
  section: '按章节',
  priority: '按优先级',
  clearReview: '清空建议',
  suggestions: '条建议',
  selected: '已选择',
  score: '分数',
  old: '原文：',
  new: '建议：',
  add: '添加：',
  remove: '移除：',
  ignore: '忽略',
  apply: '应用',
  scanResume: '扫描简历',
  scanAgain: '重新扫描',
  noActionableEdits: '暂无可执行修改',
  scanWithAIReview: '用 AI Review 扫描简历',
  assessmentLabel: 'AI 招聘顾问',
  selectAll: '全选',
  deselectAll: '取消全选',
  noEditsBody: (score) => `当前简历分数是 ${score}。CareerVivid 没有发现可以确定提升这一版简历的修改。`,
  scanBody: 'AI 招聘顾问会检查拼写、ATS 关键词密度、动作动词、成果量化和内容完整度。',
  progress: [
    '正在评估 ATS 关键词密度...',
    '正在分析语法和动作动词...',
    '正在评估成果量化力度...',
    '正在检查版面结构...',
    '正在整理推荐修改...',
  ],
  proofPoints: [
    '修正拼写和语法问题',
    '补充岗位相关技能和 ATS 关键词',
    '强化经历要点并加入可量化成果',
  ],
  sections: {
    other: '其他',
    skills: '技能',
    experience: '工作经历',
    summary: '职业摘要',
    personalDetails: '个人信息',
  },
  priorities: {
    high: '高影响',
    medium: '中影响',
    low: '低影响',
  },
  tags: {
    'Stay Relevant': '保持相关',
    'Tailor Resume': '匹配岗位',
    Quantifiable: '可量化',
    Grammar: '语法',
    'Score Impact': '提升评分',
    'Interview Ready': '面试就绪',
    'Action Verbs': '动作动词',
    'ATS Match': 'ATS 匹配',
  },
};

const countMatches = (value: string, pattern: RegExp): number => (value.match(pattern) || []).length;

const normalizeLanguageValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const canonicalTagLabels = Object.keys(englishUI.tags);

const normalizeTagKey = (value: string): string =>
  value.replace(/\s+/g, '').trim().toLowerCase();

const localizedTagAliases: Record<string, string> = {
  保持相关: 'Stay Relevant',
  匹配岗位: 'Tailor Resume',
  岗位匹配: 'Tailor Resume',
  可量化: 'Quantifiable',
  量化成果: 'Quantifiable',
  语法: 'Grammar',
  拼写语法: 'Grammar',
  提升评分: 'Score Impact',
  分数提升: 'Score Impact',
  面试就绪: 'Interview Ready',
  面试准备: 'Interview Ready',
  动作动词: 'Action Verbs',
  行动动词: 'Action Verbs',
  ats匹配: 'ATS Match',
  关键词匹配: 'ATS Match',
};

export const getResumeReviewLanguageProfile = (resume: Partial<ResumeData> | null | undefined): AIReviewLanguageProfile => {
  const language = normalizeLanguageValue(resume?.language);
  const sampledText = [
    resume?.language,
    resume?.title,
    resume?.personalDetails?.jobTitle,
    resume?.professionalSummary,
    ...(resume?.employmentHistory || []).flatMap((job) => [job.jobTitle, job.employer, job.description]),
    ...(resume?.skills || []).map((skill) => skill.name),
  ].filter(Boolean).join('\n');

  const cjkCount = countMatches(sampledText, /[\u3400-\u9fff]/g);
  const sampleLength = Math.max(sampledText.replace(/\s/g, '').length, 1);
  const hasMeaningfulCjk = cjkCount >= 8 || cjkCount / sampleLength > 0.18;

  if (/zh|chinese|中文|简体|漢|汉|cn/.test(language) || hasMeaningfulCjk) {
    const isTraditional = /tw|hk|traditional|繁體|繁体/.test(language);
    return {
      code: isTraditional ? 'zh-TW' : 'zh-CN',
      label: isTraditional ? 'Traditional Chinese' : 'Simplified Chinese',
      isEnglish: false,
      useLocalizedUI: true,
      ui: simplifiedChineseUI,
    };
  }

  if (/ja|japanese|日本語|日本/.test(language)) {
    return { code: 'ja', label: 'Japanese', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }
  if (/ko|korean|한국|한국어/.test(language)) {
    return { code: 'ko', label: 'Korean', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }
  if (/es|spanish|español/.test(language)) {
    return { code: 'es', label: 'Spanish', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }
  if (/fr|french|français/.test(language)) {
    return { code: 'fr', label: 'French', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }
  if (/de|german|deutsch/.test(language)) {
    return { code: 'de', label: 'German', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }
  if (/pt|portuguese|português/.test(language)) {
    return { code: 'pt', label: 'Portuguese', isEnglish: false, useLocalizedUI: false, ui: englishUI };
  }

  return {
    code: 'en',
    label: 'English',
    isEnglish: true,
    useLocalizedUI: false,
    ui: englishUI,
  };
};

export const getLocalizedReviewTagLabel = (
  tag: string,
  language: AIReviewLanguageProfile,
): string => language.ui.tags[tag] || tag;

export const normalizeReviewTagLabel = (tag: string): string | null => {
  const cleanedTag = typeof tag === 'string' ? tag.trim() : '';
  if (!cleanedTag) return null;

  const canonicalMatch = canonicalTagLabels.find((label) => normalizeTagKey(label) === normalizeTagKey(cleanedTag));
  if (canonicalMatch) return canonicalMatch;

  return localizedTagAliases[normalizeTagKey(cleanedTag)] || null;
};
