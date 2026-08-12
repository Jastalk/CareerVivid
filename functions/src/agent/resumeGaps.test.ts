import { describe, expect, it, vi } from 'vitest';
import { findResumeGaps, type ResumeGap } from './resumeGaps';

vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(() => ({ collection: () => ({}) }), {
        Timestamp: { now: () => ({ toMillis: () => 0 }) },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

/*
 * The complaint this exists for: "right now the agent can only add the skills,
 * which is so limited". It could only offer a skill tag because a skill tag was
 * the only thing it could see. These rules are the rest of the resume.
 */

/** A resume with nothing wrong with it, to vary one thing at a time. */
const healthy = () => ({
    title: 'Product Manager Resume',
    personalDetails: {
        jobTitle: 'Product Manager',
        firstName: 'Wei',
        lastName: 'Chen',
        email: 'wei@chen.dev',
        phone: '+1 415 555 0110',
        city: 'Austin',
        country: 'USA',
    },
    professionalSummary:
        'Product Manager with 8 years building payments infrastructure. Took checkout conversion from 61% to 74% ' +
        'across 3 markets, and led a team of 6 through a platform migration with no customer-facing downtime. ' +
        'Looking for a senior platform role where the hard part is the distributed system, not the roadmap.',
    skills: [
        { name: 'Roadmapping' }, { name: 'SQL' }, { name: 'Experimentation' },
        { name: 'Stakeholder Management' }, { name: 'Pricing' }, { name: 'Go-to-Market' },
    ],
    employmentHistory: [
        {
            jobTitle: 'Senior PM',
            employer: 'Stripe',
            startDate: 'Jan 2020',
            endDate: 'Present',
            description: 'Grew checkout conversion 13 points across 3 markets.\nCut settlement latency from 4h to 20m.',
        },
    ],
    education: [{ school: 'UT Austin', degree: 'BS Computer Science' }],
});

const areas = (gaps: ResumeGap[]) => gaps.map((g) => g.area);
const find = (gaps: ResumeGap[], area: string) => gaps.filter((g) => g.area === area);

describe('findResumeGaps', () => {
    it('finds nothing wrong with a resume that is genuinely fine', () => {
        const { gaps, strengths } = findResumeGaps({
            resume: healthy(),
            profile: { targetArchetypes: ['Platform PM'] },
            lastReport: { role: 'Platform PM', overallScore: 82, skills: ['Roadmapping'], areasForImprovement: '' },
        });

        expect(areas(gaps)).toEqual([]);
        expect(strengths.length).toBeGreaterThan(0);
    });

    it('ranks what costs interviews above what costs polish', () => {
        const resume = healthy();
        resume.personalDetails.email = '';
        resume.personalDetails.city = '';
        resume.personalDetails.country = '';

        const { gaps } = findResumeGaps({ resume, profile: { targetArchetypes: ['PM'] } });

        expect(gaps[0].severity).toBe('high');
        expect(gaps[0].finding).toContain('no email');
        expect(gaps.map((g) => g.severity)).toEqual([...gaps.map((g) => g.severity)].sort());
    });

    /*
     * The single most common real problem, and the one the agent had no way to
     * mention. A resume of duties reads as a job description someone was near.
     */
    it('catches bullets that describe the job instead of the work', () => {
        const resume = healthy();
        resume.employmentHistory[0].description =
            'Responsible for the mobile checkout flow.\nWorked on the payments team.\nHelped with migrations.';

        const { gaps } = findResumeGaps({ resume });
        const experience = find(gaps, 'experience');

        const quantification = experience.find((g) => g.finding.includes('%'));
        expect(quantification?.severity).toBe('high');
        // The agent has to be able to quote the actual line, not the principle.
        expect(quantification?.quote).toContain('Responsible for');

        const weak = experience.find((g) => g.finding.includes('open by describing the job'));
        expect(weak?.finding).toContain('3 bullets');
        expect(weak?.tool).toBe('updateResumeSection');
    });

    it('does not flag quantification when the bullets already carry numbers', () => {
        const { gaps } = findResumeGaps({ resume: healthy() });
        expect(find(gaps, 'experience')).toEqual([]);
    });

    it('names the role that was left empty rather than saying "a role"', () => {
        const resume = healthy();
        resume.employmentHistory.push({
            jobTitle: 'Associate PM', employer: 'Enterprise Town',
            startDate: '2017', endDate: '2019', description: '   ',
        });

        const gap = find(findResumeGaps({ resume }).gaps, 'experience')
            .find((g) => g.finding.includes('no bullets'));
        expect(gap?.finding).toContain('Associate PM at Enterprise Town');
        expect(gap?.severity).toBe('high');
    });

    it('flags a summary with nothing measurable in it', () => {
        const resume = healthy();
        resume.professionalSummary =
            'Passionate and results-driven Product Manager with a proven track record of driving cross-functional ' +
            'alignment and delivering customer-centric outcomes in fast-paced, dynamic environments every day.';

        const gap = find(findResumeGaps({ resume }).gaps, 'summary')[0];
        expect(gap.finding).toContain('no number');
        expect(gap.quote).toContain('Passionate');
    });

    it('flags a summary too short to say anything', () => {
        const resume = healthy();
        resume.professionalSummary = 'Experienced PM.';

        expect(find(findResumeGaps({ resume }).gaps, 'summary')[0].finding).toContain('too short');
    });

    /*
     * The generated-resume failure mode: the user never replaced the sample and
     * has no reason to suspect a template name is still on the page.
     */
    it('catches placeholder details a generator left behind', () => {
        const resume = healthy();
        resume.personalDetails.firstName = 'Jane';
        resume.personalDetails.lastName = 'Doe';
        resume.personalDetails.email = 'jane.doe@example.com';

        const gaps = find(findResumeGaps({ resume }).gaps, 'contact');
        const placeholder = gaps.find((g) => g.finding.includes('placeholder'));
        expect(placeholder?.severity).toBe('high');
    });

    /*
     * The corruption from the Live API's stringified arguments, surfaced so the
     * agent can offer to clean it up instead of the user finding it themselves.
     */
    it('surfaces a JSON blob sitting in the skills list', () => {
        const resume = healthy();
        resume.skills.push({ name: '{"name":"System Design","level":"Advanced"}' });

        const gap = find(findResumeGaps({ resume }).gaps, 'skills')[0];
        expect(gap.severity).toBe('high');
        expect(gap.finding).toContain('raw JSON');
        expect(gap.quote).toContain('System Design');
    });

    it('routes a proven skill to addResumeSkills, and only when the round backs it', () => {
        const strong = findResumeGaps({
            resume: healthy(),
            lastReport: { role: 'Platform PM', overallScore: 88, skills: ['Distributed Systems', 'SQL'] },
        }).gaps;
        const proposal = find(strong, 'skills').find((g) => g.tool === 'addResumeSkills');
        expect(proposal?.finding).toContain('Distributed Systems');
        // Already on the resume, so it must not be offered again.
        expect(proposal?.finding).not.toContain('SQL,');

        const weak = findResumeGaps({
            resume: healthy(),
            lastReport: { role: 'Platform PM', overallScore: 61, skills: ['Distributed Systems'] },
        }).gaps;
        expect(find(weak, 'skills').some((g) => g.tool === 'addResumeSkills')).toBe(false);
    });

    it('asks for targets when there is nothing to tailor toward', () => {
        const gap = find(findResumeGaps({ resume: healthy() }).gaps, 'targets')[0];
        expect(gap.tool).toBe('setJobTargets');
    });

    it('offers practice when nothing has been pressure-tested', () => {
        const gap = find(findResumeGaps({ resume: healthy() }).gaps, 'practice')[0];
        expect(gap.tool).toBe('startInterviewPractice');
    });

    it('survives a resume that is almost entirely empty', () => {
        const { gaps, stats } = findResumeGaps({ resume: {} });

        expect(gaps.length).toBeGreaterThan(4);
        expect(gaps.every((g) => g.finding && g.fix)).toBe(true);
        expect(stats.quantifiedPercent).toBe(0);
    });

    it('reports the numbers the agent can say out loud', () => {
        const { stats } = findResumeGaps({ resume: healthy() });
        expect(stats).toMatchObject({ roles: 1, bullets: 2, quantifiedBullets: 2, quantifiedPercent: 100, skills: 6 });
    });
});
