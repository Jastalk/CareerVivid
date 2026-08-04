import React from 'react';
import { Helmet } from 'react-helmet-async';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import CommunityShowcaseHero from '../components/Landing/CommunityShowcaseHero';
import LearnPracticeHiredSection from '../components/Landing/LearnPracticeHiredSection';
import CourseShowcaseSection from '../components/Landing/CourseShowcaseSection';
import InterviewShowcaseSection from '../components/Landing/InterviewShowcaseSection';
import DecodeJobHero from '../components/Landing/DecodeJobHero';
import { INTERVIEW_GUIDE_TOTALS } from '../data/interviewGuideSummaries.generated';
import { getCourseCatalogTotals } from '../lib/interactiveCourses';
import {
    FAQSection,
    FinalCTA,
    DemoVideoSection,
    PricingPreviewSection,
    UserStoriesSection,
} from '../components/Landing/LandingTrustSections';

const SEO_TITLE = 'CareerVivid | Learn the Skills. Practice the Interview. Land the Job.';
const COMPANY_GUIDE_COUNT = INTERVIEW_GUIDE_TOTALS.companies;
const { courses: COURSE_COUNT, lessons: LESSON_COUNT } = getCourseCatalogTotals();
const SEO_DESCRIPTION = `Build job-ready skills across ${COURSE_COUNT} interactive courses and ${LESSON_COUNT} hands-on lessons — coding interview patterns, system design, and AI agents. Then practice ${COMPANY_GUIDE_COUNT} real company interview loops with a live voice AI and apply with a tailored resume from the same workspace.`;
const SEO_KEYWORDS = 'interactive coding courses, skills building platform, coding interview patterns, system design interview course, learn AI agents, LLM course, technical interview preparation, mock interview practice, company interview questions, AI voice interviewer, tailored resume, resume tailoring for job descriptions, ATS resume optimization';
const SEO_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Fog_image.png?alt=media';
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/dmigeakdfokehlhigkhadglgoabceoag?utm_source=item-share-cb';

