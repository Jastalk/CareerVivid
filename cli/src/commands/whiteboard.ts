/**
 * cv whiteboard — create and publish Mermaid diagrams to CareerVivid
 *
 * Usage:
 *   cv whiteboard new                     Interactive wizard to scaffold a .mmd file
 *   cv whiteboard new --template flowchart Create a flowchart template
 *   cv whiteboard publish diagram.mmd      Publish an existing .mmd file
 *   cv whiteboard list-templates           List all available diagram templates
 */

import { existsSync, writeFileSync, readFileSync } from "fs";
import { resolve, basename, join } from "path";
import chalk from "chalk";
import boxen from "boxen";
import ora from "ora";
import { Command } from "commander";
import { publishPost, isApiError } from "../api.js";
import { printError, printSuccess, handleApiError } from "../output.js";
import { COLORS } from "../branding.js";
import { getApiKey } from "../config.js";

// ── Built-in Mermaid templates ────────────────────────────────────────────────

const TEMPLATES: Record<string, { description: string; content: string }> = {
    flowchart: {
        description: "Generic flowchart / process diagram",
        content: `flowchart TD
    A([Start]) --> B{Decision}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
    C --> E([End])
    D --> E`,
    },

    "system-arch": {
        description: "System architecture diagram (client → server → DB)",
        content: `graph LR
    subgraph Client
        Browser["🖥️ Browser / App"]
    end
    subgraph Backend
        API["⚡ API Server"]
        Queue["📬 Job Queue"]
    end
    subgraph Storage
        DB[("🗄️ Database")]
        Cache[("⚡ Redis Cache")]
        Files["📦 Object Storage"]
    end

    Browser -->|HTTPS| API
    API --> Cache
    API --> DB
    API --> Queue
    Queue --> Files`,
    },

    "tech-stack": {
        description: "Technology stack diagram",
        content: `graph TB
    subgraph Frontend
        UI["React / Next.js"]
        Styles["CSS / Tailwind"]
    end
    subgraph Backend
        Server["Node.js / Express"]
        Auth["Firebase Auth"]
    end
    subgraph Data
        DB[("Firestore")]
        Storage["Firebase Storage"]
    end
    subgraph Infra
        Deploy["Vercel / Cloud Run"]
        CDN["CDN"]
    end

    UI --> Server
    Server --> DB
    Server --> Storage
    UI --> CDN
    Deploy --> Server`,
    },

    "user-journey": {
        description: "User journey / sequence diagram",
        content: `sequenceDiagram
    actor User
    participant App
    participant API
    participant DB

    User->>App: Open app
    App->>API: GET /auth/session
    API-->>App: Session token
    User->>App: Submit form
    App->>API: POST /data
    API->>DB: Insert record
    DB-->>API: OK
    API-->>App: 201 Created
    App-->>User: Success message`,
    },

    "er-diagram": {
        description: "Entity-relationship (database schema) diagram",
        content: `erDiagram
    USER {
        string id PK
        string email
        string name
        datetime createdAt
    }
    POST {
        string id PK
        string userId FK
        string title
        string content
        datetime publishedAt
    }
    COMMENT {
        string id PK
        string postId FK
        string userId FK
        string body
    }

    USER ||--o{ POST : "writes"
    POST ||--o{ COMMENT : "has"
    USER ||--o{ COMMENT : "writes"`,
    },

    "git-flow": {
        description: "Git branching / release flow",
        content: `gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "feat: auth"
    branch feature/dashboard
    checkout feature/dashboard
    commit id: "add dashboard UI"
    commit id: "add charts"
    checkout develop
    merge feature/dashboard id: "merge dashboard"
    checkout main
    merge develop id: "v1.0.0 release" tag: "v1.0.0"`,
    },

    "ci-cd": {
        description: "CI/CD pipeline diagram",
        content: `flowchart LR
    Push["📤 Git Push"] --> CI

    subgraph CI ["CI Pipeline"]
        Lint["🔍 Lint"] --> Test["🧪 Tests"] --> Build["📦 Build"]
    end

    Build --> Gate{Branch?}
    Gate -->|main| Prod["🚀 Deploy Prod"]
    Gate -->|develop| Staging["🧪 Deploy Staging"]
    Gate -->|feature/*| Preview["👁️ Deploy Preview"]`,
    },

    "mindmap": {
        description: "Mind map / concept breakdown",
        content: `mindmap
    root((My Project))
        Frontend
            React Components
            State Management
            Routing
        Backend
            REST API
            Authentication
            Database
        DevOps
            CI/CD
            Monitoring
            Logging
        Features
            User Profiles
            Search
            Notifications`,
    },
};

const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// ── Helpers ───────────────────────────────────────────────────────────────────

function printTemplateList(): void {
    console.log("\n" + chalk.bold("Available Mermaid templates:") + "\n");
    for (const [name, { description }] of Object.entries(TEMPLATES)) {
        console.log(`  ${chalk.cyan(name.padEnd(18))} ${chalk.dim(description)}`);
    }
    console.log();
}

async function promptInteractive(): Promise<{ name: string; template: string }> {
    const enquirer = (await import("enquirer")) as any;
    const prompt = enquirer.default?.prompt || enquirer.prompt;

    const { template } = await prompt({
        type: "select",
        name: "template",
        message: "Choose a diagram template",
        choices: TEMPLATE_NAMES.map((t) => ({
            name: t,
            message: `${t.padEnd(18)} ${chalk.dim(TEMPLATES[t].description)}`,
        })),
    });

    const { name } = await prompt({
        type: "input",
        name: "name",
        message: "Output filename (without extension)",
        initial: `my-${template}`,
    });

    return { name: (name as string).trim() || `my-${template}`, template: template as string };
}

