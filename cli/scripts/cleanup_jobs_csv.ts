/**
 * scripts/cleanup_jobs_csv.ts
 *
 * One-time cleanup for jobs.csv — removes hallucinated entries, deduplicates,
 * and fixes corrupted salary fields.
 *
 * Usage:
 *   cd cli
 *   npx ts-node --esm scripts/cleanup_jobs_csv.ts
 *
 * Runs in DRY RUN by default. Pass --write to apply changes.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

// ── Locate jobs.csv ──────────────────────────────────────────────────────────
function getCsvPath(): string {
  const candidates = [
    resolve(process.cwd(), "../career-vivid/data/jobs.csv"),
    resolve(process.cwd(), "career-vivid/data/jobs.csv"),
    resolve(homedir(), ".careervivid/jobs.csv"),
  ];
  for (const p of candidates) { if (existsSync(p)) return p; }
  throw new Error("Could not locate jobs.csv");
}

// ── Known hallucinated / unverifiable company names ──────────────────────────
const HALLUCINATED_COMPANIES = new Set([
  "InnovateX Solutions",
  "InnovateCore Solutions",
  "InnovateAI Solutions",
  "Innovatech Labs",
  "SynthAI Labs",
  "DataGenius",
  "DataSync Solutions",
  "DataSynth AI",
  "AIWorks",
  "NexusAI",
  "QuantumFlow AI",
  "SkyMind AI",
  "IntegrateX",
  "TechSolutions Inc.",
  "Aether Systems",
  "AI-Driven SaaS Startup",
  "Brightspark Labs",
  "CogniServe",
  "GenTech AI",
  "Global Tech Solutions",
  "InnovateAI Solutions",
  "QuantumFlow AI",
  "Rad AI",
  "SkyMind AI",
  "SynthAI Labs",
  "Synapse Tech",
  "Veridian AI",
  "BCG X",  // unverifiable for this specific role
  "Joel Schwarzmann (Network)",  // personal contact, not a job posting
  "Contracting Company",  // generic placeholder
]);

// ── CSV parse/serialize ───────────────────────────────────────────────────────
function splitLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseCsv(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = raw.split("\n").filter(l => l.trim());
  const headers = splitLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  });
  return { headers, rows };
}

function serializeCsv(headers: string[], rows: Record<string, string>[]): string {
  const toLine = (row: Record<string, string>) =>
    headers.map(h => {
      const v = row[h] ?? "";
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",");
  return [headers.join(","), ...rows.map(toLine)].join("\n") + "\n";
}

// ── Fix salary field (strip anything after first non-numeric run) ─────────────
function fixSalary(val: string): string {
  if (!val) return "";
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? "" : String(Math.round(num));
}

// ── Main ─────────────────────────────────────────────────────────────────────
const dryRun = !process.argv.includes("--write");
const csvPath = getCsvPath();
const raw = readFileSync(csvPath, "utf-8");
const { headers, rows } = parseCsv(raw);

console.log(`\n🔍 Cleanup Report — ${rows.length} rows in ${csvPath}`);
console.log(`   Mode: ${dryRun ? "DRY RUN (pass --write to apply)" : "WRITE MODE"}`);
console.log("─".repeat(62));

const removed: string[] = [];
const dupesSeen = new Map<string, string>();
const kept: Record<string, string>[] = [];

for (const row of rows) {
  const company = row.company?.trim() ?? "";
  const role = row.role?.trim() ?? "";
  const id = row.id?.trim() ?? "";

  // Remove hallucinated companies
  if (HALLUCINATED_COMPANIES.has(company)) {
    console.log(`  🗑️  REMOVE (hallucinated) [${id}] ${company} — ${role}`);
    removed.push(id);
    continue;
  }

  // Remove duplicates (keep first occurrence with most non-empty fields)
  const key = `${company.toLowerCase()}|${role.toLowerCase()}`;
  if (dupesSeen.has(key)) {
    console.log(`  🔁 REMOVE (duplicate)    [${id}] ${company} — ${role}  (kept: ${dupesSeen.get(key)})`);
    removed.push(id);
    continue;
  }
  dupesSeen.set(key, id);

  // Fix corrupted salary fields
  const origMin = row.salary_min;
  const origMax = row.salary_max;
  row.salary_min = fixSalary(row.salary_min);
  row.salary_max = fixSalary(row.salary_max);
  if (origMin !== row.salary_min || origMax !== row.salary_max) {
    console.log(`  💸 FIX salary [${id}] ${company}: min "${origMin}"→"${row.salary_min}"  max "${origMax}"→"${row.salary_max}"`);
  }

  // Truncate notes >500 chars
  if (row.notes && row.notes.length > 500) {
    console.log(`  ✂️  TRUNCATE notes [${id}] ${company} (${row.notes.length} chars → 500)`);
    row.notes = row.notes.slice(0, 500);
  }

  kept.push(row);
}

console.log("─".repeat(62));
console.log(`\n  Before: ${rows.length} rows`);
console.log(`  After:  ${kept.length} rows  (removed ${removed.length})`);
console.log(`  IDs removed: ${removed.join(", ") || "none"}`);

if (!dryRun) {
  // Backup before write
  copyFileSync(csvPath, csvPath + ".cleanup-bak");
  console.log(`\n  💾 Backup saved to: ${csvPath}.cleanup-bak`);
  writeFileSync(csvPath, serializeCsv(headers, kept), "utf-8");
  console.log(`  ✅ Written ${kept.length} rows to ${csvPath}`);
} else {
  console.log(`\n  ℹ️  Dry run complete. Run with --write to apply changes.`);
}
console.log();