const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            // Keep @type, description, and knowsAbout identical to the same
            // @id in index.html — two nodes sharing an @id but disagreeing is a
            // conflicting signal to both crawlers and answer engines.
            '@type': ['Organization', 'EducationalOrganization'],
            '@id': 'https://careervivid.app/#organization',
            name: 'CareerVivid',
            url: 'https://careervivid.app/',
            description: 'CareerVivid is an online learning platform for technical skills and job preparation. It offers interactive courses in AI agents, coding interview patterns, and system design, company-specific interview guides, and AI resume tailoring.',
            logo: 'https://firebasestorage.googleapis.com/v0/b/jastalk-firebase.firebasestorage.app/o/public%2Flogo_assets%2Flogo_light_mode.png?alt=media&token=627ec9de-a950-41f7-9138-dd7a33518c55',
            sameAs: ['https://twitter.com/careervivid'],
            knowsAbout: [
                'AI agent development',
                'Large language models',
                'Prompt engineering',
                'Retrieval-augmented generation',
                'Data structures and algorithms',
                'Coding interview preparation',
                'System design interviews',
                'Distributed systems',
                'Technical interview coaching',
                'Resume tailoring and ATS optimization',
            ],
        },
        {
            '@type': 'WebSite',
            '@id': 'https://careervivid.app/#website',
            name: 'CareerVivid',
            url: 'https://careervivid.app/',
            description: SEO_DESCRIPTION,
            publisher: { '@id': 'https://careervivid.app/#organization' },
        },
        {
            '@type': ['WebApplication', 'SoftwareApplication'],
            '@id': 'https://careervivid.app/#webapp',
            name: 'CareerVivid',
            alternateName: 'CareerVivid Learning and Interview Prep Platform',
            url: 'https://careervivid.app/',
            image: SEO_IMAGE,
            applicationCategory: 'EducationalApplication',
            applicationSubCategory: 'Interactive Courses and Interview Preparation',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'CareerVivid Free' },
            featureList: [
                `${COURSE_COUNT} interactive courses with ${LESSON_COUNT} hands-on lessons`,
                'Coding Interview Patterns — 20 patterns with step-through algorithm animations',
                'System Design Interview — 13 modules from capacity estimation to multi-region reliability',
                'AI Agent Builder Curriculum — LLM foundations through a portfolio capstone',
                'Hands-on playgrounds, quizzes, and runnable code labs in every lesson',
                `Company-specific mock interview loops for ${COMPANY_GUIDE_COUNT} companies`,
                'Realtime voice AI interviewer with scored feedback',
                'In-browser coding rounds with real test execution',
                'Whiteboard system-design rounds graded by AI',
                'Resume tailoring against a target job description',
                'ATS resume checker and readiness score',
                'XP and progress tracking across courses and interviews',
                'Verified apply-ready job feed from official company career boards',
                'Chrome extension job capture and autofill',
            ],
            audience: [
                { '@type': 'Audience', audienceType: 'students' },
                { '@type': 'Audience', audienceType: 'new graduates' },
                { '@type': 'Audience', audienceType: 'career changers' },
                { '@type': 'Audience', audienceType: 'software engineers' },
                { '@type': 'Audience', audienceType: 'job seekers' },
            ],
            potentialAction: [
                {
                    '@type': 'LearnAction',
                    name: 'Browse the course catalog',
                    target: 'https://careervivid.app/learning',
                },
                {
                    '@type': 'UseAction',
                    name: 'Practice a company interview',
                    target: 'https://careervivid.app/interview-studio',
                },
                {
                    '@type': 'UseAction',
                    name: 'Tailor a resume to a job description',
                    target: 'https://careervivid.app/newresume',
                },
                {
                    '@type': 'RegisterAction',
                    name: 'Start for free',
                    target: 'https://careervivid.app/signup',
                },
            ],
            description: SEO_DESCRIPTION,
            publisher: { '@id': 'https://careervivid.app/#organization' },
        },
        {
            '@type': 'FAQPage',
            '@id': 'https://careervivid.app/#faq',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'What is CareerVivid?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `CareerVivid is an online learning platform for technical skills and job preparation. It offers ${COURSE_COUNT} interactive courses with ${LESSON_COUNT} hands-on lessons covering AI agents, coding interview patterns, and system design; interview preparation guides for ${COMPANY_GUIDE_COUNT} companies with a live voice AI interviewer; and AI resume tailoring that rewrites your resume against a specific job description.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What courses does CareerVivid offer?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'CareerVivid offers three interactive course tracks. Coding Interview Patterns teaches 20 algorithm patterns across 60 lessons with step-through animations and runnable code labs. System Design Interview covers 85 lessons across 13 modules, from capacity estimation to multi-region reliability. The AI Agent Builder Curriculum spans 10 modules and 58 lessons, from LLM foundations through a portfolio capstone.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How do you tailor a resume to a job description on CareerVivid?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Paste or import the job description, and CareerVivid rewrites your resume against it — surfacing the evidence that matches the role, aligning wording with the posting, and scoring how well the result matches before you apply. The output is ATS-friendly and you can keep a separate tailored version per application.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Can I practice a Google or Amazon interview on CareerVivid?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `Yes. CareerVivid has company-specific interview quests for ${COMPANY_GUIDE_COUNT} companies including Google, Amazon, Meta, Apple, OpenAI, and Figma. Each quest mirrors the company's real loop — recruiter screen, live coding with test execution, whiteboard system design, and behavioral rounds — and a voice AI interviews and scores you. Every quest page is free to browse; running stages requires a free account.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Are the CareerVivid courses free?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `The Coding Interview Patterns course and the AI Foundations module are completely free — no account required. Foundations includes interactive playgrounds where you watch a language model predict tokens, sort the AI stack, and experiment with temperature. Creating a free account saves progress and XP; paid plans unlock all ${COURSE_COUNT} courses and ${LESSON_COUNT} hands-on lessons.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How do CareerVivid mock interviews work?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'A realtime voice AI interviews you with questions drawn from the company\'s verified interview guide, adapts to your answers, and produces a scored feedback report covering communication, confidence, and relevance. Coding rounds run your code against real tests in the browser; system design rounds are drawn on a whiteboard and graded by AI.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Where do CareerVivid\'s recommended jobs come from?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Jobs are ingested directly from 160+ companies\' official career boards (Greenhouse, Lever, and Ashby) every six hours, and every apply link is validated before it appears — expired or broken postings are removed automatically.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Do I need a credit card to start?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'No. You can browse all courses, company interview quests, and the community without an account, and a free account — no credit card — unlocks the Foundations course, saved progress, and starter AI credits for mock interviews.',
                    },
                },
            ],
        },
        {
            '@type': 'BrowserApplication',
            '@id': 'https://careervivid.app/#chrome-extension',
            name: 'CareerVivid Chrome Extension',
            url: 'https://careervivid.app/extension-welcome',
            browserRequirements: 'Chrome',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'Job Application Autofill',
            operatingSystem: 'Chrome',
            featureList: [
                'Save job postings from the browser',
                'Autofill job applications',
                'Analyze resume match on job pages',
                'Send roles into the CareerVivid job tracker',
            ],
            description: 'The CareerVivid Chrome extension helps job seekers save roles, autofill applications, analyze job fit, and keep browser work connected to their CareerVivid workspace.',
            downloadUrl: CHROME_EXTENSION_URL,
            publisher: { '@id': 'https://careervivid.app/#organization' },
        },
    ],
};

const LandingPage: React.FC = () => (
    <div className="cv-public-warm-page min-h-screen bg-white text-gray-900 selection:bg-amber-200/60 dark:bg-gray-950 dark:text-gray-100">
        <Helmet titleTemplate="%s">
            <title>{SEO_TITLE}</title>
            <meta name="title" content={SEO_TITLE} />
            <meta name="description" content={SEO_DESCRIPTION} />
            <meta name="keywords" content={SEO_KEYWORDS} />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <link rel="canonical" href="https://careervivid.app/" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://careervivid.app/" />
            <meta property="og:site_name" content="CareerVivid" />
            <meta property="og:locale" content="en_US" />
            <meta property="og:title" content={SEO_TITLE} />
            <meta property="og:description" content={SEO_DESCRIPTION} />
            <meta property="og:image" content={SEO_IMAGE} />
            <meta property="og:image:alt" content="CareerVivid interactive course and interview preparation platform" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@careervivid" />
            <meta name="twitter:creator" content="@careervivid" />
            <meta name="twitter:title" content={SEO_TITLE} />
            <meta name="twitter:description" content={SEO_DESCRIPTION} />
            <meta name="twitter:image" content={SEO_IMAGE} />
            <meta name="twitter:image:alt" content="CareerVivid interactive course and interview preparation platform" />
            <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        </Helmet>
        <PublicHeader variant="editorial" />
        <main>
            {/* Lead with company interview practice; show the workspace preview before the product demo. */}
            <DecodeJobHero />
            <InterviewShowcaseSection />
            <LearnPracticeHiredSection />
            <CourseShowcaseSection />
            <CommunityShowcaseHero />
            <DemoVideoSection />
            <UserStoriesSection />
            <PricingPreviewSection />
            <FAQSection />
            <FinalCTA />
        </main>
        <Footer />
    </div>
);

export default LandingPage;
