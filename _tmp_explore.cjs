const fs = require('fs');
const path = require('path');

function walk(dir, maxDepth = 2, depth = 0) {
  if (depth > maxDepth) return [];
  let results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push({ path: full, type: 'dir', depth });
        results = results.concat(walk(full, maxDepth, depth + 1));
      } else {
        results.push({ path: full, type: 'file', depth });
      }
    }
  } catch (e) {}
  return results;
}

console.log('=== FRONTEND STRUCTURE (src/pages/admin, src/components, src/lib/api, App.tsx) ===\n');
const feRoot = 'frontend/src';

// App.tsx
try { console.log('--- frontend/src/App.tsx (first 80 lines) ---');
  const app = fs.readFileSync(feRoot + '/App.tsx', 'utf8').split('\n');
  app.slice(0, 80).forEach((l, i) => console.log((i + 1) + ': ' + l));
} catch (e) { console.log('App.tsx not found at', feRoot); }

console.log('\n=== admin pages ===');
const adminDir = feRoot + '/pages/admin';
try {
  fs.readdirSync(adminDir).forEach(f => console.log('  ' + f));
} catch (e) { console.log('  (no admin dir at', adminDir + ')'); }

console.log('\n=== sidebar/layout files ===');
try {
  function findLayout(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) findLayout(full);
      else if (/sidebar|layout|nav|shell/i.test(e.name)) console.log('  ' + full);
    }
  }
  findLayout(feRoot);
} catch (e) {}

console.log('\n=== api/http lib ===');
try {
  for (const f of fs.readdirSync(feRoot + '/lib')) {
    if (/api|http|request|client/i.test(f)) console.log('  lib/' + f);
  }
} catch (e) { console.log('  (no lib dir)'); }

console.log('\n=== hooks ===');
try {
  for (const f of fs.readdirSync(feRoot + '/hooks')) {
    console.log('  hooks/' + f);
  }
} catch (e) { console.log('  (no hooks dir)'); }