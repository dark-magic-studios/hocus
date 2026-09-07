import * as readline from "node:readline";

/**
 * Ask a yes/no question on stdin. Returns `fallback` on non-TTY, empty answer,
 * or unrecognised input.
 */
export function confirmYesNo(question: string, fallback: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const suffix = fallback ? " [Y/n]: " : " [y/N]: ";
    rl.question(`${question}${suffix}`, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "y" || a === "yes") {
        resolve(true);
        return;
      }
      if (a === "n" || a === "no") {
        resolve(false);
        return;
      }
      if (a !== "") {
        console.log(`Unrecognised answer "${answer}" — defaulting to ${fallback ? "yes" : "no"}.`);
      }
      resolve(fallback);
    });
  });
}
