import { execSync } from 'child_process';
import path from 'path';

const REMAINING_SHOTS = [
    'app-quest-google.png',
    'app-coding-round.png',
    'app-interview-report.png',
    'app-course-lesson.png',
    'app-quest-progress.png',
    'app-career-agent.png'
];

for (const shot of REMAINING_SHOTS) {
    try {
        console.log(`\n============================\nCapturing ${shot}...\n============================`);
        execSync(`node scripts/take-single-shot.mjs ${shot}`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed ${shot}:`, err.message);
    }
}

console.log('\n🎉 Finished capturing all remaining screenshots!');
