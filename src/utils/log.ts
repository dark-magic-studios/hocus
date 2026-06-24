import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(pc.dim("·"), msg),
  ok: (msg: string) => console.log(pc.green("✓"), msg),
  warn: (msg: string) => console.log(pc.yellow("!"), msg),
  error: (msg: string) => console.error(pc.red("✗"), msg),
  heading: (msg: string) => console.log("\n" + pc.bold(msg)),
};
