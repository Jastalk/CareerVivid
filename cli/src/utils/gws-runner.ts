import { exec } from "child_process";
import { promisify } from "util";
import ora from "ora";

const execAsync = promisify(exec);

export type GwsResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Executes a GWS CLI command, preferring a globally installed binary,
 * falling back to npx if not found.
 *
 * @param command - The GWS command string (e.g., 'drive files list --params "..."')
 * @returns Parsed JSON response from GWS
 */
export async function runGwsCommand<T = any>(command: string): Promise<GwsResponse<T>> {
    let baseCmd = 'gws';

    // Check if gws is available globally
    try {
        await execAsync('command -v gws');
    } catch {
        // Fallback to npx if gws is not in PATH
        baseCmd = 'npx --yes @googleworkspace/cli';
    }

    try {
        const fullCmd = `${baseCmd} ${command}`;
        const { stdout, stderr } = await execAsync(fullCmd);

        // GWS outputs JSON on stdout
        try {
            const data = JSON.parse(stdout.trim());
            return { success: true, data };
        } catch (parseError) {
            // Sometimes there's non-JSON output before the JSON
            // Try to extract JSON if possible, or just return raw
            return { success: true, data: stdout.trim() as any };
        }
    } catch (error: any) {
        // GWS errors usually contain stderr
        let errorMsg = error.stderr || error.message;
        try {
            // Attempt to parse structured error from output if present
            const parsedErr = JSON.parse(error.stdout || "{}");
            if (parsedErr.error && parsedErr.error.message) {
                errorMsg = parsedErr.error.message;
            }
        } catch (_) { }

        return { success: false, error: errorMsg };
    }
}

/**
 * Interactive check to ensure GWS is installed and authenticated.
 */
export async function checkGwsReady(): Promise<boolean> {
    const spinner = ora("Checking Google Workspace CLI (gws) connection...").start();

    // Check if installed
    try {
        await execAsync('command -v gws');
    } catch {
        // If not installed globally, check if we can run it via npx
        try {
            await execAsync('npx --yes @googleworkspace/cli --version');
        } catch {
            spinner.fail("Google Workspace CLI not found.");
            return false;
        }
    }

    // Check auth by doing a simple safe call
    // getting the user's gmail profile is a good token check
    const result = await runGwsCommand("gmail users getProfile --params '{\"userId\": \"me\"}'");

    if (result.success && result.data && result.data.emailAddress) {
        spinner.succeed(`GWS CLI is ready! Authenticated as ${result.data.emailAddress}`);
        return true;
    } else {
        spinner.fail("GWS CLI is installed but not authenticated, or missing Gmail scopes.");
        return false;
    }
}
