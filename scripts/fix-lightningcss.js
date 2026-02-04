const fs = require('fs');
const path = require('path');

function tryCopy(src, dest) {
  try {
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`[fix-lightningcss] Copied ${src} -> ${dest}`);
      return true;
    }
  } catch (e) {
    // swallow errors - this is a best-effort fix
    console.warn('[fix-lightningcss] error', e && e.message);
  }
  return false;
}

const destDir = path.join('node_modules', 'lightningcss');
const dest = path.join(destDir, 'lightningcss.linux-x64-gnu.node');

// Look for any lightningcss-* packages with a .node file and copy it
let ok = false;
try {
  const nm = path.join('node_modules');
  if (fs.existsSync(nm)) {
    const names = fs.readdirSync(nm);
    for (const name of names) {
      if (!name.startsWith('lightningcss-')) continue;
      const pkgDir = path.join(nm, name);
      if (!fs.existsSync(pkgDir)) continue;
      const files = fs.readdirSync(pkgDir);
      for (const f of files) {
        if (f.endsWith('.node') && f.includes('lightningcss')) {
          const src = path.join(pkgDir, f);
          if (tryCopy(src, dest)) { ok = true; break; }
        }
      }
      if (ok) break;
    }
  }
} catch (e) {
  console.warn('[fix-lightningcss] scan error', e && e.message);
}

if (!ok) {
  console.log('[fix-lightningcss] No candidate binary found to copy (this is OK unless the build still fails).');
}
