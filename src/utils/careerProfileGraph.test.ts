import { describe, expect, it } from 'vitest';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData } from '../types';
import type { PortfolioData } from '../features/portfolio/types/portfolio';
import { buildCareerProfileGraph } from './careerProfileGraph';

const makeResume = (overrides: Partial<ResumeData> = {}): ResumeData => ({
    id: 'resume-1',
    title: 'Frontend Engineer Resume',
    updatedAt: '2026-06-12T00:00:00.000Z',
    templateId: 'modern',
    personalDetails: {
        firstName: 'Jiawen',
        lastName: 'Zhu',
        email: 'jiawen@example.com',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        country: '',
        photo: '',
        jobTitle: 'Full Stack Engineer',
    },
    professionalSummary: 'Frontend engineer building React, TypeScript, Firebase, and accessibility-focused product workflows.',
    websites: [{ id: 'site-1', label: 'Portfolio', url: 'https://example.com', platform: 'Portfolio' }],
    skills: [
        { id: 'react', name: 'React', level: 'Expert' },
        { id: 'ts', name: 'TypeScript', level: 'Advanced' },
        { id: 'firebase', name: 'Firebase', level: 'Advanced' },
    ],
    employmentHistory: [{
        id: 'role-1',
        jobTitle: 'Founder and Full-Stack Engineer',
        employer: 'CareerVivid',
        city: 'Champaign',
        startDate: '2025-01',
        endDate: '',
        description: 'Built AI job matching and resume workflows.',
    }],
    education: [],
    languages: [],
    themeColor: '#4a4392',
    titleFont: 'Inter',
    bodyFont: 'Inter',
    language: 'en',
    ...overrides,
});

const makePortfolio = (): PortfolioData => ({
    id: 'portfolio-1',
    userId: 'user-1',
    title: 'AI Product Portfolio',
    templateId: 'saas_modern',
    hero: { headline: 'AI Full Stack Engineer', subheadline: 'Product engineering and AI workflows.' },
    about: 'Portfolio for AI product systems.',
    timeline: [],
    education: [],
    techStack: [
        { id: 'next', name: 'Next.js', level: 'Advanced' },
        { id: 'llm', name: 'LLM', level: 'Advanced' },
    ],
    projects: [{
        id: 'project-1',
        title: 'Verified Job Matcher',
        description: 'Matched jobs to resumes with verified application links.',
        tags: ['Agentic AI', 'REST APIs'],
    }],
    socialLinks: [],
    contactEmail: 'jiawen@example.com',
    theme: {},
} as PortfolioData);

const makeJob = (overrides: Partial<JobApplicationData> = {}): JobApplicationData => ({
    id: 'job-1',
    userId: 'user-1',
    jobTitle: 'Frontend Platform Engineer',
    companyName: 'Acme AI',
    jobPostURL: 'https://example.com/job',
    applicationStatus: 'To Apply',
    nextAction: 'Tailor resume',
    matchAnalyses: {
        'resume-1': {
            totalKeywords: 6,
            matchedKeywords: ['React', 'TypeScript'],
            missingKeywords: ['Claude Code', 'Cloud deployment'],
            matchPercentage: 72,
            summary: 'Strong frontend base with AI and cloud gaps.',
        },
    },
    createdAt: null,
    updatedAt: null,
    ...overrides,
});

const makePractice = (overrides: Partial<PracticeHistoryEntry> = {}): PracticeHistoryEntry => ({
    id: 'practice-1',
    job: {
        id: 'practice-job',
        title: 'Frontend Platform Engineer',
        company: 'Acme AI',
        location: 'Remote',
        description: 'React and TypeScript role.',
        url: 'https://example.com/job',
    },
    questions: ['Tell me about yourself.'],
    timestamp: Date.now(),
    interviewHistory: [{
        id: 'analysis-1',
        timestamp: Date.now(),
        overallScore: 82,
        communicationScore: 84,
        confidenceScore: 80,
        relevanceScore: 82,
        strengths: 'Clear examples.',
        areasForImprovement: 'More metrics.',
        transcript: [],
    }],
    ...overrides,
});

