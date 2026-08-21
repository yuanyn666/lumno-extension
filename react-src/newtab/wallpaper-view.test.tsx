import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createWallpaperViewApi,
  createWallpaperViewController,
  type WallpaperViewController
} from './wallpaper-view';

let controller: WallpaperViewController | null = null;

afterEach(() => {
  if (controller) {
    act(() => controller?.destroy());
  }
  controller = null;
  document.body.innerHTML = '';
});

describe('New Tab React wallpaper view', () => {
  it('renders the complete appearance panel contract', () => {
    act(() => {
      controller = createWallpaperViewController({
        documentObj: document,
        model: {
          activeTab: 'built-in',
          appearanceOptions: [
            { mode: 'system', imageUrl: '/system.svg' },
            { mode: 'light', imageUrl: '/light.svg' },
            { mode: 'dark', imageUrl: '/dark.svg' }
          ],
          effectTypes: [
            { type: 'none', fallback: 'Off' },
            { type: 'grain', fallback: 'Grain' }
          ],
          effectInkTones: [
            { tone: 'dark', fallback: 'Shadows' },
            { tone: 'light', fallback: 'Highlights' }
          ],
          favicons: [
            { id: 'default', previewUrl: '/favicon.png' },
            { id: 'alternate', inlineSvg: '<svg viewBox="0 0 1 1"></svg>' },
            { id: 'avatar', previewUrl: '/newtab-avatar-favicon.png' }
          ],
          icons: { info: '<i class="ri-information-line"></i>' },
          moreSettingsUrl: '/options#appearance',
          searchWidth: {
            min: 720,
            max: 1040,
            ticks: []
          },
          topContentOptions: [
            { value: 'brand', label: 'Brand' },
            { value: 'time', label: 'Time' },
            { value: 'off', label: 'Hide' }
          ],
          wallpapers: [
            { id: 'coast', path: '/coast.webp', thumbnailUrl: '/coast-thumb.webp' }
          ]
        }
      });
    });
    if (!controller) {
      throw new Error('Expected wallpaper view controller');
    }
    expect(createWallpaperViewApi().implementation).toBe('react');
    expect(controller.control.dataset.reactIsland).toBe('newtab-wallpaper');
    expect(controller.getRefs().builtInGrid).toBeTruthy();
    expect(
      controller.control.querySelector('[data-wallpaper-id="coast"]')
    ).not.toBeNull();
    expect(
      controller.control.querySelectorAll('[data-wallpaper-effect-type]')
    ).toHaveLength(2);
    expect(
      controller.control.querySelectorAll('[data-wallpaper-effect-ink-tone]')
    ).toHaveLength(2);
    expect(controller.getRefs().effectInkToneControl).toBeTruthy();
    const segmentedGroups = [
      controller.getRefs().effectOptions,
      controller.getRefs().effectInkToneOptions
    ];
    segmentedGroups.forEach((group) => {
      expect(group?.classList.contains('x-nt-segmented-tabs')).toBe(true);
      expect(group?.querySelector('.x-nt-segmented-tabs-indicator')).not.toBeNull();
      group?.querySelectorAll('button').forEach((button) => {
        expect(button.classList.contains('x-nt-segmented-tab')).toBe(true);
      });
    });
    expect(controller.getRefs().effectInkToneIndicator).toBeTruthy();
    const faviconOptions = controller.getRefs().faviconOptions;
    expect(
      faviconOptions?.querySelectorAll('[data-newtab-favicon-id]')
    ).toHaveLength(3);
    expect(
      faviconOptions?.querySelector<HTMLImageElement>(
        '[data-newtab-favicon-id="avatar"] img'
      )?.src
    ).toContain('/newtab-avatar-favicon.png');
    const topContentGroup = controller.getRefs().topContentTabs;
    expect(topContentGroup?.getAttribute('role')).toBe('group');
    const topContentButtons = topContentGroup?.querySelectorAll('button');
    expect(topContentButtons).toHaveLength(3);
    expect(topContentButtons?.[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(controller.getRefs().inputAutoFocusTitle).toBeUndefined();
    expect(controller.getRefs().inputAutoFocusInfoButton).toBeUndefined();
    expect(controller.getRefs().inputAutoFocusToggle).toBeUndefined();
    expect(
      controller.control.querySelector('[aria-label="Automatically focus the search input"]')
    ).toBeNull();
  });

  it('updates custom wallpaper tiles without replacing the panel', () => {
    act(() => {
      controller = createWallpaperViewController({
        documentObj: document,
        model: {
          appearanceOptions: [],
          effectTypes: [],
          favicons: [],
          icons: {},
          searchWidth: { min: 720, max: 1040, ticks: [] },
          wallpapers: []
        }
      });
    });
    if (!controller) {
      throw new Error('Expected wallpaper view controller');
    }
    const panel = controller.panel;
    let tiles: HTMLElement[] = [];
    act(() => {
      tiles = controller?.renderCustomWallpapers([
        { id: 'custom-1', thumbnailUrl: 'data:image/png;base64,AA==' }
      ]) || [];
    });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].dataset.wallpaperId).toBe('custom-1');
    expect(controller.panel).toBe(panel);
  });
});
