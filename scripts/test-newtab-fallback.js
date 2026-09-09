const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('../src/shared/extension-routes.js');
require('../src/background/tab-groups.js');
const fallback = require('../src/background/newtab-fallback.js');

const repoRoot = path.resolve(__dirname, '..');
const lumnoNewtabHtml = fs.readFileSync(path.join(repoRoot, 'src', 'newtab', 'lumno-newtab.html'), 'utf8');
const lumnoNewtabRedirectJsPath = path.join(repoRoot, 'src', 'newtab', 'lumno-newtab.js');
const lumnoNewtabRedirectJs = fs.existsSync(lumnoNewtabRedirectJsPath)
  ? fs.readFileSync(lumnoNewtabRedirectJsPath, 'utf8')
  : '';

function getScriptTags(source) {
  return Array.from(source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g));
}

assert.strictEqual(
  fallback.isLocalFileLikeTargetUrl('file:///Users/example/document.pdf'),
  true,
  'file URLs should be treated as local-file-like targets'
);
assert.strictEqual(
  fallback.isLocalFileLikeTargetUrl('https://example.com/viewer?src=file:///tmp/a.html'),
  true,
  'nested file src parameters should be treated as local-file-like targets'
);
assert.strictEqual(
  fallback.isLocalFileLikeTargetUrl('https://example.com/docs/report.pdf'),
  true,
  'PDF paths should be treated as local-file-like targets'
);
assert.strictEqual(
  fallback.isLocalFileLikeTargetUrl('https://example.com/'),
  false,
  'ordinary web URLs should not be treated as local-file-like targets'
);

const originalChrome = globalThis.chrome;
const createdTabs = [];
const groupedTabs = [];
globalThis.chrome = {
  runtime: {
    getURL: (value) => `chrome-extension://abc/${value}`,
    lastError: null
  },
  extension: {
    isAllowedFileSchemeAccess: (callback) => {
      callback(false);
    }
  },
  tabs: {
    create: (options, callback) => {
      const tab = {
        id: 100 + createdTabs.length,
        windowId: typeof options.windowId === 'number' ? options.windowId : 1,
        url: options && options.url || '',
        groupId: -1
      };
      createdTabs.push({ ...(options || {}) });
      if (callback) {
        callback(tab);
      }
    },
    group: (options, callback) => {
      groupedTabs.push({ ...(options || {}) });
      if (callback) {
        callback(options.groupId || 7);
      }
    }
  },
  tabGroups: {
    TAB_GROUP_ID_NONE: -1
  }
};

assert.strictEqual(
  fallback.buildNewtabFallbackUrl({ notice: 'file-access' }),
  'chrome-extension://abc/src/newtab/lumno-newtab.html?notice=file-access',
  'file-access notice should be encoded into the standalone Lumno newtab fallback URL'
);

assert.match(
  lumnoNewtabHtml,
  /<script src="lumno-newtab\.js"><\/script>/,
  'standalone Lumno newtab fallback should load the redirect through an external script'
);
assert.doesNotMatch(
  lumnoNewtabHtml,
  /wallpaper-preload\.js|codex-debug-surface\.js/,
  'standalone Lumno newtab fallback should redirect without painting or bootstrapping an intermediate page'
);
assert.doesNotMatch(
  lumnoNewtabHtml,
  /<link[^>]+data-lumno-newtab-favicon="true"/,
  'standalone fallback should keep the manifest loading icon instead of introducing a second favicon'
);
assert.ok(
  getScriptTags(lumnoNewtabHtml).every((match) => /\bsrc=/.test(match[1])),
  'standalone Lumno newtab fallback should not use inline scripts because extension pages disallow them by CSP'
);
assert.match(
  lumnoNewtabRedirectJs,
  /new URL\('newtab\.html', window\.location\.href\)/,
  'standalone Lumno newtab redirect script should target the primary maintained newtab page'
);
assert.match(
  lumnoNewtabRedirectJs,
  /target\.search = window\.location\.search \|\| '';/,
  'standalone Lumno newtab fallback should preserve notice query parameters'
);
assert.match(
  lumnoNewtabRedirectJs,
  /target\.searchParams\.delete\('focus'\);/,
  'Lumno newtab redirect should remove legacy automatic-focus hints'
);
assert.match(
  lumnoNewtabRedirectJs,
  /target\.hash = window\.location\.hash \|\| '';/,
  'standalone Lumno newtab fallback should preserve hash parameters'
);
assert.match(
  lumnoNewtabRedirectJs,
  /window\.location\.replace\(target\.href\);/,
  'standalone Lumno newtab fallback should replace history instead of stacking a duplicate page'
);
{
  const replacedUrls = [];
  vm.runInNewContext(lumnoNewtabRedirectJs, {
    URL,
    window: {
      location: {
        href: 'chrome-extension://abc/src/newtab/lumno-newtab.html?focus=1&notice=file-access#search',
        search: '?focus=1&notice=file-access',
        hash: '#search',
        replace(url) {
          replacedUrls.push(url);
        }
      }
    }
  });
  assert.deepStrictEqual(
    replacedUrls,
    ['chrome-extension://abc/src/newtab/newtab.html?notice=file-access#search'],
    'standalone Lumno newtab redirect should preserve notice and hash while dropping focus'
  );
}
{
  const replacedUrls = [];
  vm.runInNewContext(lumnoNewtabRedirectJs, {
    URL,
    window: {
      location: {
        href: 'chrome-extension://abc/src/newtab/lumno-newtab.html',
        search: '',
        hash: '',
        replace(url) {
          replacedUrls.push(url);
        }
      }
    }
  });
  assert.deepStrictEqual(
    replacedUrls,
    ['chrome-extension://abc/src/newtab/newtab.html'],
    'standalone Lumno fallbacks should retain the maintained page entrance without requesting focus'
  );
}
assert.doesNotMatch(
  lumnoNewtabHtml,
  /<script src="newtab\.js"><\/script>/,
  'standalone Lumno newtab fallback should not duplicate the main newtab runtime dependency list'
);

fallback.openNewtabFallbackForUrl('file:///Users/example/document.pdf');
assert.strictEqual(
  createdTabs[0].url,
  'chrome-extension://abc/src/newtab/lumno-newtab.html?notice=file-access',
  'file URLs without file-scheme access should open the notice variant'
);

fallback.openNewtabFallbackForUrl('https://example.com/');
assert.strictEqual(
  createdTabs[1].url,
  'chrome-extension://abc/src/newtab/lumno-newtab.html',
  'ordinary web URLs should open the standalone Lumno newtab fallback without automatic focus'
);

fallback.openBrowserNewtabFallback();
assert.strictEqual(
  createdTabs[2].url,
  undefined,
  'browser newtab fallback should omit url so the browser-selected newtab provider handles it'
);

fallback.openNewtabFallback({
  sourceTab: { id: 20, windowId: 5, groupId: 9 }
});
assert.strictEqual(
  createdTabs[3].windowId,
  5,
  'Lumno newtab fallback should open in the source tab window when inheriting a group'
);
assert.deepStrictEqual(
  groupedTabs[0],
  { tabIds: 103, groupId: 9 },
  'Lumno newtab fallback should join the source tab group'
);

fallback.openBrowserNewtabFallback({
  sourceTab: { id: 21, windowId: 6, groupId: 11 }
});
assert.deepStrictEqual(
  groupedTabs[1],
  { tabIds: 104, groupId: 11 },
  'browser newtab fallback should also join the source tab group'
);

globalThis.chrome = originalChrome;

console.log('newtab fallback tests passed');
