'use client';

import { isTauriEnvironment } from './desktop-ipc';

export const CURRENT_APP_VERSION = '0.1.0';
export const GITHUB_REPO = 'spidey1102/Arc-Type-Search';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  notes?: string;
  downloadUrl?: string;
  isNativeTauri: boolean;
  rawUpdate?: {
    version: string;
    date?: string;
    body?: string;
    downloadAndInstall: (
      onEvent?: (event: {
        event: 'Started' | 'Progress' | 'Finished';
        data?: { contentLength?: number; chunkLength?: number };
      }) => void
    ) => Promise<void>;
  };
}

export function getAutoCheckUpdates(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem('arc-auto-check-updates');
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

export function setAutoCheckUpdates(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('arc-auto-check-updates', String(enabled));
  } catch (err) {
    console.warn('Could not save auto-check setting:', err);
  }
}

// Compare two semver strings (e.g. "0.1.0" and "0.2.0")
export function isVersionNewer(current: string, remote: string): boolean {
  const cleanCurr = current.replace(/^v/, '').trim();
  const cleanRem = remote.replace(/^v/, '').trim();

  const cParts = cleanCurr.split('.').map(Number);
  const rParts = cleanRem.split('.').map(Number);

  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

// Check for updates
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const isTauri = isTauriEnvironment();

  if (isTauri) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        return {
          available: true,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: update.version,
          releaseDate: update.date,
          notes: update.body,
          isNativeTauri: true,
          rawUpdate: update,
        };
      }
      return {
        available: false,
        currentVersion: CURRENT_APP_VERSION,
        isNativeTauri: true,
      };
    } catch (err) {
      console.warn('Tauri native updater check error:', err);
      // Fallback to GitHub Release API check below
    }
  }

  // Web simulation or fallback GitHub Releases API check
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const release = await res.json();
      const tagName = release.tag_name || release.name || '';
      const hasNewer = isVersionNewer(CURRENT_APP_VERSION, tagName);

      return {
        available: hasNewer,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: tagName,
        releaseDate: release.published_at ? new Date(release.published_at).toLocaleDateString() : undefined,
        notes: release.body,
        downloadUrl: release.html_url || GITHUB_RELEASES_PAGE,
        isNativeTauri: isTauri,
      };
    }
  } catch (err) {
    console.warn('Failed to query GitHub releases API:', err);
  }

  return {
    available: false,
    currentVersion: CURRENT_APP_VERSION,
    isNativeTauri: isTauri,
  };
}

// Download and install update
export async function applyAppUpdate(
  updateInfo: UpdateInfo,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<{ success: boolean; requiresRestart: boolean; message: string }> {
  if (updateInfo.isNativeTauri && updateInfo.rawUpdate) {
    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      onProgress?.(5, 'Connecting to update server...');

      await updateInfo.rawUpdate.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalBytes = event.data?.contentLength || 0;
          onProgress?.(10, 'Downloading update package...');
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data?.chunkLength || 0;
          const pct = totalBytes > 0 ? Math.min(95, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
          onProgress?.(pct, `Downloading: ${Math.round(downloadedBytes / 1024)} KB...`);
        } else if (event.event === 'Finished') {
          onProgress?.(100, 'Installing update...');
        }
      });

      onProgress?.(100, 'Update applied successfully! Ready to restart.');
      return {
        success: true,
        requiresRestart: true,
        message: 'Update installed successfully. Restart Arc to apply.',
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        requiresRestart: false,
        message: `Failed to install update: ${errorMsg}`,
      };
    }
  }

  // Simulation mode (Web / Preview)
  onProgress?.(15, 'Contacting GitHub Releases...');
  await new Promise((r) => setTimeout(r, 600));
  onProgress?.(50, 'Downloading simulated release package...');
  await new Promise((r) => setTimeout(r, 800));
  onProgress?.(85, 'Verifying package signature...');
  await new Promise((r) => setTimeout(r, 600));
  onProgress?.(100, 'Update downloaded! Ready to install.');

  return {
    success: true,
    requiresRestart: true,
    message: `Simulated update ${updateInfo.latestVersion || 'v0.2.0'} downloaded!`,
  };
}

// Restart application
export async function restartApplication(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
      return;
    } catch (err) {
      console.warn('plugin-process relaunch error, trying invoke restart_app:', err);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('restart_app');
        return;
      } catch (invokeErr) {
        console.warn('invoke restart_app error:', invokeErr);
      }
    }
  }

  // Web simulation: reload window
  window.location.reload();
}
