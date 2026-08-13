import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/producthunt-assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Capturing high-resolution Product Hunt screenshots from local dev server...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  const routes = [
    { url: 'http://localhost:8765/', file: 'careervivid-hero-landing.png' },
    { url: 'http://localhost:8765/interview-studio', file: 'careervivid-interview-studio.png' },
    { url: 'http://localhost:8765/learning/system-design-interview', file: 'careervivid-system-design.png' },
    { url: 'http://localhost:8765/interview-studio/companies/google', file: 'careervivid-company-guide.png' }
  ];

  for (const r of routes) {
    console.log(`📸 Capturing ${r.url} -> ${r.file}...`);
    try {
      await page.goto(r.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      const filePath = path.join(outDir, r.file);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`✅ Saved ${filePath}`);
    } catch (err) {
      console.error(`❌ Error capturing ${r.url}:`, err.message);
    }
  }

  await browser.close();
  console.log('🎉 Full rich screenshots complete!');
}

captureScreenshots().catch(console.error);
