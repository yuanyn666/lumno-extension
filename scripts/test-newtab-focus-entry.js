const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const newtabSource = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const fallbackSource = fs.readFileSync(path.join(repoRoot, 'src/newtab/lumno-newtab.js'), 'utf8');
const wallpaperEffectPreloadSource = fs.readFileSync(
  path.join(repoRoot, 'src/newtab/wallpaper-effect-preload.js'),
  'utf8'
);
const backgroundSource = fs.readFileSync(
  path.join(repoRoot, 'src/background/background.js'),
  'utf8'
);

assert.strictEqual(
  fs.existsSync(path.join(repoRoot, 'src/newtab/newtab-focus-entry.js')),
  false,
  'the New Tab should not ship an automatic-focus navigation router'
);
assert.doesNotMatch(
  html,
  /newtab-focus-entry\.js|data-nt-focus-route|data-nt-focus-paint-gate/,
  'the maintained New Tab should paint directly without a focus-route gate'
);
assert.doesNotMatch(
  wallpaperEffectPreloadSource,
  /data-nt-focus-route/,
  'wallpaper effect preloading should not depend on the retired automatic-focus route'
);
assert.ok(
  html.indexOf('<script src="../shared/settings.js"></script>') <
    html.indexOf('<script src="wallpaper-preload.js"></script>'),
  'normal visual preloading should continue after shared settings load'
);
assert.doesNotMatch(
  newtabSource,
  /scheduleAutoFocusRecovery|attemptFocusIfVisible|forceInitialFocusPending/,
  'opening or reactivating a New Tab must not automatically focus the page search input'
);
assert.match(
  newtabSource,
  /message\.action !== 'lumno:newtab-focus-input'[\s\S]*?activateNewtabShortcutFocus\(\)/,
  'an explicit user shortcut should still be allowed to focus the page search input'
);
assert.match(
  fallbackSource,
  /target\.searchParams\.delete\('focus'\);/,
  'the compatibility redirect should strip legacy automatic-focus hints'
);
assert.doesNotMatch(
  fallbackSource,
  /searchParams\.set\('focus'/,
  'the compatibility redirect must not add a new automatic-focus hint'
);

const openNewTabBlock = backgroundSource.match(/case 'openNewTab': \{([\s\S]*?)\n    \}/);
assert(openNewTabBlock, 'background should expose the openNewTab action');
assert.doesNotMatch(
  openNewTabBlock[1],
  /\burl\s*:/,
  'openNewTab should omit an extension URL so Chromium opens chrome://newtab'
);
assert.match(
  openNewTabBlock[1],
  /createTabWithSourceGroup\(\{[\s\S]*active:/,
  'openNewTab should retain foreground/background disposition while using the browser New Tab route'
);

console.log('newtab focus entry tests passed');
