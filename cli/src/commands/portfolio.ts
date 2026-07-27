import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as api from "../api.js";
import { printSuccess, printError } from "../output.js";

export function registerPortfolioCommand(program: Command) {
    const portfolioCmd = program
        .command("portfolio")
        .description("Manage your CareerVivid developer portfolio");

    portfolioCmd
        .command("init")
        .description("Create a foundational portfolio site")
        .option("-t, --title <title>", "Brand title for the portfolio")
        .option("--template <name>", "Template ID (e.g. minimalist, developer)")
        .action(async (options) => {
            const isJson = process.argv.includes("--json");
            if (!isJson) console.log("Initializing your CareerVivid portfolio...");

            const result = await api.initPortfolio(options.title, options.template);

            if (api.isApiError(result)) {
                printError(`Init failed: ${result.message}`, result.fields, isJson);
                process.exit(1);
            }

            printSuccess({ "URL": result.url, "ID": result.portfolioId }, isJson);
            if (!isJson) console.log(`\nYou can now use AI agents via MCP to sync projects to this ID.`);
        });

    portfolioCmd
        .command("add-project")
        .description("Sync project data to a portfolio")
        .argument("<file>", "Path to a JSON file containing an array of project objects")
        .requiredOption("--id <id>", "The portfolio ID to update")
        .action(async (file, options) => {
            const isJson = process.argv.includes("--json");

            const safeFile = path.basename(file);
            const fullPath = path.join(process.cwd(), safeFile);

            if (!fs.existsSync(fullPath)) {
                printError(`File not found: ${fullPath}`, undefined, isJson);
                process.exit(1);
            }

            let data;
            try {
                data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
            } catch (err: any) {
                printError(`Error parsing JSON: ${err.message}`, undefined, isJson);
                process.exit(1);
            }

            const projects = Array.isArray(data) ? data : [data];
            if (!isJson) console.log(`Syncing ${projects.length} project(s) to portfolio ${options.id}...`);

            const result = await api.updatePortfolioProjects(options.id, projects);

            if (api.isApiError(result)) {
                printError(`Sync failed: ${result.message}`, result.fields, isJson);
                process.exit(1);
            }

            printSuccess({ "Message": "Projects successfully synced to portfolio!" }, isJson);
        });

    portfolioCmd
        .command("preview")
        .description("Get a preview URL for your active portfolio")
        .requiredOption("--id <id>", "The portfolio ID")
        .action((options) => {
            const isJson = process.argv.includes("--json");
            printSuccess({ "URL": `https://careervivid.app/portfolio/edit/${options.id}` }, isJson);
        });

    portfolioCmd
        .command("publish")
        .description("Mark your drafts as live")
        .action(() => {
            const isJson = process.argv.includes("--json");
            if (!isJson) console.log("Publishing via CLI is mocked for now. Real-time syncs apply immediately on the web.");
            printSuccess({ "Message": "Portfolio synced to live!" }, isJson);
        });
}
