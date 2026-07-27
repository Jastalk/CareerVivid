import { Command } from "commander";
import chalk from "chalk";
import { clearSession, loadConfig } from "../config.js";

export function registerLogoutCommand(program: Command) {
  program
    .command("logout")
    .description("Log out and clear your saved CareerVivid credentials")
    .option("--json", "Machine-readable output")
    .action((options) => {
      const cfg = loadConfig();

      if (!cfg.apiKey) {
        const msg = "You are not currently logged in.";
        if (options.json) {
          console.log(JSON.stringify({ status: "not_logged_in", message: msg }));
        } else {
          console.log(chalk.yellow(`\n  ⚠  ${msg}\n`));
        }
        return;
      }

      clearSession();

      if (options.json) {
        console.log(JSON.stringify({ status: "logged_out" }));
      } else {
        console.log(`
  ${chalk.green("✔")}  Logged out of CareerVivid.

  ${chalk.dim("Your LLM provider settings and config have been preserved.")}
  ${chalk.dim("Credentials cleared: apiKey, sessionCreatedAt")}

  To log back in:
    ${chalk.cyan("cv login")}
`);
      }
    });
}
