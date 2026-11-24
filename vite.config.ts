import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** After the build, write the build id and every emitted file into dist/sw.js so the app works fully offline. */
function precacheManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pitchpulse-precache',
    apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split(sep).join('/'));
        }
      };
      walk(outDir);
      const list = ['./', ...files.filter(f => f !== 'sw.js' && !f.endsWith('.map')).map(f => `./${f}`)];
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace('__PP_BUILD__', Date.now().toString(36))
        .replace('/*__PP_PRECACHE__*/[]', JSON.stringify(list));
      writeFileSync(swPath, sw);
    }
  };
}

// base './' keeps the build portable (GitHub Pages sub-paths, file servers).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), precacheManifest()],
  worker: { format: 'es' }
});
