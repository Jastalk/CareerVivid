import { execSync } from 'child_process';

const SHOTS = [
    'app-dashboard.png',
    'app-resume-editor.png',
    'app-editor-templates.png',
    'app-interview-studio.png',
    'app-quest-google.png',
    'app-coding-round.png',
    'app-system-design.png',
    'app-interview-report.png',
    'app-course-lesson.png',
    'app-quest-progress.png',
    'app-career-agent.png'
];

for (const shot of SHOTS) {
    try {
        console.log(`\n--- Capturing ${shot} ---`);
        execSync(`node scripts/take-single-shot.mjs ${shot}`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed to capture ${shot}:`, err.message);
    }
}

console.log('\n🎉 Finished capturing all 11 product screenshots!');
