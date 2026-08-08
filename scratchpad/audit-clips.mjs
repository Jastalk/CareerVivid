import fs from 'fs';
import path from 'path';

const clipsDir = 'public/system-design-lessons/clips';
if (!fs.existsSync(clipsDir)) {
    console.log('No clips dir found');
    process.exit(0);
}

const files = fs.readdirSync(clipsDir);

const months = {};
let totalClips = 0;

for (const f of files) {
    if (!f.endsWith('.mp4')) continue;
    totalClips++;
    const full = path.join(clipsDir, f);
    const stat = fs.statSync(full);
    const mtime = stat.mtime;
    const monthKey = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, '0')}`;
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);

    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push({ f, sizeMB, mtime });
}

console.log(`Total MP4 Clips stored locally: ${totalClips}\n`);

for (const [mk, list] of Object.entries(months)) {
    const totalMB = list.reduce((acc, c) => acc + parseFloat(c.sizeMB), 0).toFixed(1);
    console.log(`========================================================`);
    console.log(`📅 Month: ${mk} | Clips Count: ${list.length} | Disk Size: ${totalMB} MB`);
    console.log(`========================================================`);
    list.sort((a, b) => a.mtime - b.mtime).forEach(c => {
        console.log(`   ${c.mtime.toISOString().slice(0, 19).replace('T', ' ')} | ${c.sizeMB.padStart(6)} MB | ${c.f}`);
    });
    console.log('');
}
