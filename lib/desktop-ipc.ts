'use client';

import { useSyncExternalStore } from 'react';

// Safe wrapper for Tauri IPC & Desktop capabilities
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window ||
    '__TAURI_METADATA__' in window
  );
}

const emptySubscribe = () => () => {};

export function useIsTauri(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => isTauriEnvironment(),
    () => false
  );
}

export async function hideDesktopWindow() {
  if (!isTauriEnvironment()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('hide_window');
    return true;
  } catch (err) {
    console.warn('Could not invoke Tauri hide_window:', err);
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function openDesktopUrl(rawUrl: string) {
  const url = sanitizeUrl(rawUrl);

  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url });
      await hideDesktopWindow();
      return true;
    } catch (invokeErr) {
      console.warn('Tauri open_external_url invoke error:', invokeErr);
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
        await hideDesktopWindow();
        return true;
      } catch (openerErr) {
        console.warn('Tauri plugin opener error:', openerErr);
      }
    }
  }

  // Fallback for browser simulation / regular web
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export async function launchDesktopApp(commandOrPath: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('launch_system_app', { appCmd: commandOrPath });
      await hideDesktopWindow();
      return true;
    } catch (err) {
      console.warn('Could not launch system app via Tauri:', err);
      return false;
    }
  }

  // In browser simulator: if it has a web URL, open it; otherwise inform the user
  return false;
}

export interface DesktopAppDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  command: string;
  pathOrCommand?: string;
  url?: string;
  enabled?: boolean;
}

export const POPULAR_DESKTOP_APPS: DesktopAppDefinition[] = [
  { id: 'app-terminal', name: 'Terminal / PowerShell', category: 'developer', icon: 'Terminal', command: 'wt.exe', pathOrCommand: 'wt' },
  { id: 'app-vscode', name: 'Visual Studio Code', category: 'developer', icon: 'Code', command: 'code', pathOrCommand: 'code' },
  { id: 'app-chrome', name: 'Google Chrome', category: 'productivity', icon: 'Globe', command: 'chrome', pathOrCommand: 'chrome', url: 'https://google.com' },
  { id: 'app-edge', name: 'Microsoft Edge', category: 'productivity', icon: 'Globe', command: 'msedge', pathOrCommand: 'msedge', url: 'https://bing.com' },
  { id: 'app-spotify', name: 'Spotify Music', category: 'media', icon: 'Music', command: 'spotify', pathOrCommand: 'spotify', url: 'https://open.spotify.com' },
  { id: 'app-discord', name: 'Discord', category: 'media', icon: 'MessageSquare', command: 'discord', pathOrCommand: 'discord', url: 'https://discord.com/app' },
  { id: 'app-slack', name: 'Slack Messaging', category: 'productivity', icon: 'MessageSquare', command: 'slack', pathOrCommand: 'slack', url: 'https://slack.com' },
  { id: 'app-notion', name: 'Notion Workspace', category: 'productivity', icon: 'FileText', command: 'notion', pathOrCommand: 'notion', url: 'https://notion.so' },
  { id: 'app-calculator', name: 'Calculator', category: 'system', icon: 'Calculator', command: 'calc', pathOrCommand: 'calc' },
  { id: 'app-notepad', name: 'Notepad', category: 'productivity', icon: 'FileText', command: 'notepad', pathOrCommand: 'notepad' },
  { id: 'app-explorer', name: 'File Explorer', category: 'system', icon: 'FolderOpen', command: 'explorer', pathOrCommand: 'explorer' },
  { id: 'app-settings', name: 'Windows / System Settings', category: 'system', icon: 'Settings', command: 'ms-settings:', pathOrCommand: 'ms-settings:' },
  { id: 'app-taskmgr', name: 'Task Manager', category: 'system', icon: 'Activity', command: 'taskmgr', pathOrCommand: 'taskmgr' },
];

export async function scanSystemInstalledApps(): Promise<DesktopAppDefinition[]> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const apps = await invoke<Array<{ id: string; name: string; path_or_command: string; category: string; icon: string }>>('scan_installed_apps');
      if (Array.isArray(apps) && apps.length > 0) {
        return apps.map(a => ({
          id: a.id,
          name: a.name,
          category: a.category,
          icon: a.icon || 'Laptop',
          command: a.path_or_command,
          pathOrCommand: a.path_or_command,
          enabled: true,
        }));
      }
    } catch (err) {
      console.warn('Error invoking scan_installed_apps:', err);
    }
  }

  // Return standard popular desktop apps for browser / simulator
  return POPULAR_DESKTOP_APPS.map(a => ({ ...a, enabled: true }));
}

