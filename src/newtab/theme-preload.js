(function() {
  const THEME_PRELOAD_STORAGE_KEY = '_x_extension_newtab_theme_preload_2026_unique_';
  const WALLPAPER_PRELOAD_STORAGE_KEY = '_x_extension_newtab_wallpaper_preload_2026_unique_';
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
