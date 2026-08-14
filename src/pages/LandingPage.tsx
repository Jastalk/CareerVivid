import React from 'react';
import LandingSeo from '../components/Landing/LandingSeo';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import CommunityShowcaseHero from '../components/Landing/CommunityShowcaseHero';
import LearnPracticeHiredSection from '../components/Landing/LearnPracticeHiredSection';
import CourseShowcaseSection from '../components/Landing/CourseShowcaseSection';
import InterviewShowcaseSection from '../components/Landing/InterviewShowcaseSection';
// Parked with its render below — see the note above <InterviewShowcaseSection />.
// import DecodeJobHero from '../components/Landing/DecodeJobHero';
import {
    FAQSection,
    FinalCTA,
    DemoVideoSection,
    PricingPreviewSection,
    UserStoriesSection,
} from '../components/Landing/LandingTrustSections';

const LandingPage: React.FC = () => (
    <div className="cv-public-warm-page min-h-screen bg-white text-gray-900 selection:bg-amber-200/60 dark:bg-gray-950 dark:text-gray-100">
        <LandingSeo />
        <PublicHeader variant="editorial" />
        <main>
            {/* Lead with company interview practice; show the workspace preview before the product demo. */}
            {/* The job-posting decoder is parked, not deleted. Its textarea is
                still disabled pending live analysis, so it opened the page on a
                promise it could not yet keep. Uncomment this and its import to
                bring it back. */}
            {/* <DecodeJobHero /> */}
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
