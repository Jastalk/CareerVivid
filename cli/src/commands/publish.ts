/**
 * cv publish — publish content to CareerVivid
 *
 * Usage:
 *   cv publish <file>                     Publish a file
 *   cv publish -                          Read from stdin
 *   cv publish README.md --title "..."    Override title
 *   cv publish arch.mmd --type whiteboard --format mermaid
 *   cv publish - --dry-run < article.md  Validate without publishing
 *   cv publish - --json < article.md     Agent-friendly JSON output
 */

import { Command } from "commander";
import { readFileSync, lstatSync, readdirSync, writeFileSync } from "fs";
import { extname, join, basename, resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import type { PublishPayload, DataFormat, PostType } from "../api.js";
import { publishPost, isApiError } from "../api.js";
import { printError, printSuccess, handleApiError } from "../output.js";

function inferFormat(filePath: string): DataFormat {
    const ext = extname(filePath).toLowerCase();
    if ([".mmd", ".mermaid"].includes(ext)) return "mermaid";
    return "markdown";
}

function inferType(format: DataFormat): PostType {
    return format === "mermaid" ? "whiteboard" : "article";
}

async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

function getFiles(dir: string, recursive: boolean): string[] {
    let results: string[] = [];
    const list = readdirSync(dir);
    for (const file of list) {
        // Prevent traversing up
        if (file === ".." || file === ".") continue;
        const path = join(dir, basename(file));
        const stat = lstatSync(path);
        if (stat && stat.isDirectory()) {
            if (recursive) {
                results = results.concat(getFiles(path, recursive));
            }
        } else {
            const ext = extname(path).toLowerCase();
            if ([".md", ".mmd", ".mermaid"].includes(ext)) {
                results.push(path);
            }
        }
    }
    return results;
}

export interface PublishOptions {
    title?: string;
    type?: string;
    format?: string;
    tags?: string;
    cover?: string;
    official?: boolean;
    dryRun?: boolean;
    json?: boolean;
    recursive?: boolean;
    onlyUpdate?: boolean;
    public?: boolean;
    private?: boolean;
}

export async function publishSingleFile(
    filePath: string,
    content: string,
    opts: PublishOptions,
    jsonMode: boolean
): Promise<{ success: boolean; url?: string; postId?: string; title?: string }> {
    const dryRun = !!opts.dryRun;

    // ── Parse Frontmatter ───────────────────────────────────────────
    let postId: string | undefined = undefined;
    let frontmatterTags: string[] = [];
    let cleanContent = content;

    // Robust frontmatter extraction (multiline, flexible spacing)
    // Matches --- start, any non-greedy content, and --- end with optional whitespace/newlines
    const frontmatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
    if (frontmatterMatch) {
        const fm = frontmatterMatch[1];
        
        // Match postId with potential leading/trailing whitespace or quotes
        const idMatch = fm.match(/postId:\s*["']?([a-zA-Z0-9_-]+)["']?/i);
        postId = idMatch?.[1];

        // Match tags: [tag1, tag2] or tags: tag1, tag2
        const tagsMatch = fm.match(/tags:\s*(?:\[(.*?)\]|(.*))/i);
        if (tagsMatch) {
            const tagsStr = tagsMatch[1] || tagsMatch[2];
            frontmatterTags = tagsStr
                ?.split(",")
                .map(t => t.trim().replace(/^["']|["']$/g, ""))
                .filter(Boolean) || [];
        }
        
        // Remove the frontmatter block AND any trailing whitespace/newlines
        const afterFm = content.slice(frontmatterMatch[0].length);
        cleanContent = afterFm.replace(/^\s+/, "");
    }

    // Best Practice: Also look for "Tags: #tag1, #tag2" at the bottom of the article
    const footerTagsMatch = cleanContent.match(/Tags:\s*(.*)$/im);
    let footerTags: string[] = [];
    if (footerTagsMatch) {
        footerTags = footerTagsMatch[1]
            .split(/[,\s]+/)
            .map(t => t.trim().replace(/^#/, ""))
            .filter(Boolean);
    }

    // Fail if onlyUpdate is set but no postId is found
    if (opts.onlyUpdate && !postId) {
        if (!jsonMode) {
            console.error(chalk.red(`\n  ✖  Missing postId frontmatter in ${filePath}. Use 'cv publish' to create a new post.`));
        }
        return { success: false };
    }

    const format: DataFormat =
        (opts.format as DataFormat) ||
        (filePath !== "stdin" ? inferFormat(filePath) : "markdown");

    const type: PostType = (opts.type as PostType) || inferType(format);

    let title: string = opts.title || "";
    if (!title && format === "markdown") {
        const firstHeading = cleanContent.match(/^[#]{1,2}\s+(.+)$/m);
        if (firstHeading) {
            title = firstHeading[1].trim();
        }
    }

    if (!title) {
        if (jsonMode || filePath === "stdin") {
            // No interactive prompt for stdin or JSON mode
            title = filePath === "stdin" ? "Untitled Post" : filePath;
        } else {
            const enquirer = (await import("enquirer")) as any;
            const prompt = enquirer.default?.prompt || enquirer.prompt;
            const answers = await prompt({
                type: "input",
                name: "title",
                message: `Post title for ${chalk.cyan(filePath)}`,
            });
            title = (answers as any).title.trim();
        }
    }

    const tags = [
        ...frontmatterTags,
        ...footerTags,
        ...(opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [])
    ];

    // De-duplicate and limit to 5 tags
    const finalTags = [...new Set(tags)].slice(0, 5);

    const payload: PublishPayload = {
        type,
        dataFormat: format,
        title,
        content: cleanContent,
        tags: finalTags,
        ...(opts.cover ? { coverImage: opts.cover } : {}),
        ...(opts.official ? { isOfficialPost: true } : {}),
        ...(typeof opts.public !== "undefined" ? { isPublic: opts.public } : opts.private ? { isPublic: false } : {}),
    };

    let result;
    if (postId && !dryRun) {
        const { updatePost, getPost } = await import("../api.js");

        // Best Practice: Fetch remote title to verify identity before overwrite
        const remotePost = await getPost(postId);
        if (!isApiError(remotePost)) {
            const remoteTitle = remotePost.title;
            // Case-insensitive title comparison to catch potential mixups
            if (title && remoteTitle && title.toLowerCase() !== remoteTitle.toLowerCase()) {
                if (jsonMode) {
                    console.error(chalk.red(`\n  ✖  Title mismatch for ${postId}. Local: "${title}", Remote: "${remoteTitle}". Aborting.`));
                    return { success: false };
                } else {
                    const enquirer = (await import("enquirer")) as any;
                    const prompt = enquirer.default?.prompt || enquirer.prompt;
                    const answers = await prompt({
                        type: "confirm",
                        name: "confirm",
                        message: `Title Mismatch! Local: "${chalk.cyan(title)}", Remote: "${chalk.yellow(remoteTitle)}". Continue?`,
                        initial: false
                    });
                    if (!(answers as any).confirm) {
                        return { success: false };
                    }
                }
            }
        }

        result = await updatePost(postId, payload);
    } else {
        result = await publishPost(payload, dryRun);
    }

    if (isApiError(result)) {
        if (jsonMode) {
            handleApiError(result, true);
        } else {
            console.error(chalk.red(`\n  ✖  Failed to ${postId ? "update" : "publish"} ${filePath}: ${result.message}`));
        }
        return { success: false };
    }

    // ── Write back postId if it's new ────────────────────────────────
    if (!postId && !dryRun && filePath !== "stdin" && result.postId) {
        const newFm = `---\npostId: ${result.postId}\n---\n\n`;
        const updatedFileContent = newFm + content;
        try {
            // Ensure we are writing back to the safe path
            const safePath = join(process.cwd(), basename(filePath));
            writeFileSync(safePath, updatedFileContent, "utf-8");
        } catch (err) {
            // Non-fatal error
            if (!jsonMode) {
                console.warn(chalk.yellow(`  ⚠  Could not write postId to ${filePath}`));
            }
        }
    }

    return {
        success: true,
        url: result.url,
        postId: result.postId,
        title: title
    };
}

export function registerPublishCommand(program: Command): void {
    program
        .command("publish [files...]")
        .description(
            [
                "Publish files or directories to CareerVivid",
                "",
                "  cv publish article.md",
                "  cv publish docs/ --recursive",
                "  cv publish part1.md part2.md --tags series",
                "  cat article.md | cv publish - --title \"My Article\"",
            ].join("\n")
        )
        .option("-t, --title <title>", "Post title (per file, inferred if omitted)")
        .option("--type <type>", "Post type: article | whiteboard")
        .option("--format <format>", "Content format: markdown | mermaid")
        .option("--tags <tags>", "Comma-separated tags (max 5)")
        .option("--cover <url>", "URL to a cover image")
        .option("--official", "Publish as CareerVivid Community (admin only)")
        .option("--public", "Publish as public (default requires admin)", true)
        .option("--private", "Publish as private")
        .option("-r, --recursive", "Recursively scan directories")
        .option("--dry-run", "Validate without publishing")
        .option("--json", "Machine-readable JSON output")
        .action(async (files: string[], opts: PublishOptions) => {
            const jsonMode = !!opts.json;
            const dryRun = !!opts.dryRun;

            let fileList: string[] = [];

            if (files.length === 0 || files.includes("-")) {
                fileList = ["stdin"];
            } else {
                for (const arg of files) {
                    try {
                        const safeArg = basename(arg);
                        const fullPath = join(process.cwd(), safeArg);
                        const stat = lstatSync(fullPath);
                        if (stat.isDirectory()) {
                            fileList = fileList.concat(getFiles(fullPath, !!opts.recursive));
                        } else {
                            fileList.push(fullPath);
                        }
                    } catch (err: any) {
                        printError(`Cannot find path: ${arg}`, undefined, jsonMode);
                        process.exit(1);
                    }
                }
            }

            if (fileList.length === 0) {
                printError("No files found to publish.", undefined, jsonMode);
                process.exit(1);
            }

            if (!jsonMode && !dryRun) {
                console.log(`\n  ${chalk.bold("Preparing to publish")} ${chalk.cyan(fileList.length)} ${fileList.length === 1 ? "file" : "files"}...`);
            }

            const results: any[] = [];
            let successCount = 0;

            for (const filePath of fileList) {
                let content: string;
                if (filePath === "stdin") {
                    if (!jsonMode) console.log(`  ${chalk.dim("Reading from stdin... (Ctrl+D to finish)")}`);
                    content = await readStdin();
                } else {
                    content = readFileSync(filePath, "utf-8");
                }

                if (!content.trim()) {
                    if (!jsonMode) console.log(chalk.yellow(`  ⚠  Skipping empty file: ${filePath}`));
                    continue;
                }

                const spinner = (!jsonMode && !dryRun) ? ora(`Publishing ${chalk.cyan(filePath)}...`).start() : null;
                const res = await publishSingleFile(filePath, content, opts, jsonMode);
                spinner?.stop();

                if (res.success) {
                    successCount++;
                    results.push({ file: filePath, ...res });
                    if (!jsonMode && !dryRun) {
                        console.log(`  ${chalk.green("✔")}  Published: ${chalk.bold(res.title)}`);
                        console.log(`     ${chalk.dim(res.url)}`);
                    }
                }
            }

            if (jsonMode) {
                console.log(JSON.stringify(results, null, 2));
            } else if (!dryRun) {
                console.log(`\n  ${chalk.green("Done!")} Successfully published ${chalk.bold(successCount)} of ${chalk.bold(fileList.length)} files.\n`);
            } else {
                console.log(`\n  ${chalk.yellow("Dry run complete.")} Validated ${chalk.bold(fileList.length)} files.\n`);
            }
        });

    program
        .command("update [files...]")
        .description("Update existing content on CareerVivid (requires postId in frontmatter)")
        .option("-t, --title <title>", "Override post title")
        .option("--tags <tags>", "Comma-separated tags")
        .option("--dry-run", "Validate without updating")
        .option("--json", "Machine-readable output")
        .option("-r, --recursive", "Recursively scan directories")
        .action(async (files: string[], opts: any) => {
            const extendedOpts = { ...opts, onlyUpdate: true };
            const jsonMode = !!opts.json;
            const dryRun = !!opts.dryRun;

            let fileList: string[] = [];
            if (files.length === 0) {
                printError("No files specified to update.", undefined, jsonMode);
                process.exit(1);
            }

            for (const arg of files) {
                try {
                    const safeArg = basename(arg);
                    const fullPath = join(process.cwd(), safeArg);
                    const stat = lstatSync(fullPath);
                    if (stat.isDirectory()) {
                        fileList = fileList.concat(getFiles(fullPath, !!opts.recursive));
                    } else {
                        fileList.push(fullPath);
                    }
                } catch (err: any) {
                    printError(`Cannot find path: ${arg}`, undefined, jsonMode);
                    process.exit(1);
                }
            }

            if (!jsonMode && !dryRun) {
                console.log(`\n  ${chalk.bold("Preparing to update")} ${chalk.cyan(fileList.length)} ${fileList.length === 1 ? "file" : "files"}...`);
            }

            const results: any[] = [];
            let successCount = 0;

            for (const filePath of fileList) {
                const content = readFileSync(filePath, "utf-8");
                const spinner = (!jsonMode && !dryRun) ? ora(`Updating ${chalk.cyan(filePath)}...`).start() : null;
                const res = await publishSingleFile(filePath, content, extendedOpts, jsonMode);
                spinner?.stop();

                if (res.success) {
                    successCount++;
                    results.push({ file: filePath, ...res });
                    if (!jsonMode && !dryRun) {
                        console.log(`  ${chalk.green("✔")}  Updated: ${chalk.bold(res.title)}`);
                        console.log(`     ${chalk.dim(res.url)}`);
                    }
                }
            }

            if (jsonMode) {
                console.log(JSON.stringify(results, null, 2));
            } else if (!dryRun) {
                console.log(`\n  ${chalk.green("Done!")} Successfully updated ${chalk.bold(successCount)} of ${chalk.bold(fileList.length)} files.\n`);
            }
        });
}

