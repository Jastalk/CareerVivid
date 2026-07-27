import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { checkGwsReady, runGwsCommand } from "../utils/gws-runner.js";
import { printError, printSuccess } from "../output.js";

export function registerProfileCommand(program: Command) {
    const profileCmd = program
        .command("profile")
        .description("Manage your CareerVivid developer profile and resume");

    profileCmd
        .command("export")
        .description("Export your resume data to external formats")
        .argument("[file]", "Path to local resume.json (uses mock data if omitted)")
        .requiredOption("--format <fmt>", "Format to export (e.g., 'gdoc')")
        .action(async (file, options) => {
            const isJson = process.argv.includes("--json");

            if (options.format.toLowerCase() !== "gdoc") {
                printError("Currently only '--format gdoc' is supported by this integration.", undefined, isJson);
                process.exit(1);
            }

            if (!isJson) {
                console.log(`\n  ${chalk.bold("Exporting CareerVivid Resume to Google Docs")}\n`);
            }

            // 1. Verify GWS CLI is available
            const isReady = await checkGwsReady();
            if (!isReady) {
                printError("Google Workspace CLI is not configured. Run 'cv workspace check'.", undefined, isJson);
                process.exit(1);
            }

            // 2. Load Resume Data
            let resumeData = {
                name: "Alex Dev",
                title: "Senior Full Stack Engineer",
                summary: "Passionate developer building AI-first tools.",
                experience: [
                    { role: "Software Engineer", company: "Tech Corp", years: "2022 - Present" }
                ]
            };

            let safeFile = "";
            if (file) {
                safeFile = path.basename(file);
                const fullPath = path.join(process.cwd(), safeFile);
                if (fs.existsSync(fullPath)) {
                    try {
                        resumeData = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                    } catch (err: any) {
                        printError(`Failed to parse resume file: ${err.message}`, undefined, isJson);
                        process.exit(1);
                    }
                } else {
                    printError(`File not found: ${fullPath}`, undefined, isJson);
                    process.exit(1);
                }
            }

            const title = `${resumeData.name.replace(/ /g, "_")}_Resume_Export`;

            // 3. Create the Google Doc
            const createSpinner = ora("Creating new Google Doc...").start();
            const createRes = await runGwsCommand(`docs documents create --json '{"title": "${title}"}'`);

            if (!createRes.success || !createRes.data?.documentId) {
                createSpinner.fail("Failed to create Google Doc.");
                printError(createRes.error || "Unknown error", undefined, isJson);
                process.exit(1);
            }
            createSpinner.succeed("Created base document.");
            const docId = createRes.data.documentId;

            // 4. Construct Content (Batch Update)
            const contentSpinner = ora("Formatting resume content...").start();

            // Text to insert (plain text for simplicity in this demo)
            const textToInsert = `${resumeData.name}\n${resumeData.title}\n\nSUMMARY:\n${resumeData.summary}\n\nEXPERIENCE:\n` +
                resumeData.experience.map(e => `- ${e.role} at ${e.company} (${e.years})`).join("\n");

            // Google Docs API uses a specific JSON structure for insertions
            const batchPayload = {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: textToInsert
                        }
                    }
                ]
            };

            // Needs precise escaping for bash if passing directly, or we save to tmp file and pass path. 
            // For simplicity, we'll strip single quotes from the payload if any exist.
            const cleanPayload = JSON.stringify(batchPayload).replace(/'/g, "");

            const updateRes = await runGwsCommand(`docs documents batchUpdate --params '{"documentId": "${docId}"}' --json '${cleanPayload}'`);

            if (!updateRes.success) {
                contentSpinner.fail("Failed to insert content.");
                printError(updateRes.error || "Unknown error", undefined, isJson);
                process.exit(1);
            }
            contentSpinner.succeed("Resume content injected.");

            // 5. Output Result
            const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

            if (isJson) {
                console.log(JSON.stringify({ success: true, url: docUrl, documentId: docId }));
            } else {
                console.log(
                    boxen(
                        `${chalk.bold.green("✔ Export Complete!")}\n\n` +
                        `Your resume has been successfully generated in Google Docs:\n` +
                        `${chalk.cyan.underline(docUrl)}`,
                        { padding: 1, borderStyle: "round" }
                    )
                );
            }
        });
}
