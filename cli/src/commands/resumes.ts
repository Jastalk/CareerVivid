import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import ora from "ora";
import {
    isApiError,
    resumesList,
    resumeGet,
    resumeUpdate,
    resumeDelete
} from "../api.js";
import { printError } from "../output.js";

async function prompt<T = Record<string, any>>(questions: object[]): Promise<T> {
    const { default: Enquirer } = await import("enquirer" as any);
    const enq = new Enquirer();
    return enq.prompt(questions) as Promise<T>;
}

export function registerResumesCommand(program: Command) {
    const resumesCmd = program
        .command("resumes")
        .description("Manage your AI-parsed resumes (list, get, create, tailor, delete)");

    // ── cv resumes create ────────────────────────────────────────────────────────
    resumesCmd
        .command("create")
        .description("Generate a structured resume from free-form text")
        .option("-t, --title <title>", "Resume title")
        .option("-f, --file <path>", "Local text file to parse")
        .option("-c, --content <text>", "Raw text content to parse")
        .option("--json", "Output raw JSON")
        .action(async (opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            let { title, file, content } = opts;

            if (!content && file) {
                const fs = await import("fs");
                content = fs.readFileSync(file, "utf-8");
            }

            if (!content) {
                const { text } = await prompt<{ text: string }>([{
                    type: "input",
                    name: "text",
                    message: "Paste your raw resume text or job experience details:"
                }]);
                content = text;
            }

            if (!content) {
                printError("Content is required.", undefined, isJson);
                process.exit(1);
            }

            const spinner = ora("AI is parsing and structuring your resume…").start();
            const { resumeCreate } = await import("../api.js");
            const result = await resumeCreate({ title, baseContent: content });

            if (isApiError(result)) {
                spinner.fail("Failed to create resume.");
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            spinner.succeed(`Resume created: ${result.title} (ID: ${result.resumeId})`);

            if (isJson) {
                console.log(JSON.stringify(result));
            }
        });

    // ── cv resumes list ──────────────────────────────────────────────────────────
    resumesCmd
        .command("list")
        .description("List your stored resumes")
        .option("--json", "Output raw JSON")
        .action(async (opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            const spinner = isJson ? undefined : ora("Fetching resumes…").start();
            
            const result = await resumesList();
            if (isApiError(result)) {
                spinner?.fail("Failed to list resumes.");
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            const { resumes, total } = result;
            spinner?.succeed(`Found ${total} resume(s)`);

            if (isJson) {
                console.log(JSON.stringify(result));
                return;
            }

            if (total === 0) {
                console.log(chalk.yellow("\n  You don't have any resumes. Upload one down via the CareerVivid web app.\n"));
                return;
            }

            console.log(`\n${chalk.bold("  Your Resumes")}\n`);
            resumes.forEach((r, i) => {
                const date = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "";
                console.log(`  ${chalk.dim(`${i + 1}.`)} ${chalk.cyan(r.title)} ${chalk.dim(`(ID: ${r.id})`)} ${date ? chalk.dim(`· ${date}`) : ""}`);
            });
            console.log();
        });

    // ── cv resumes get ────────────────────────────────────────────────────────
    resumesCmd
        .command("get [id]")
        .description("Get a resume by ID or latest if no ID given")
        .option("--json", "Output raw JSON")
        .action(async (id, opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            const spinner = isJson ? undefined : ora("Fetching resume…").start();

            const result = await resumeGet(id);
            if (isApiError(result)) {
                spinner?.fail("Failed to get resume.");
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            spinner?.succeed(`Resume loaded: ${result.title}`);

            if (isJson) {
                console.log(JSON.stringify(result));
                return;
            }

            console.log(
                boxen(
                    `${chalk.bold.cyan(result.title)}\n` +
                    `${chalk.dim("ID: " + result.resumeId)}\n` +
                    `${chalk.dim("Updated: " + (result.updatedAt || "N/A"))}\n\n` +
                    result.cvMarkdown,
                    { padding: 1, borderStyle: "round" }
                )
            );
        });

    // ── cv resumes tailor ─────────────────────────────────────────────────────
    resumesCmd
        .command("tailor")
        .description("Tailor a resume to a job description or refine it with instructions")
        .requiredOption("--id <id>", "Resume ID to tailor")
        .option("--jd <text>", "Job description to target")
        .option("--instruction <text>", "Instruction to refine the resume")
        .option("--new-title <title>", "Save with a new title")
        .option("--copy", "Create a copy instead of updating in-place")
        .option("--json", "Output raw JSON")
        .action(async (opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            
            if (!opts.jd && !opts.instruction) {
                printError("You must provide either --jd or --instruction.", undefined, isJson);
                process.exit(1);
            }

            const action = opts.jd && !opts.instruction ? "tailor" : "refine";
            const spinner = ora(`Applying AI updates using action: ${action}…`).start();
            
            const result = await resumeUpdate({
                resumeId: opts.id,
                action,
                jobDescription: opts.jd,
                instruction: opts.instruction,
                newTitle: opts.newTitle,
                copy: opts.copy
            });

            if (isApiError(result)) {
                spinner.fail("AI update failed.");
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            spinner.succeed("Resume tailored successfully!");

            if (isJson) {
                console.log(JSON.stringify(result));
                return;
            }

            console.log(`  ${chalk.green("✔")} ${result.message} (ID: ${result.resumeId})\n`);
        });

    // ── cv resumes delete ─────────────────────────────────────────────────────
    resumesCmd
        .command("delete <id>")
        .description("Delete a resume")
        .option("--force", "Bypass confirmation prompt")
        .option("--json", "Output raw JSON")
        .action(async (id, opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            
            if (!opts.force && !isJson) {
                const { confirm } = await prompt<{ confirm: boolean }>([{
                    type: "confirm",
                    name: "confirm",
                    message: `Are you sure you want to delete resume ${id}?`,
                    initial: false
                }]);
                if (!confirm) {
                    console.log(chalk.dim("Deletion cancelled."));
                    process.exit(0);
                }
            }

            const spinner = ora("Deleting resume…").start();
            
            const result = await resumeDelete({ resumeId: id });
            if (isApiError(result)) {
                spinner.fail("Failed to delete resume.");
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            spinner.succeed("Resume deleted!");

            if (isJson) {
                console.log(JSON.stringify(result));
                return;
            }
            console.log(`  ${chalk.green("✔")} ${result.message}\n`);
        });
}
