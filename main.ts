// Salvage Drift — the entrypoint (Node 22, standard library only).
// The grader runs this program in a sandbox: it copies the game's static
// files and the screenshots into /output and writes the dossier the judge
// reads, using make.fun's vendored library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) return;
  cpSync(src, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

// The caps mirror the scorer's own limits, so a dossier that builds here is
// one the gate accepts: at most 160 KiB of source text, 4 screenshots of at
// most 256 KiB each, and the game's file count and bytes within bounds.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
