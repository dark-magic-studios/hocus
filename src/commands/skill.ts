import { runAdd } from "./add.js";

export interface SkillAddOptions {
  repoRoot: string;
  name: string;
  from?: string;
}

export async function runSkillAdd({ repoRoot, name, from }: SkillAddOptions): Promise<void> {
  await runAdd({
    repoRoot,
    skill: name,
    from,
    local: true,
  });
}
