/**
 * resume-pdf.ts — Resume PDF resolver for cv jobs apply
 *
 * Finds the user's resume PDF from known locations in priority order.
 * Prompts the user if not found and remembers the path for future runs.
 *
 * Priority order:
 *   1. ~/.careervivid/resume.pdf          (canonical CLI location)
 *   2. ~/careervivid/browser-use/resume.pdf (legacy dev location)
 *   3. Interactive prompt → saves to ~/.careervivid/resume.pdf
 */

import { existsSync, copyFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import chalk from "chalk";
import pkg from "enquirer";

const { prompt } = pkg;

// ── Canonical location ────────────────────────────────────────────────────────

const CANONICAL_PDF = join(homedir(), ".careervivid", "resume.pdf");

// ── Fallback search paths ─────────────────────────────────────────────────────

const FALLBACK_PATHS = [
  join(homedir(), "careervivid", "browser-use", "resume.pdf"),
  join(homedir(), "Downloads", "resume.pdf"),
  join(homedir(), "Desktop", "resume.pdf"),
];

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves the resume PDF path.
 *
 * @returns Absolute path to the PDF, or null if not found and user skips.
 */
export async function resolveResumePdf(): Promise<string | null> {
  // 1. Canonical location
  if (existsSync(CANONICAL_PDF)) {
    console.log(chalk.dim(`  📄 Resume PDF: ${CANONICAL_PDF}`));
    return CANONICAL_PDF;
  }

  // 2. Known fallback locations — auto-promote to canonical
  for (const fallback of FALLBACK_PATHS) {
    if (existsSync(fallback)) {
      console.log(chalk.dim(`  📄 Found resume at: ${fallback}`));
      console.log(chalk.dim(`     Copying to canonical location: ${CANONICAL_PDF}`));
      try {
        ensureCareerVividDir();
        copyFileSync(fallback, CANONICAL_PDF);
        console.log(chalk.green(`  ✔ Resume saved to ~/.careervivid/resume.pdf\n`));
      } catch {
        // Copy failed — just use the fallback path directly
        return fallback;
      }
      return CANONICAL_PDF;
    }
  }

  // 3. Not found — prompt the user
  const isInteractive = Boolean(process.stdin.isTTY);
  if (!isInteractive) {
    console.log(chalk.yellow("  ⚠️  No resume PDF found. Skipping file upload."));
    console.log(chalk.dim("     Copy your resume PDF to: ~/.careervivid/resume.pdf\n"));
    return null;
  }

  console.log(chalk.yellow("\n  📄 No resume PDF found."));
  console.log(chalk.dim("     The agent needs your PDF resume to upload during the application.\n"));

  const { pdfPath } = await prompt<{ pdfPath: string }>({
    type: "input",
    name: "pdfPath",
    message: "  Path to your resume PDF (e.g. ~/Downloads/JiawenZhu_Resume.pdf) or Enter to skip:",
  }).catch(() => ({ pdfPath: "" }));

  const resolved = ((pdfPath as any).pdfPath ?? pdfPath).trim();
  if (!resolved) {
    console.log(chalk.dim("  Skipping resume upload.\n"));
    return null;
  }

  // Expand ~ to home dir
  const expandedPath = resolved.startsWith("~/")
    ? join(homedir(), resolved.slice(2))
    : resolve(resolved);

  if (!existsSync(expandedPath)) {
    console.log(chalk.yellow(`  ⚠️  File not found: ${expandedPath} — skipping upload.\n`));
    return null;
  }

  // Copy to canonical location so future runs find it automatically
  try {
    ensureCareerVividDir();
    copyFileSync(expandedPath, CANONICAL_PDF);
    console.log(chalk.green(`  ✔ Resume saved to ~/.careervivid/resume.pdf (auto-found next time)\n`));
    return CANONICAL_PDF;
  } catch {
    // Copy failed — use the expanded path directly
    return expandedPath;
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function ensureCareerVividDir(): void {
  const dir = join(homedir(), ".careervivid");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
