import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(pc.dim("·"), msg),
  ok: (msg: string) => console.log(pc.green("✓"), msg),
  warn: (msg: string) => console.log(pc.yellow("!"), msg),
  error: (msg: string) => console.error(pc.red("✗"), msg),
  heading: (msg: string) => console.log("\n" + pc.green(pc.bold(msg))),
  planned: (relPath: string, target?: string) => {
    const suffix = target ? ` → ${target}` : "";
    console.log(pc.cyan("→"), `would write ${relPath}${suffix}`);
  },
};