// ── Command Registration ──────────────────────────────────────────────────────

export function registerNewCommand(program: Command | any): void {
    program.command("new [filename]")
        .description("Scaffold a new Mermaid diagram file from a built-in template")
        .option(
            "--template <name>",
            `Template to use (${TEMPLATE_NAMES.join(" | ")})`,
        )
        .option("--print", "Print the template to stdout instead of writing a file")
        .action(async (filenameArg: string | undefined, opts: { template?: string; print?: boolean }) => {
            let templateKey: string;
            let filename: string;

            if (opts.template && !TEMPLATES[opts.template]) {
                printError(
                    `Unknown template "${opts.template}". Run ${chalk.cyan("cv list-templates")} to see available options.`,
                );
                process.exit(1);
            }

            if (opts.template && filenameArg) {
                // non-interactive: both template and filename provided
                templateKey = opts.template;
                filename = filenameArg.endsWith(".mmd") ? filenameArg : `${filenameArg}.mmd`;
            } else if (opts.template) {
                templateKey = opts.template;
                filename = `my-${opts.template}.mmd`;
            } else {
                // Interactive wizard
                const answers = await promptInteractive();
                templateKey = answers.template;
                filename = answers.name.endsWith(".mmd") ? answers.name : `${answers.name}.mmd`;
            }

            const content = TEMPLATES[templateKey].content;

            if (opts.print) {
                console.log(content);
                return;
            }

            const safeFilename = basename(filename);
            const outPath = join(process.cwd(), safeFilename);

            if (existsSync(outPath)) {
                printError(`File already exists: ${filename}. Choose a different name or delete it first.`);
                process.exit(1);
            }

            writeFileSync(outPath, content + "\n", "utf-8");

            const successBox = `
${chalk.bold("✔  Diagram scaffolded!")}

${chalk.dim("File:    ")} ${chalk.cyan(filename)}
${chalk.dim("Template:")} ${chalk.white(templateKey)}

${chalk.bold("Next steps:")}
1. Edit ${chalk.cyan(filename)} in your editor
2. Publish: ${chalk.green(`cv publish ${filename} --title "..."`)}
`;

            console.log(
                boxen(successBox.trim(), {
                    padding: 1,
                    margin: { top: 1, bottom: 1 },
                    borderStyle: "round",
                    borderColor: COLORS.success,
                })
            );
        });
}

export function registerListTemplatesCommand(program: Command | any): void {
    program.command("list-templates")
        .description("List all available Mermaid diagram templates")
        .action(() => {
            printTemplateList();
        });
}

export function registerWhiteboardCommand(program: Command): void {
    const wb = program
        .command("whiteboard")
        .description("Create and publish Mermaid diagram whiteboards to CareerVivid");

    // ── cv whiteboard new ─────────────────────────────────────────────────────
    registerNewCommand(wb);

    // ── cv whiteboard publish ─────────────────────────────────────────────────
    wb.command("publish <file>")
        .description("Publish a .mmd file to CareerVivid as a whiteboard post")
        .option("-t, --title <title>", "Diagram title (required)")
        .option("--tags <tags>", "Comma-separated tags, e.g. architecture,react")
        .option("--dry-run", "Validate without publishing")
        .option("--json", "Machine-readable JSON output")
        .action(async (file: string, opts: { title?: string; tags?: string; dryRun?: boolean; json?: boolean }) => {
            const jsonMode = !!opts.json;
            const dryRun = !!opts.dryRun;

            // Sanitize and resolve file path
            const safeFile = basename(file);
            const fullPath = join(process.cwd(), safeFile);

            // Read file
            let content: string;
            try {
                content = readFileSync(fullPath, "utf-8");
            } catch (err: any) {
                printError(`Cannot read file: ${err.message}`, undefined, jsonMode);
                process.exit(1);
            }

            if (!content.trim()) {
                printError("Diagram file is empty.", undefined, jsonMode);
                process.exit(1);
            }

            // Require title
            let title: string = opts.title || "";
            if (!title) {
                if (jsonMode) {
                    printError("--title is required when using --json.", undefined, true);
                    process.exit(1);
                }
                const enquirer = (await import("enquirer")) as any;
                const prompt = enquirer.default?.prompt || enquirer.prompt;
                const ans = await prompt({
                    type: "input",
                    name: "title",
                    message: "Diagram title",
                });
                title = (ans as any).title.trim();
            }

            const tags = opts.tags
                ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean)
                : [];

            const spinner = jsonMode || dryRun ? null : ora(`${dryRun ? "Validating" : "Publishing"} whiteboard...`).start();

            const result = await publishPost(
                { type: "whiteboard", dataFormat: "mermaid", title, content, tags },
                dryRun
            );
            spinner?.stop();

            if (isApiError(result)) {
                handleApiError(result, jsonMode);
            }

            printSuccess(
                {
                    Title: title,
                    URL: result.url,
                    "Post ID": result.postId,
                    ...(dryRun ? { Note: "Dry run — not published" } : {}),
                },
                jsonMode
            );
        });

    // ── cv whiteboard list-templates ──────────────────────────────────────────
    registerListTemplatesCommand(wb);
}
