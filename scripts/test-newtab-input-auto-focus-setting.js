const assert = require('assert');
const fs = require('fs');
const settings = require('../src/shared/settings.js');

const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const newtabHtml = fs.readFileSync('src/newtab/newtab.html', 'utf8');
const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const fallbackSource = fs.readFileSync('src/newtab/lumno-newtab.js', 'utf8');
const wallpaperViewSource = fs.readFileSync('react-src/newtab/wallpaper-view.tsx', 'utf8');

assert.strictEqual(
  settings.NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY,
  '_x_extension_newtab_input_auto_focus_enabled_2026_unique_',
  'the retired preference key should remain readable for settings compatibility'
);
assert(settings.CHROME_SYNC_STORAGE_KEYS.includes(settings.NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY));

assert.doesNotMatch(
  optionsHtml,
  /newtab_input_auto_focus_title|_x_extension_newtab_input_auto_focus_toggle_2026_unique_/,
  'Options should not advertise a setting that can steal focus from the browser address bar'
);
assert.doesNotMatch(
  wallpaperViewSource,
  /inputAutoFocusTitle|inputAutoFocusInfoButton|inputAutoFocusToggle|Automatically focus the search input/,
  'the in-page appearance panel should not expose automatic focus controls'
);
assert.doesNotMatch(
  newtabHtml,
  /newtab-focus-entry\.js|data-nt-focus-route|data-nt-focus-paint-gate/,
  'the New Tab document should not route or hide itself for automatic focus'
);
assert.doesNotMatch(
  newtabSource,
  /scheduleAutoFocusRecovery|attemptFocusIfVisible|forceInitialFocusPending|inputAutoFocusVisibilityGate/,
  'the New Tab runtime should not schedule automatic search-input focus'
);
assert.match(
  newtabSource,
  /message\.action !== 'lumno:newtab-focus-input'[\s\S]*?activateNewtabShortcutFocus\(\)/,
  'the explicit keyboard-command focus action should remain available'
);
assert.match(
  fallbackSource,
  /target\.searchParams\.delete\('focus'\);/,
  'legacy compatibility redirects should remove automatic-focus hints'
);

console.log('newtab input auto-focus setting tests passed');
