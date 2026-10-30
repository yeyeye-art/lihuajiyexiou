import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, '_site');
const base = '/lihuajiyexiou/';
const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let verified = 0;

function verifyDirectory(relative) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const item = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      verifyDirectory(item);
    } else {
      const built = path.join(output, item);
      assert(fs.existsSync(built), `Missing static file: ${item}`);
      assert.equal(digest(built), digest(path.join(root, item)), `Changed static file: ${item}`);
      verified++;
    }
  }
}

for (const directory of ['assets', 'content']) verifyDirectory(directory);
for (const file of ['index.html', '.nojekyll', '404.html', 'sw.js', 'registerSW.js', 'face.html']) {
  assert(fs.existsSync(path.join(output, file)), `Missing Pages entry: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.webmanifest'), 'utf8'));
const manifestUrl = new URL(`https://example.invalid${base}manifest.webmanifest`);
for (const key of ['start_url', 'scope', 'id']) {
  assert.equal(new URL(manifest[key], manifestUrl).pathname, base, `Wrong manifest ${key}`);
}
for (const icon of manifest.icons) {
  assert(!icon.src.startsWith('/'), 'Manifest icons must use relative paths');
  assert(fs.existsSync(path.join(output, icon.src)), `Missing manifest icon: ${icon.src}`);
}

const registration = fs.readFileSync(path.join(output, 'registerSW.js'), 'utf8');
assert(registration.includes(`${base}sw.js`), 'Service worker uses the wrong base');
assert(registration.includes(`scope: '${base}'`), 'Service worker uses the wrong scope');
const index = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
assert(index.includes(`${base}assets-app/`), 'Vite entry is outside the Pages subdirectory');
assert(!/(?:src|href)=["']\/assets\//.test(index), 'Root-absolute asset URL in index');
const site = JSON.parse(fs.readFileSync(path.join(output, 'content/site.json'), 'utf8'));
assert.equal(site.repository, 'https://github.com/yeyeye-art/lihuajiyexiou');
console.log(`Verified Pages base, manifest, SW scope and ${verified} byte-identical static files.`);
