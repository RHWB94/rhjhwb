import { cp, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const siteRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(siteRoot, 'dist');
const pages = ['index', 'teachers', 'courses', 'achievements', 'faq', 'recruit', 'recruit-closed'];
const staticPaths = [
  'script.js',
  'courses.js',
  'achievements.js',
  'assets',
  'course-photo',
  'teachers-photo',
  'Newbie',
  '22_23concert',
  'favicon.ico',
  'favicon.png',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
  'google4312605113fb2fdd.html',
];

function resolveInside(root, entry) {
  const path = resolve(root, entry);
  const fromRoot = relative(root, path);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`Site build path must stay inside ${root}: ${entry}`);
  }
  return path;
}

export default defineConfig({
  root: siteRoot,
  base: './',
  build: {
    outDir: outputRoot,
    rolldownOptions: {
      input: Object.fromEntries(pages.map((page) => [page, resolveInside(siteRoot, `${page}.html`)])),
    },
  },
  plugins: [{
    name: 'copy-static-site-files',
    apply: 'build',
    async closeBundle() {
      await mkdir(outputRoot, { recursive: true });
      for (const entry of staticPaths) {
        await cp(resolveInside(siteRoot, entry), resolveInside(outputRoot, entry), { recursive: true });
      }
    },
  }],
});
