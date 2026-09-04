// Extension source code files and ZIP packager for Chrome/Chromium browsers
import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Arc Tab - Floating Command Bar",
  "version": "1.1.0",
  "description": "Pure Arc-style floating command bar overlay over any webpage. Switch tabs, search, calculate, and run actions without opening an unwanted new tab.",
  "permissions": [
    "tabs",
    "history",
    "bookmarks",
    "storage",
    "activeTab",
    "scripting"
  ],
  "commands": {
    "toggle-command-bar": {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T",
        "windows": "Alt+T",
        "linux": "Alt+T"
      },
      "description": "Toggle Arc Floating Command Bar Overlay"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_title": "Toggle Arc Floating Bar (Alt+T)"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;

export const BACKGROUND_JS = `// Arc Tab - Background Service Worker
// Pure Floating Overlay: Toggles the command bar directly over your active webpage.
// NEVER opens an unwanted blank tab.

async function toggleArcBarOnTab(tab) {
  if (!tab || !tab.id) {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    } catch {}
    return;
  }

  // Check if the tab is a restricted browser internal page
  const url = tab.url || '';
  const isRestricted = !url || 
    url.startsWith('chrome://') || 
    url.startsWith('edge://') || 
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('chromewebstore.google.com');

  if (isRestricted) {
    // Chrome strictly blocks content scripts from running on internal pages (chrome://, etc).
    // Instead of doing nothing, open or navigate to Arc Tab's command center!
    if (url.startsWith('chrome://newtab') || url.startsWith('about:blank') || url.startsWith('edge://newtab')) {
      chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('newtab.html') });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    }
    return;
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'toggle_arc_bar' });
    if (!res) {
      throw new Error('No response from content script');
    }
  } catch (err) {
    // If content script was not yet injected (e.g. page was open before extension install), inject dynamically
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle_arc_bar' }).catch(() => {});
      }, 70);
    } catch (injectErr) {
      console.warn('Could not inject Arc Tab content script, opening standalone page:', injectErr);
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    }
  }
}

// Automatically inject content script into all existing http/https tabs on installation/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch {
        // Tab may not allow script injection
      }
    }
  } catch (e) {
    console.warn('onInstalled injection notice:', e);
  }
});

// Global shortcut listener (Alt+T or user configured key in chrome://extensions/shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-command-bar') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    toggleArcBarOnTab(activeTab);
  }
});

// Clicking the extension icon in the toolbar toggles the floating overlay directly on page
chrome.action.onClicked.addListener(async (tab) => {
  toggleArcBarOnTab(tab);
});

// Handle requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_tabs') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs: tabs || [] });
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'switch_tab') {
    chrome.tabs.update(request.tabId, { active: true }, (tab) => {
      if (tab && tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'close_tab') {
    chrome.tabs.remove(request.tabId, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'new_tab') {
    chrome.tabs.create({ url: request.url, active: true }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'duplicate_tab') {
    const tabId = request.tabId || (sender.tab && sender.tab.id);
    if (tabId) {
      chrome.tabs.duplicate(tabId, () => sendResponse({ success: true }));
    }
    return true;
  }

  if (request.action === 'pin_tab') {
    const tabId = request.tabId || (sender.tab && sender.tab.id);
    if (tabId) {
      chrome.tabs.get(tabId, (t) => {
        chrome.tabs.update(tabId, { pinned: !t.pinned }, () => sendResponse({ success: true }));
      });
    }
    return true;
  }

  if (request.action === 'search_history') {
    chrome.history.search({ text: request.query, maxResults: 10 }, (results) => {
      sendResponse({ results: results || [] });
    });
    return true;
  }

  if (request.action === 'search_bookmarks') {
    chrome.bookmarks.search(request.query, (results) => {
      sendResponse({ results: results || [] });
    });
    return true;
  }
});
`;

export const CONTENT_JS = `// Arc Tab - Content Script
(function () {
  // Prevent multiple injections
  if (window.__ARC_TAB_INJECTED__) return;
  window.__ARC_TAB_INJECTED__ = true;

  let hostEl = null;
  let shadowRoot = null;
  let isOpen = false;
  let tabsCache = [];
  let selectedIndex = 0;
  let currentFilter = 'all'; // 'all', 'tabs', 'commands', 'search'

  // Standard built-in browser commands
  const BROWSER_COMMANDS = [
    { id: 'new_tab', title: 'New Tab', subtitle: 'Open a blank new tab', icon: 'plus', action: () => openUrl('chrome://newtab') },
    { id: 'duplicate_tab', title: 'Duplicate Tab', subtitle: 'Clone current tab in a new tab', icon: 'copy', action: () => chrome.runtime.sendMessage({ action: 'duplicate_tab' }) },
    { id: 'pin_tab', title: 'Pin / Unpin Tab', subtitle: 'Toggle pin status of active tab', icon: 'pin', action: () => chrome.runtime.sendMessage({ action: 'pin_tab' }) },
    { id: 'copy_url', title: 'Copy Page URL', subtitle: window.location.href, icon: 'link', action: () => { navigator.clipboard.writeText(window.location.href); showToast('URL copied to clipboard'); } },
    { id: 'search_google', title: 'Search Google', subtitle: 'Open Google in a new tab', icon: 'search', action: () => openUrl('https://google.com') },
    { id: 'search_youtube', title: 'Open YouTube', subtitle: 'Browse videos and music', icon: 'video', action: () => openUrl('https://youtube.com') },
    { id: 'search_github', title: 'Open GitHub', subtitle: 'Repositories and code search', icon: 'code', action: () => openUrl('https://github.com') }
  ];

  function createOverlay() {
    hostEl = document.createElement('div');
    hostEl.id = 'arc-tab-command-palette-host';
    hostEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;';
    
    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = \`
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 18, 26, 0.45);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          opacity: 0;
          transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        
        .backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .palette-container {
          position: fixed;
          top: 18%;
          left: 50%;
          transform: translateX(-50%) scale(0.96) translateY(-8px);
          width: 90%;
          max-width: 640px;
          background: #14171f;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          color: #f1f5f9;
          overflow: hidden;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .palette-container.open {
          opacity: 1;
          transform: translateX(-50%) scale(1) translateY(0);
          pointer-events: auto;
        }

        .input-bar {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .input-icon {
          width: 20px;
          height: 20px;
          color: #94a3b8;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 17px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        .search-input::placeholder {
          color: #64748b;
        }

        .badge-shortcut {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.08);
          padding: 3px 7px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .filter-tags {
          display: flex;
          gap: 6px;
          padding: 10px 18px 4px 18px;
        }

        .filter-pill {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-pill.active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .results-list {
          max-height: 380px;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .results-list::-webkit-scrollbar {
          width: 6px;
        }
        .results-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.1s ease;
          border: 1px solid transparent;
        }

        .result-item.selected {
          background: rgba(59, 130, 246, 0.18);
          border-color: rgba(96, 165, 250, 0.3);
        }

        .result-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #cbd5e1;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-size: 14px;
          font-weight: 500;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-subtitle {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .result-action-hint {
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .result-item.selected .result-action-hint {
          opacity: 1;
        }

        .calc-preview {
          padding: 16px;
          margin: 8px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .calc-val {
          font-size: 22px;
          font-weight: 600;
          color: #60a5fa;
        }

        .footer-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          background: rgba(0, 0, 0, 0.25);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 12px;
          color: #64748b;
        }

        .footer-keys {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: #1e293b;
          color: #f8fafc;
          padding: 10px 18px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      </style>

      <div class="backdrop" id="backdrop"></div>
      
      <div class="palette-container" id="palette">
        <div class="input-bar">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input type="text" class="search-input" id="search-input" placeholder="Search tabs, open URL, calculate, or type a command..." autocomplete="off" spellcheck="false" />
          <div class="badge-shortcut">
            <span>Esc to close</span>
          </div>
        </div>

        <div class="filter-tags" id="filter-tags">
          <button class="filter-pill active" data-filter="all">All</button>
          <button class="filter-pill" data-filter="tabs">Open Tabs</button>
          <button class="filter-pill" data-filter="search">Web Search</button>
          <button class="filter-pill" data-filter="commands">Actions</button>
        </div>

        <div class="results-list" id="results-list"></div>

        <div class="footer-bar">
          <div class="footer-keys">
            <span><b>↵</b> new tab</span>
            <span><b>⇧↵</b> current tab</span>
            <span><b>Esc</b> close</span>
            <span><b>Tab</b> filters</span>
          </div>
          <span style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#38bdf8;"></span>
            Arc Tab
          </span>
        </div>
      </div>

      <div class="toast" id="toast"></div>
    \`;

    document.body.appendChild(hostEl);

    const backdrop = shadowRoot.getElementById('backdrop');
    const input = shadowRoot.getElementById('search-input');
    const resultsList = shadowRoot.getElementById('results-list');
    const filterTags = shadowRoot.getElementById('filter-tags');

    backdrop.addEventListener('click', closePalette);

    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', handleKeyDown);

    filterTags.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (btn) {
        shadowRoot.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        selectedIndex = 0;
        renderResults();
      }
    });
  }

  function togglePalette() {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  async function openPalette() {
    if (!shadowRoot) createOverlay();

    isOpen = true;
    const backdrop = shadowRoot.getElementById('backdrop');
    const palette = shadowRoot.getElementById('palette');
    const input = shadowRoot.getElementById('search-input');

    backdrop.classList.add('open');
    palette.classList.add('open');
    input.value = '';
    selectedIndex = 0;

    // Fetch live tabs from background
    try {
      chrome.runtime.sendMessage({ action: 'get_tabs' }, (res) => {
        tabsCache = (res && res.tabs) || [];
        renderResults();
      });
    } catch (e) {
      tabsCache = [];
      renderResults();
    }

    renderResults();
    setTimeout(() => input.focus(), 50);
  }

  function closePalette() {
    if (!isOpen || !shadowRoot) return;
    isOpen = false;
    const backdrop = shadowRoot.getElementById('backdrop');
    const palette = shadowRoot.getElementById('palette');
    backdrop.classList.remove('open');
    palette.classList.remove('open');
  }

  function showToast(msg) {
    if (!shadowRoot) return;
    const toast = shadowRoot.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function openUrl(url, inNewTab = true) {
    if (inNewTab) {
      chrome.runtime.sendMessage({ action: 'new_tab', url: url });
    } else {
      window.location.href = url;
    }
    closePalette();
  }

  function evaluateMath(str) {
    try {
      const cleaned = str.split(' ').join('').replace(/x/gi, '*').replace(/%/g, '*0.01');
      if (!cleaned) return null;
      const allowed = '0123456789+-*/.()';
      let hasDigit = false;
      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (allowed.indexOf(ch) === -1) return null;
        if (ch >= '0' && ch <= '9') hasDigit = true;
      }
      if (!hasDigit) return null;
      // Safe evaluation of simple math
      const result = Function('"use strict";return (' + cleaned + ')')();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Number(result.toFixed(6));
      }
    } catch {
      return null;
    }
    return null;
  }

  function getItems() {
    const input = shadowRoot.getElementById('search-input');
    const query = (input ? input.value : '').trim();
    const items = [];

    // 1. Math check
    if (query) {
      const mathResult = evaluateMath(query);
      if (mathResult !== null) {
        items.push({
          type: 'calc',
          title: '= ' + mathResult,
          subtitle: 'Calculated from: ' + query,
          action: () => {
            navigator.clipboard.writeText(String(mathResult));
            showToast('Result copied to clipboard');
            closePalette();
          }
        });
      }
    }

    // 2. Direct URL check
    const isUrl = /^https?:\/\//i.test(query) || /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(query);
    if (isUrl && query) {
      const fullUrl = query.startsWith('http') ? query : 'https://' + query;
      items.push({
        type: 'url',
        title: 'Go to ' + query,
        subtitle: fullUrl + ' (↵ new tab, ⇧↵ current tab)',
        icon: 'globe',
        action: (inNewTab) => openUrl(fullUrl, inNewTab)
      });
    }

    // 3. Open Tabs
    if (currentFilter === 'all' || currentFilter === 'tabs') {
      tabsCache.forEach(t => {
        if (!query || (t.title && t.title.toLowerCase().includes(query.toLowerCase())) || (t.url && t.url.toLowerCase().includes(query.toLowerCase()))) {
          items.push({
            type: 'tab',
            id: t.id,
            title: t.title || 'Untitled Tab',
            subtitle: t.url || '',
            favIconUrl: t.favIconUrl,
            action: () => {
              chrome.runtime.sendMessage({ action: 'switch_tab', tabId: t.id });
              closePalette();
            }
          });
        }
      });
    }

    // 4. Web Search suggestions
    if (query && (currentFilter === 'all' || currentFilter === 'search')) {
      items.push({
        type: 'search',
        engine: 'google',
        title: 'Google Search: "' + query + '"',
        subtitle: 'Search on Google (↵ new tab, ⇧↵ current tab)',
        action: (inNewTab) => openUrl('https://www.google.com/search?q=' + encodeURIComponent(query), inNewTab)
      });
      items.push({
        type: 'search',
        engine: 'youtube',
        title: 'YouTube: "' + query + '"',
        subtitle: 'Search videos on YouTube (↵ new tab, ⇧↵ current tab)',
        action: (inNewTab) => openUrl('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), inNewTab)
      });
      items.push({
        type: 'search',
        engine: 'github',
        title: 'GitHub: "' + query + '"',
        subtitle: 'Search code on GitHub (↵ new tab, ⇧↵ current tab)',
        action: (inNewTab) => openUrl('https://github.com/search?q=' + encodeURIComponent(query), inNewTab)
      });
    }

    // 5. Browser commands
    if (currentFilter === 'all' || currentFilter === 'commands') {
      BROWSER_COMMANDS.forEach(cmd => {
        if (!query || cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.subtitle.toLowerCase().includes(query.toLowerCase())) {
          items.push({
            type: 'command',
            ...cmd
          });
        }
      });
    }

    return items;
  }

  function renderResults() {
    const list = shadowRoot.getElementById('results-list');
    const items = getItems();

    if (items.length === 0) {
      list.innerHTML = \`
        <div style="padding:32px 16px;text-align:center;color:#64748b;font-size:14px;">
          No matching tabs, links, or commands found
        </div>
      \`;
      return;
    }

    if (selectedIndex >= items.length) selectedIndex = 0;
    if (selectedIndex < 0) selectedIndex = items.length - 1;

    list.innerHTML = '';
    items.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'result-item' + (index === selectedIndex ? ' selected' : '');
      
      let iconHtml = '';
      if (item.favIconUrl) {
        iconHtml = \`<img src="\${item.favIconUrl}" style="width:18px;height:18px;border-radius:4px;" onerror="this.style.display='none'" />\`;
      } else if (item.type === 'tab') {
        iconHtml = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>\`;
      } else if (item.type === 'calc') {
        iconHtml = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>\`;
      } else if (item.type === 'url') {
        iconHtml = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>\`;
      } else if (item.type === 'search') {
        iconHtml = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>\`;
      } else {
        iconHtml = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>\`;
      }

      el.innerHTML = \`
        <div class="result-icon">\${iconHtml}</div>
        <div class="result-info">
          <div class="result-title">\${escapeHtml(item.title)}</div>
          <div class="result-subtitle">\${escapeHtml(item.subtitle || '')}</div>
        </div>
        <div class="result-action-hint">
          <span>\${item.type === 'tab' ? 'Switch Tab' : item.type === 'calc' ? 'Copy' : 'New Tab'}</span>
          <span>↵</span>
        </div>
      \`;

      el.addEventListener('mouseenter', () => {
        selectedIndex = index;
        updateSelectedVisuals();
      });

      el.addEventListener('click', (e) => {
        const inNewTab = !e.shiftKey;
        if (item.action) item.action(inNewTab);
      });

      list.appendChild(el);
    });

    // Ensure selected is scrolled into view
    const selectedEl = list.children[selectedIndex];
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateSelectedVisuals() {
    const list = shadowRoot.getElementById('results-list');
    if (!list) return;
    Array.from(list.children).forEach((child, i) => {
      if (i === selectedIndex) {
        child.classList.add('selected');
        child.scrollIntoView({ block: 'nearest' });
      } else {
        child.classList.remove('selected');
      }
    });
  }

  function handleKeyDown(e) {
    const items = getItems();

    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelectedVisuals();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelectedVisuals();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const filters = ['all', 'tabs', 'search', 'commands'];
      const currentIdx = filters.indexOf(currentFilter);
      const nextIdx = (currentIdx + 1) % filters.length;
      currentFilter = filters[nextIdx];
      
      const pills = shadowRoot.querySelectorAll('.filter-pill');
      pills.forEach(p => {
        p.classList.toggle('active', p.dataset.filter === currentFilter);
      });
      selectedIndex = 0;
      renderResults();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // Default: Enter opens in new tab; Shift+Enter navigates current tab
      const inNewTab = !e.shiftKey;
      if (items.length > 0 && items[selectedIndex]) {
        items[selectedIndex].action(inNewTab);
      }
      return;
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Global keydown listeners for in-page overlay invocation
  window.addEventListener('keydown', (e) => {
    const isAltT = e.altKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT');
    const isShiftCmdK = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK');
    const isAltCmdT = (e.altKey && (e.metaKey || e.ctrlKey)) && (e.key === 't' || e.key === 'T' || e.code === 'KeyT');

    if (isAltT || isShiftCmdK || isAltCmdT) {
      e.preventDefault();
      e.stopPropagation();
      togglePalette();
    }
  }, true);

  // Background message listener
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'toggle_arc_bar') {
      togglePalette();
      sendResponse({ status: 'toggled', isOpen });
    }
  });
})();
`;

export const NEWTAB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tab</title>
  <link rel="stylesheet" href="newtab.css">
</head>
<body>
  <div class="ambient-canvas">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>

  <div class="clock-display">
    <div class="time" id="clock-time">12:00</div>
    <div class="date" id="clock-date">Wednesday, September 2</div>
  </div>

  <div class="floating-card">
    <div class="search-row">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </svg>
      <input type="text" id="main-search" placeholder="Type a URL, search, or command..." autofocus />
      <span class="cmd-pill">↵ Enter</span>
    </div>

    <div class="quick-links">
      <a class="quick-chip" href="https://google.com">
        <span class="chip-dot" style="background:#4285f4;"></span> Google
      </a>
      <a class="quick-chip" href="https://github.com">
        <span class="chip-dot" style="background:#a855f7;"></span> GitHub
      </a>
      <a class="quick-chip" href="https://youtube.com">
        <span class="chip-dot" style="background:#ef4444;"></span> YouTube
      </a>
      <a class="quick-chip" href="https://news.ycombinator.com">
        <span class="chip-dot" style="background:#f97316;"></span> Hacker News
      </a>
      <a class="quick-chip" href="https://x.com">
        <span class="chip-dot" style="background:#38bdf8;"></span> X / Twitter
      </a>
    </div>

    <div class="tabs-header">
      <span>Open Tabs</span>
      <span id="tab-count-badge" class="count-badge">0 tabs</span>
    </div>
    
    <div class="tab-list" id="tab-list">
      <div class="loading-state">Loading your tabs...</div>
    </div>
  </div>

  <script src="newtab.js"></script>
</body>
</html>
`;

export const NEWTAB_CSS = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

body {
  min-height: 100vh;
  background: #0b0f17;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.ambient-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.35;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: #3b82f6;
  top: -100px;
  left: 20%;
}

.blob-2 {
  width: 450px;
  height: 450px;
  background: #8b5cf6;
  bottom: -50px;
  right: 25%;
}

.blob-3 {
  width: 350px;
  height: 350px;
  background: #06b6d4;
  top: 40%;
  right: 10%;
}

.clock-display {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 28px;
}

.time {
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: #ffffff;
}

.date {
  font-size: 15px;
  color: #94a3b8;
  margin-top: 4px;
  font-weight: 400;
}

.floating-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 660px;
  background: rgba(20, 24, 33, 0.75);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 28px 70px -10px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 20px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.search-icon {
  width: 22px;
  height: 22px;
  color: #94a3b8;
  flex-shrink: 0;
}

#main-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 17px;
  color: #ffffff;
  font-weight: 500;
}

#main-search::placeholder {
  color: #64748b;
}

.cmd-pill {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.quick-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 9999px;
  font-size: 13px;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.18);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.count-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.tab-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.tab-item:hover {
  background: rgba(59, 130, 246, 0.16);
}

.tab-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.tab-fav {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  flex-shrink: 0;
}

.tab-title {
  font-size: 14px;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

export const NEWTAB_JS = `// Arc Tab - New Tab Page Logic
(function() {
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');
  const searchInput = document.getElementById('main-search');
  const tabList = document.getElementById('tab-list');
  const tabBadge = document.getElementById('tab-count-badge');

  function updateClock() {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clockDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Fetch open tabs
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      renderTabs(tabs || []);
    });
  }

  function renderTabs(tabs) {
    tabBadge.textContent = tabs.length + ' tabs';
    if (!tabs.length) {
      tabList.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-size:13px;">No other open tabs</div>';
      return;
    }

    tabList.innerHTML = '';
    tabs.forEach(t => {
      const row = document.createElement('div');
      row.className = 'tab-item';
      
      const iconSrc = t.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>';
      
      row.innerHTML = \`
        <div class="tab-meta">
          <img class="tab-fav" src="\${iconSrc}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'" />
          <span class="tab-title">\${escapeHtml(t.title || 'Untitled')}</span>
        </div>
        <span style="font-size:12px;color:#94a3b8;">Switch</span>
      \`;

      row.addEventListener('click', () => {
        chrome.tabs.update(t.id, { active: true });
      });

      tabList.appendChild(row);
    });
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (!q) return;

      if (/^https?:\\/\\//i.test(q) || /^[a-z0-9-]+(\\.[a-z0-9-]+)+/i.test(q)) {
        const url = q.startsWith('http') ? q : 'https://' + q;
        window.location.href = url;
      } else {
        window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
      }
    }
  });

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
`;

export const POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 280px;
      margin: 0;
      padding: 16px;
      background: #14171f;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    p {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .shortcut-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
      margin-bottom: 14px;
    }
    button {
      width: 100%;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 9px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover {
      background: #2563eb;
    }
    .settings-link {
      display: block;
      margin-top: 10px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      text-decoration: none;
    }
    .settings-link:hover {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <h3>
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#38bdf8;"></span>
    Arc Tab
  </h3>
  <p>Floating Command Bar &amp; New Tab overlay.</p>
  
  <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Toggle shortcut:</div>
  <div class="shortcut-badge">Alt + T</div>

  <button id="open-btn">Open Command Bar Now</button>

  <a href="chrome://extensions/shortcuts" target="_blank" class="settings-link">Change keyboard shortcut ↗</a>

  <script>
    document.getElementById('open-btn').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle_arc_bar' });
        window.close();
      }
    });
  </script>
</body>
</html>
`;

export const README_MD = `# Arc Tab - Floating Command Bar Extension

A pure Arc Browser-inspired in-page floating command bar for Chromium browsers (Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi).

## 100% In-Page Floating Overlay (No Unwanted New Tabs)
Unlike typical extensions that hijack your new tab page and clutter your tab bar, **Arc Tab floats strictly as an isolated modal over your active webpage**:
- **Summon anytime**: Press \`Alt + T\` (or click the Arc Tab icon in your toolbar) over any website.
- **Zero unwanted tabs**: It never creates a blank tab just to show the command bar.
- **Open in new tab by default**: Type a URL or search query and press **\`Enter\`** to open it in a new tab.
- **Navigate current tab with Shift**: Hold **\`Shift + Enter\`** if you want to navigate your active tab directly.
- **Instant Escape**: Hit \`Esc\` anytime to dismiss the command bar and continue reading your page.

---

## Features
- **In-Page Floating Modal**: Arc-style command palette rendered cleanly in an isolated Shadow DOM.
- **Instant Tab Switcher**: Search and jump to any open tab in your window with fuzzy filtering.
- **Smart URL & Web Search**: Type any web address or query Google, YouTube, and GitHub in 1 click.
- **Built-in Calculator**: Type math expressions (e.g. \`24 * 15\` or \`15% of 320\`) with instant copy.
- **Fast Browser Commands**: Duplicate, pin, copy URL, or close tabs with keyboard navigation.

---

## How to Install in 30 Seconds

1. **Extract the ZIP file**: Unzip the downloaded folder to a permanent location on your computer.
2. **Open Extensions page**:
   - In Google Chrome / Brave: go to \`chrome://extensions\`
   - In Microsoft Edge: go to \`edge://extensions\`
3. **Turn on Developer Mode**: Toggle the switch in the top-right corner.
4. **Load Unpacked**:
   - Click the **"Load unpacked"** button in the top left.
   - Select the extracted folder.
5. **Done!**
   - Open any website (like \`google.com\` or \`github.com\`).
   - Press **\`Alt + T\`** (or click the extension icon) to summon the floating command bar!

---

## Customizing the Keyboard Shortcut

You can easily change the shortcut to whatever you like (e.g. \`Cmd+Shift+K\` or \`Ctrl+Space\`):
1. Navigate to: \`chrome://extensions/shortcuts\`
2. Scroll to **"Arc Tab - Floating Command Bar"**
3. Click the pencil icon next to **"Toggle Arc Floating Command Bar Overlay"** and press your desired shortcut!

---

## Want to Trigger It With Physical Ctrl + T (or Cmd + T)?

Chromium's C++ core strictly protects \`Ctrl + T\`, \`Ctrl + W\`, and \`Ctrl + N\` as reserved browser shortcuts, preventing extensions from capturing them directly in the browser.

To have pressing physical **\`Ctrl + T\`** summon the floating overlay directly on top of your page **without Chrome opening a new tab**, use this 2-line system remap:

### Windows (AutoHotkey v2)
Install [AutoHotkey](https://www.autohotkey.com/) and save as \`arc-tab.ahk\`:
\`\`\`ahk
#HotIf WinActive("ahk_exe chrome.exe") or WinActive("ahk_exe brave.exe") or WinActive("ahk_exe msedge.exe")
^t::!t
#HotIf
\`\`\`

### macOS (Karabiner-Elements or Raycast)
Remap \`Cmd + T\` to \`Option + T\` specifically when Google Chrome or Brave is active.
`;

// Helper function to create SVG icon base64 or canvas PNG
export function createExtensionIconDataUrl(size: number): string {
  // A clean 16/48/128 icon with an Arc-inspired blue/cyan gradient circle
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="#14171f"/>
    <circle cx="64" cy="64" r="44" stroke="url(#g)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="190 70"/>
    <circle cx="64" cy="64" r="16" fill="#38bdf8"/>
  </svg>`;
  return svg;
}

export const ALL_EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'manifest.json',
    language: 'json',
    description: 'Extension manifest V3 configuration and permissions',
    content: MANIFEST_JSON
  },
  {
    name: 'background.js',
    path: 'background.js',
    language: 'javascript',
    description: 'Background service worker managing shortcuts, tabs, and messages',
    content: BACKGROUND_JS
  },
  {
    name: 'content.js',
    path: 'content.js',
    language: 'javascript',
    description: 'Content script injecting the isolated floating command bar via Shadow DOM',
    content: CONTENT_JS
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Installation and setup guide for Chrome, Brave, and Edge',
    content: README_MD
  }
];

// Pack files into a downloadable ZIP
export async function generateExtensionZip(): Promise<Blob> {
  const zip = new JSZip();

  // Add all text files
  ALL_EXTENSION_FILES.forEach(f => {
    zip.file(f.path, f.content);
  });

  // Create icons folder with SVG/PNG
  const iconSvg = createExtensionIconDataUrl(128);
  zip.file('icons/icon.svg', iconSvg);
  
  // Also create simple canvas-rendered PNGs for standard Chrome icon sizes
  if (typeof document !== 'undefined') {
    const renderPng = (size: number): Promise<Uint8Array> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Dark background
          ctx.fillStyle = '#14171f';
          ctx.beginPath();
          ctx.roundRect(0, 0, size, size, size * 0.22);
          ctx.fill();

          // Gradient ring
          const grad = ctx.createLinearGradient(0, 0, size, size);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#3b82f6');
          grad.addColorStop(1, '#8b5cf6');

          ctx.strokeStyle = grad;
          ctx.lineWidth = size * 0.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 1.5);
          ctx.stroke();

          // Center dot
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }

        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
          } else {
            resolve(new Uint8Array());
          }
        }, 'image/png');
      });
    };

    try {
      const [p16, p48, p128] = await Promise.all([
        renderPng(16),
        renderPng(48),
        renderPng(128)
      ]);
      zip.file('icons/icon16.png', p16);
      zip.file('icons/icon48.png', p48);
      zip.file('icons/icon128.png', p128);
    } catch {
      // Fallback
      zip.file('icons/icon128.png', iconSvg);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
