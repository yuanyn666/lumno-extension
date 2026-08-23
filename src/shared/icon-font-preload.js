(function() {
  const PRELOADS = [
    {
      id: '_x_extension_remixicon_font_preload_2026_unique_',
      path: 'assets/remixicon/fonts/remixicon.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous'
    }
  ];

  if (!document) {
    return;
  }
  const host = document.head || document.documentElement;
  if (!host || !globalThis.chrome || !chrome.runtime ||
      typeof chrome.runtime.getURL !== 'function') {
    return;
  }

  PRELOADS.forEach((preload) => {
    if (document.getElementById(preload.id)) {
      return;
    }
    const link = document.createElement('link');
    link.id = preload.id;
    link.rel = 'preload';
    link.as = preload.as;
    link.type = preload.type;
    if (preload.crossOrigin) {
      link.crossOrigin = preload.crossOrigin;
    }
    link.fetchPriority = 'high';
    link.href = chrome.runtime.getURL(preload.path);
    host.appendChild(link);
  });
})();
