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

export async function openDesktopUrl(url: string) {
  try {
    if (isTauriEnvironment()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      // Hide window after opening
      await hideDesktopWindow();
      return true;
    }
  } catch (err) {
    console.warn('Tauri openUrl error, falling back to window.open:', err);
  }

  // Fallback for browser simulation / regular web
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export interface DesktopAppDefinition {
  id: string;
  name: string;
  category: 'developer' | 'productivity' | 'system' | 'media';
  icon: string;
  command: string;
  url?: string;
  hotkey?: string;
}

export const POPULAR_DESKTOP_APPS: DesktopAppDefinition[] = [
  { id: 'app-terminal', name: 'Terminal / PowerShell', category: 'developer', icon: 'Terminal', command: 'terminal' },
  { id: 'app-vscode', name: 'Visual Studio Code', category: 'developer', icon: 'Code', command: 'code' },
  { id: 'app-browser', name: 'Default Web Browser', category: 'productivity', icon: 'Globe', command: 'browser', url: 'https://google.com' },
  { id: 'app-spotify', name: 'Spotify Music', category: 'media', icon: 'Music', command: 'spotify', url: 'https://open.spotify.com' },
  { id: 'app-figma', name: 'Figma Design', category: 'developer', icon: 'Figma', command: 'figma', url: 'https://figma.com' },
  { id: 'app-github', name: 'GitHub Desktop & Repos', category: 'developer', icon: 'Github', command: 'github', url: 'https://github.com' },
  { id: 'app-slack', name: 'Slack Messaging', category: 'productivity', icon: 'MessageSquare', command: 'slack', url: 'https://slack.com' },
  { id: 'app-notion', name: 'Notion Workspace', category: 'productivity', icon: 'FileText', command: 'notion', url: 'https://notion.so' },
  { id: 'app-settings', name: 'System Settings', category: 'system', icon: 'Settings', command: 'settings' },
  { id: 'app-calculator', name: 'System Calculator', category: 'system', icon: 'Calculator', command: 'calc' },
];