describe('career profile graph', () => {
    it('combines resume, skill, portfolio, interview, and job tracker signals', () => {
        const graph = buildCareerProfileGraph({
            resumes: [makeResume()],
            portfolios: [makePortfolio()],
            practiceHistory: [makePractice()],
            jobApplications: [makeJob(), makeJob({ id: 'job-2', applicationStatus: 'Interviewing' })],
        });

        expect(graph.signalCount).toBeGreaterThan(0);
        expect(graph.topSkills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Firebase', 'Next.js', 'LLM']));
        expect(graph.targetRoles).toContain('Frontend Platform Engineer');
        expect(graph.proofProjects).toContain('Verified Job Matcher');
        expect(graph.activeGoals).toContain('Tailor resume');
        expect(graph.roleGoal.title).toBe('Acme AI Frontend Platform Engineer');
        expect(graph.roleGoal.steps.map((step) => step.id)).toEqual([
            'target',
            'resumeMatch',
            'interviewScore',
            'applicationPlan',
        ]);
        const claudeCodeMission = graph.learningMissions.find((mission) => mission.skill === 'Claude Code');
        expect(claudeCodeMission).toMatchObject({
            skill: 'Claude Code',
            targetRole: 'Frontend Platform Engineer',
            proofOutcome: expect.stringContaining('resume bullet'),
        });
        expect(claudeCodeMission?.steps.map((step) => step.tool)).toEqual([
            'chatgpt',
            'gemini',
            'claudeCode',
            'proof',
        ]);
        expect(graph.statusBreakdown).toEqual(expect.arrayContaining([
            { label: 'To Apply', count: 1 },
            { label: 'Interviewing', count: 1 },
        ]));
        expect(graph.nodes.map((node) => node.id)).toEqual([
            'resume',
            'skills',
            'goals',
            'targetRoles',
            'proof',
            'interview',
            'jobHistory',
        ]);
    });

    it('does not treat target roles as completed goals without saved jobs', () => {
        const graph = buildCareerProfileGraph({
            resumes: [makeResume()],
            portfolios: [],
            practiceHistory: [],
            jobApplications: [],
        });

        expect(graph.targetRoles).toContain('Full Stack Engineer');
        expect(graph.activeGoals).toEqual([]);

        const goalsNode = graph.nodes.find((node) => node.id === 'goals');
        expect(goalsNode).toMatchObject({
            value: 'No goal',
            progress: 0,
            actionLabel: 'Save target job',
        });
        expect(graph.roleGoal).toMatchObject({
            title: 'Choose a target role',
            readinessScore: 0,
            readinessLabel: 'Not started',
        });
        expect(graph.nextBestStep.id).toBe('goals');
        expect(graph.nextBestStep.actionPath).toBe('/jobs/recommend');
    });

    it('builds target-role goal progress from resume match and interview scores', () => {
        const graph = buildCareerProfileGraph({
            resumes: [makeResume()],
            portfolios: [],
            practiceHistory: [makePractice({
                job: {
                    id: 'openai-practice',
                    title: 'Software Engineer',
                    company: 'OpenAI',
                    location: 'San Francisco',
                    description: 'Software engineer interview practice.',
                    url: 'https://example.com/openai',
                },
                interviewHistory: [{
                    id: 'openai-analysis',
                    timestamp: Date.now(),
                    overallScore: 88,
                    communicationScore: 90,
                    confidenceScore: 86,
                    relevanceScore: 88,
                    strengths: 'Strong role examples.',
                    areasForImprovement: 'Tighten system design details.',
                    transcript: [],
                }],
            })],
            jobApplications: [makeJob({
                id: 'openai-job',
                jobTitle: 'Software Engineer',
                companyName: 'OpenAI',
                applicationStatus: 'Interviewing',
                nextAction: 'Prepare final interview',
                matchAnalyses: {
                    'resume-1': {
                        totalKeywords: 10,
                        matchedKeywords: ['React', 'TypeScript', 'System design'],
                        missingKeywords: ['Distributed systems'],
                        matchPercentage: 92,
                        summary: 'Strong match for OpenAI software engineering.',
                    },
                },
            })],
        });

        expect(graph.roleGoal.title).toBe('OpenAI Software Engineer');
        expect(graph.roleGoal.readinessScore).toBeGreaterThanOrEqual(85);
        expect(graph.roleGoal.steps.find((step) => step.id === 'resumeMatch')).toMatchObject({
            score: 92,
            status: 'ready',
        });
        expect(graph.roleGoal.steps.find((step) => step.id === 'interviewScore')).toMatchObject({
            score: 88,
            status: 'ready',
        });
        expect(graph.roleGoal.nextStep.id).toBe('applicationPlan');

        const goalsNode = graph.nodes.find((node) => node.id === 'goals');
        expect(goalsNode).toMatchObject({
            value: `${graph.roleGoal.readinessScore}% ready`,
            progress: graph.roleGoal.readinessScore,
            actionLabel: 'Open plan',
        });
    });
});
