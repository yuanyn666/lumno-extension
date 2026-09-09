(function() {
  const THEME_PRELOAD_STORAGE_KEY = '_x_extension_newtab_theme_preload_2026_unique_';
  const WALLPAPER_PRELOAD_STORAGE_KEY = '_x_extension_newtab_wallpaper_preload_2026_unique_';
  const FAVICON_PRELOAD_STORAGE_KEY = '_x_extension_newtab_favicon_preload_2026_unique_';
  const FAVICON_OPTIONS = {
    default: {
      file: 'assets/images/lumno.png',
      type: 'image/png',
      sizes: ''
    },
    alternate: {
      file: 'assets/images/lumno-newtab-favicon.svg',
      type: 'image/svg+xml',
      sizes: 'any'
    },
    avatar: {
      file: 'assets/images/newtab-avatar-favicon.png',
      type: 'image/png',
      sizes: '128x128'
    }
  };
  const root = document.documentElement;
  if (!root) {
    return;
  }

  function normalizeThemeMode(value) {
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
    return '';
  }

  function getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function cacheThemeMode(mode) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(THEME_PRELOAD_STORAGE_KEY, mode);
      }
    } catch (e) {
      // Best effort only; the definitive runtime still reads chrome.storage.
    }
  }

  function readWallpaperThemeMode() {
    try {
      const raw = window.localStorage
        ? window.localStorage.getItem(WALLPAPER_PRELOAD_STORAGE_KEY)
        : '';
      if (!raw) {
        return '';
      }
      const data = JSON.parse(raw);
      return normalizeThemeMode(data && data.themeMode);
    } catch (e) {
      return '';
    }
  }

  function readThemeMode() {
    try {
      const cachedMode = normalizeThemeMode(window.localStorage
        ? window.localStorage.getItem(THEME_PRELOAD_STORAGE_KEY)
        : '');
      if (cachedMode) {
        return cachedMode;
      }
    } catch (e) {
      // Fall through to the previous wallpaper cache or the system theme.
    }
    const migratedMode = readWallpaperThemeMode();
    if (migratedMode) {
      cacheThemeMode(migratedMode);
      return migratedMode;
    }
    return 'system';
  }

  function getRuntimeUrl(path) {
    if (window.chrome && window.chrome.runtime && typeof window.chrome.runtime.getURL === 'function') {
      return window.chrome.runtime.getURL(path);
    }
    return `../../${path}`;
  }

  function getCachedFavicon() {
    let id = '';
    try {
      id = String(window.localStorage
        ? window.localStorage.getItem(FAVICON_PRELOAD_STORAGE_KEY)
        : '').trim();
    } catch (e) {
      id = '';
    }
    return Object.prototype.hasOwnProperty.call(FAVICON_OPTIONS, id)
      ? { id, item: FAVICON_OPTIONS[id] }
      : null;
  }

  function applyCachedFavicon() {
    if (!document.head || typeof document.createElement !== 'function') {
      return;
    }
    const cached = getCachedFavicon();
    if (!cached) {
      return;
    }
    const link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    link.setAttribute('type', cached.item.type);
    link.setAttribute('href', getRuntimeUrl(cached.item.file));
    link.setAttribute('data-lumno-newtab-favicon', 'true');
    link.setAttribute('data-newtab-favicon-id', cached.id);
    if (cached.item.sizes) {
      link.setAttribute('sizes', cached.item.sizes);
    }
    document.head.appendChild(link);
  }

  try {
    applyCachedFavicon();
  } catch (e) {
    // A favicon failure must not interrupt the first-paint theme fallback.
  }
  const themeMode = readThemeMode();
  const resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;
  const backgroundColor = resolvedTheme === 'dark' ? '#111111' : '#ffffff';
  root.setAttribute('data-wallpaper-preload-theme', resolvedTheme);
  root.style.backgroundColor = backgroundColor;
  root.style.colorScheme = resolvedTheme;
  const themeColorMeta = typeof document.querySelector === 'function'
    ? document.querySelector('meta[name="theme-color"]')
    : null;
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', backgroundColor);
  }
})();
