// Vice Tracker — a GTA 6 trophy guide and tracker (Node 22, standard library
// only). The guide is this directory's app/ folder: plain static files a
// browser opens at app/index.html (ES modules, CSS, no build step), offline:
// it loads nothing over the network, and its trophy list and guides are
// app/data/trophies.json — all 55 official trophies with a guide in our own
// words and cited sources, a roadmap to the platinum, a spoiler setting and a
// checklist saved in localStorage. This program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (your screenshots, the
// first load's files and bytes, and your source), with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p /tmp/gta6-trophy-guide-01-out && MAKEFUN_OUTPUT_DIR=/tmp/gta6-trophy-guide-01-out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly, before copying anything, when the entry is incomplete: the
// guide's index page must exist and there must be 3 or 4 screenshots, the
// first of which by name is the cover. A half-built entry must never hand in.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('vice-tracker: app/index.html is missing');
}
const shotFiles = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => statSync(join(here, 'screenshots', f)).isFile())
  : [];
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`vice-tracker: expected 3 or 4 screenshots, found ${shotFiles.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// One line on stdout so a run's result is visible in the log without opening
// the dossier: the guide, its screenshots (cover first) and the dossier size.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`vice-tracker: wrote ${out} — ${shotFiles.length} screenshots (cover ${shotFiles.slice().sort()[0]}), dossier.json ${dossierBytes} bytes`);
