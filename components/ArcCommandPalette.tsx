'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Globe,
  Plus,
  Copy,
  Pin,
  ExternalLink,
  Calculator,
  Laptop,
  Check,
  Sparkles,
  Command,
  X,
  Volume2,
  SplitSquareHorizontal,
  Bookmark,
  History,
  Clock
} from 'lucide-react';

export interface TabItem {
  id: string;
  title: string;
  url: string;
  favIcon?: string;
  category?: string;
}

export interface HistoryRecord {
  id: string;
  title: string;
  url: string;
  domain: string;
  visitCount: number;
  lastVisited: string;
}

export const DEFAULT_HISTORY: HistoryRecord[] = [
  {
    id: 'hist-1',
    title: 'GitHub: Let’s build from here · Platform for developers',
    url: 'https://github.com',
    domain: 'github.com',
    visitCount: 48,
    lastVisited: '15m ago'
  },
  {
    id: 'hist-2',
    title: 'Trending repositories on GitHub today',
    url: 'https://github.com/trending',
    domain: 'github.com',
    visitCount: 22,
    lastVisited: '1h ago'
  },
  {
    id: 'hist-3',
    title: 'YouTube — Watch, stream, and share videos',
    url: 'https://youtube.com',
    domain: 'youtube.com',
    visitCount: 92,
    lastVisited: '35m ago'
  },
  {
    id: 'hist-4',
    title: 'YouTube Music & Channel Subscriptions',
    url: 'https://youtube.com/feed/subscriptions',
    domain: 'youtube.com',
    visitCount: 27,
    lastVisited: 'Yesterday'
  },
  {
    id: 'hist-5',
    title: 'Stack Overflow — Where Developers Learn & Share Programming Knowledge',
    url: 'https://stackoverflow.com',
    domain: 'stackoverflow.com',
    visitCount: 39,
    lastVisited: '2h ago'
  },
  {
    id: 'hist-6',
    title: 'How to build Chrome extension with Manifest V3 - Stack Overflow',
    url: 'https://stackoverflow.com/questions/tagged/chrome-extension',
    domain: 'stackoverflow.com',
    visitCount: 16,
    lastVisited: '3h ago'
  },
  {
    id: 'hist-7',
    title: 'Google Search: Arc browser floating command bar shortcuts',
    url: 'https://google.com/search?q=arc+browser+shortcuts',
    domain: 'google.com',
    visitCount: 61,
    lastVisited: '4h ago'
  },
  {
    id: 'hist-8',
    title: 'Linear — A better way to build software products',
    url: 'https://linear.app',
    domain: 'linear.app',
    visitCount: 31,
    lastVisited: 'Yesterday'
  },
  {
    id: 'hist-9',
    title: 'Reddit — Technology discussions and software architecture',
    url: 'https://reddit.com/r/technology',
    domain: 'reddit.com',
    visitCount: 65,
    lastVisited: 'Yesterday'
  },
  {
    id: 'hist-10',
    title: 'Hacker News — Technology & software community discussions',
    url: 'https://news.ycombinator.com',
    domain: 'news.ycombinator.com',
    visitCount: 74,
    lastVisited: 'Just now'
  },
  {
    id: 'hist-11',
    title: 'Wikipedia — Douglas Engelbart & The Mother of All Demos',
    url: 'https://en.wikipedia.org/wiki/Douglas_Engelbart',
    domain: 'wikipedia.org',
    visitCount: 11,
    lastVisited: '2d ago'
  },
  {
    id: 'hist-12',
    title: 'Notion — Connected workspace for wiki, notes & project roadmaps',
    url: 'https://notion.so',
    domain: 'notion.so',
    visitCount: 42,
    lastVisited: '3d ago'
  },
  {
    id: 'hist-13',
    title: 'X / Twitter: Developer news & breaking tech insights',
    url: 'https://x.com',
    domain: 'x.com',
    visitCount: 54,
    lastVisited: '4d ago'
  }
];

export interface ArcPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  openTabs: TabItem[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onNavigateCurrentTab: (url: string, title?: string) => void;
  onNewTab: (url: string, title?: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  history?: HistoryRecord[];
}

interface PaletteItem {
  id: string;
  type: 'tab' | 'url' | 'search' | 'command' | 'calc' | 'history';
  title: string;
  subtitle: string;
  iconType: string;
  favIcon?: string;
  action: (inNewTab?: boolean) => void;
  badge?: string;
  metaInfo?: string;
}

export function ArcCommandPalette({
  isOpen,
  onClose,
  openTabs,
  activeTabId,
  onSwitchTab,
  onNavigateCurrentTab,
  onNewTab,
  onDuplicateTab,
  onPinTab,
  onCloseTab,
  history = DEFAULT_HISTORY
}: ArcPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'tabs' | 'history' | 'search' | 'commands'>('all');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  };

  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const evaluateMath = (text: string): number | null => {
    try {
      const sanitized = text.replace(/x/gi, '*').replace(/%/g, '*0.01').trim();
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;
      if (!/\d/.test(sanitized)) return null;
      // evaluate basic arithmetic
      const result = new Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100000) / 100000;
      }
    } catch {
      return null;
    }
    return null;
  };

  const trimmed = query.trim();

  // Compute inline Omnibox ghost autofill suggestion
  const { autocompleteSuffix, topSuggestion } = useMemo(() => {
    if (!trimmed || trimmed.length < 1) {
      return { autocompleteSuffix: '', topSuggestion: null };
    }

    const cleanQuery = trimmed.toLowerCase();
    const queryWithoutScheme = cleanQuery.replace(/^https?:\/\//, '').replace(/^www\./, '');

    // Search in history domains first (e.g. user types "git" -> completes to "github.com")
    for (const item of history) {
      const cleanDomain = item.domain.toLowerCase().replace(/^www\./, '');
      const cleanUrl = item.url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

      if (cleanDomain.startsWith(queryWithoutScheme) && cleanDomain !== queryWithoutScheme) {
        return {
          autocompleteSuffix: cleanDomain.slice(queryWithoutScheme.length),
          topSuggestion: item
        };
      }

      if (cleanUrl.startsWith(queryWithoutScheme) && cleanUrl !== queryWithoutScheme) {
        return {
          autocompleteSuffix: cleanUrl.slice(queryWithoutScheme.length),
          topSuggestion: item
        };
      }
    }

    // Also check open tabs
    for (const tab of openTabs) {
      const cleanUrl = tab.url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      if (cleanUrl.startsWith(queryWithoutScheme) && cleanUrl !== queryWithoutScheme) {
        return {
          autocompleteSuffix: cleanUrl.slice(queryWithoutScheme.length),
          topSuggestion: {
            id: `tab-${tab.id}`,
            title: tab.title,
            url: tab.url,
            domain: cleanUrl.split('/')[0],
            visitCount: 1,
            lastVisited: 'Open tab'
          }
        };
      }
    }

    return { autocompleteSuffix: '', topSuggestion: null };
  }, [trimmed, history, openTabs]);

  const items: PaletteItem[] = [];

  // 1. Math calculation check
  if (trimmed) {
    const math = evaluateMath(trimmed);
    if (math !== null) {
      items.push({
        id: 'calc-result',
        type: 'calc',
        title: `= ${math}`,
        subtitle: `Calculated from: ${trimmed}`,
        iconType: 'calc',
        badge: 'Copy Result',
        action: () => {
          navigator.clipboard.writeText(String(math));
          showToast(`Copied ${math} to clipboard!`);
          onClose();
        }
      });
    }
  }

  // 2. Direct URL check
  const isUrl = /^https?:\/\//i.test(trimmed) || /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed);
  if (trimmed && isUrl) {
    const formattedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    items.push({
      id: 'direct-url',
      type: 'url',
      title: `Visit ${trimmed}`,
      subtitle: `${formattedUrl} (↵ new tab, ⇧↵ current tab)`,
      iconType: 'globe',
      badge: 'Navigate',
      action: (inNewTab?: boolean) => {
        const shouldNewTab = inNewTab ?? true;
        if (shouldNewTab) {
          onNewTab(formattedUrl, trimmed);
        } else {
          onNavigateCurrentTab(formattedUrl, trimmed);
        }
        onClose();
      }
    });
  }

  // 3. Open Tabs
  if (filter === 'all' || filter === 'tabs') {
    openTabs.forEach((tab) => {
      const matches =
        !trimmed ||
        tab.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        tab.url.toLowerCase().includes(trimmed.toLowerCase());
      if (matches) {
        items.push({
          id: `tab-${tab.id}`,
          type: 'tab',
          title: tab.title,
          subtitle: tab.url,
          favIcon: tab.favIcon,
          iconType: 'tab',
          badge: tab.id === activeTabId ? 'Active Tab' : 'Switch Tab',
          action: () => {
            onSwitchTab(tab.id);
            onClose();
          }
        });
      }
    });
  }

  // 4. Search & Browsing History (with autofill matching & visit statistics)
  if (filter === 'all' || filter === 'history') {
    const matchedHistory = history.filter((h) => {
      if (!trimmed) return true;
      const q = trimmed.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        h.url.toLowerCase().includes(q) ||
        h.domain.toLowerCase().includes(q)
      );
    });

    // Sort by relevance: items whose domain or title starts with query first, then by visitCount
    matchedHistory.sort((a, b) => {
      if (trimmed) {
        const q = trimmed.toLowerCase();
        const aStarts = a.domain.toLowerCase().startsWith(q) || a.title.toLowerCase().startsWith(q);
        const bStarts = b.domain.toLowerCase().startsWith(q) || b.title.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return b.visitCount - a.visitCount;
    });

    const maxItems = filter === 'history' ? 25 : 4;
    matchedHistory.slice(0, maxItems).forEach((h) => {
      // Avoid duplicate display if already listed
      if (!items.some((it) => it.subtitle.startsWith(h.url))) {
        items.push({
          id: `history-${h.id}`,
          type: 'history',
          title: h.title,
          subtitle: `${h.url} · Visited ${h.lastVisited}`,
          iconType: 'history',
          badge: 'History',
          metaInfo: `${h.visitCount} visits`,
          action: (inNewTab?: boolean) => {
            const shouldNewTab = inNewTab ?? true;
            if (shouldNewTab) {
              onNewTab(h.url, h.title);
            } else {
              onNavigateCurrentTab(h.url, h.title);
            }
            onClose();
          }
        });
      }
    });
  }

  // 5. Search Engines
  if (trimmed && (filter === 'all' || filter === 'search')) {
    items.push({
      id: 'search-google',
      type: 'search',
      title: `Google Search: "${trimmed}"`,
      subtitle: `Search on Google (↵ new tab, ⇧↵ current tab)`,
      iconType: 'search',
      badge: 'Search',
      action: (inNewTab?: boolean) => {
        const shouldNewTab = inNewTab ?? true;
        const url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
        if (shouldNewTab) {
          onNewTab(url, `Google: ${trimmed}`);
        } else {
          onNavigateCurrentTab(url, `Google: ${trimmed}`);
        }
        onClose();
      }
    });
    items.push({
      id: 'search-youtube',
      type: 'search',
      title: `YouTube: "${trimmed}"`,
      subtitle: `Search videos on YouTube (↵ new tab, ⇧↵ current tab)`,
      iconType: 'search',
      badge: 'Videos',
      action: (inNewTab?: boolean) => {
        const shouldNewTab = inNewTab ?? true;
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
        if (shouldNewTab) {
          onNewTab(url, `YouTube: ${trimmed}`);
        } else {
          onNavigateCurrentTab(url, `YouTube: ${trimmed}`);
        }
        onClose();
      }
    });
    items.push({
      id: 'search-github',
      type: 'search',
      title: `GitHub: "${trimmed}"`,
      subtitle: `Search code on GitHub (↵ new tab, ⇧↵ current tab)`,
      iconType: 'code',
      badge: 'Code',
      action: (inNewTab?: boolean) => {
        const shouldNewTab = inNewTab ?? true;
        const url = `https://github.com/search?q=${encodeURIComponent(trimmed)}`;
        if (shouldNewTab) {
          onNewTab(url, `GitHub: ${trimmed}`);
        } else {
          onNavigateCurrentTab(url, `GitHub: ${trimmed}`);
        }
        onClose();
      }
    });
  }

  // 6. Browser Commands
  if (filter === 'all' || filter === 'commands') {
    const commandsList = [
      {
        id: 'cmd-new-tab',
        title: 'New Blank Tab',
        subtitle: 'Open a blank browser tab in simulator',
        iconType: 'plus',
        action: () => {
          onNewTab('https://google.com', 'New Tab');
          onClose();
        }
      },
      {
        id: 'cmd-duplicate-tab',
        title: 'Duplicate Current Tab',
        subtitle: 'Clones the active page into a new tab',
        iconType: 'copy',
        action: () => {
          onDuplicateTab(activeTabId);
          onClose();
        }
      },
      {
        id: 'cmd-pin-tab',
        title: 'Pin / Unpin Tab',
        subtitle: 'Toggle pinned status for active tab',
        iconType: 'pin',
        action: () => {
          onPinTab(activeTabId);
          showToast('Tab pin status toggled');
          onClose();
        }
      },
      {
        id: 'cmd-copy-url',
        title: 'Copy Page URL',
        subtitle: 'Copies the current page URL to your clipboard',
        iconType: 'copy',
        action: () => {
          const current = openTabs.find((t) => t.id === activeTabId);
          if (current) {
            navigator.clipboard.writeText(current.url);
            showToast('URL copied to clipboard!');
          }
          onClose();
        }
      },
      {
        id: 'cmd-split-view',
        title: 'Side-by-Side Split View',
        subtitle: 'Arc-style split tab preview',
        iconType: 'split',
        action: () => {
          showToast('Split view mode activated!');
          onClose();
        }
      }
    ];

    commandsList.forEach((cmd) => {
      if (!trimmed || cmd.title.toLowerCase().includes(trimmed.toLowerCase()) || cmd.subtitle.toLowerCase().includes(trimmed.toLowerCase())) {
        items.push({
          id: cmd.id,
          type: 'command',
          title: cmd.title,
          subtitle: cmd.subtitle,
          iconType: cmd.iconType,
          badge: 'Command',
          action: cmd.action
        });
      }
    });
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        scrollSelectedIntoView((selectedIndex + 1) % items.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        scrollSelectedIntoView((selectedIndex - 1 + items.length) % items.length);
      }
      return;
    }

    // Tab key: if ghost autocomplete is present, complete it! Otherwise cycle filter pills
    if (e.key === 'Tab') {
      e.preventDefault();
      if (autocompleteSuffix && topSuggestion) {
        const hasScheme = /^https?:\/\//i.test(trimmed);
        const prefix = hasScheme ? trimmed.split('://')[0] + '://' : '';
        const completed = prefix + (trimmed.replace(/^https?:\/\//, '') + autocompleteSuffix);
        setQuery(completed);
        setSelectedIndex(0);
        return;
      }

      const filters: ('all' | 'tabs' | 'history' | 'search' | 'commands')[] = ['all', 'tabs', 'history', 'search', 'commands'];
      const nextIdx = (filters.indexOf(filter) + 1) % filters.length;
      setFilter(filters[nextIdx]);
      setSelectedIndex(0);
      return;
    }

    // Right Arrow: if cursor is at the end of input and ghost autocomplete is available, complete it
    if (e.key === 'ArrowRight' && autocompleteSuffix && topSuggestion) {
      if (inputRef.current && inputRef.current.selectionStart === query.length) {
        e.preventDefault();
        const hasScheme = /^https?:\/\//i.test(trimmed);
        const prefix = hasScheme ? trimmed.split('://')[0] + '://' : '';
        const completed = prefix + (trimmed.replace(/^https?:\/\//, '') + autocompleteSuffix);
        setQuery(completed);
        setSelectedIndex(0);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // Default: Enter opens in new tab; Shift+Enter navigates current tab
      const inNewTab = !e.shiftKey;
      if (items.length > 0 && items[selectedIndex]) {
        items[selectedIndex].action(inNewTab);
      } else if (trimmed) {
        // Fallback: search google
        const url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
        if (inNewTab) {
          onNewTab(url, `Google: ${trimmed}`);
        } else {
          onNavigateCurrentTab(url, `Google: ${trimmed}`);
        }
        onClose();
      }
      return;
    }
  };

  const scrollSelectedIntoView = (index: number) => {
    if (!listRef.current) return;
    const elements = listRef.current.children;
    if (elements[index]) {
      (elements[index] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="arc-command-palette-backdrop"
      className="absolute inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md transition-all duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Toast message */}
      {copiedNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          {copiedNotification}
        </div>
      )}

      {/* Floating Arc Command Modal */}
      <div
        id="arc-command-palette-box"
        className="w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-slate-100 backdrop-blur-2xl ring-1 ring-white/10 transition-transform scale-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Input Bar with Ghost Autocomplete */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/40">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              id="arc-command-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a URL, search web, browse history, or calculate..."
              className="w-full bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 text-base font-medium relative z-10"
              autoComplete="off"
              spellCheck={false}
            />

            {/* Inline Ghost Text Autocomplete Overlay */}
            {autocompleteSuffix && (
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none z-0 overflow-hidden text-base font-medium select-none">
                <span className="opacity-0 whitespace-pre">{query}</span>
                <span className="text-slate-500/85 whitespace-pre">{autocompleteSuffix}</span>
                <span className="ml-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800/90 text-sky-400 border border-slate-700/70 shrink-0 inline-flex items-center gap-1">
                  Tab ⇥
                </span>
              </div>
            )}
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800/90 text-slate-400 border border-slate-700/60 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800/40 bg-slate-950/30 overflow-x-auto text-xs font-medium">
          {[
            { id: 'all', label: 'All' },
            { id: 'tabs', label: `Tabs (${openTabs.length})` },
            { id: 'history', label: `History (${history.length})` },
            { id: 'search', label: 'Web Search' },
            { id: 'commands', label: 'Commands' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setFilter(item.id as any);
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className={`px-2.5 py-1 rounded-full transition-colors shrink-0 ${
                filter === item.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-72 sm:max-h-80 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {items.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm text-slate-400">No matching tabs, history, or commands</p>
              <p className="text-xs text-slate-600 mt-1">Press Enter to search Google directly for &quot;{query}&quot;</p>
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    const inNewTab = !e.shiftKey;
                    item.action(inNewTab);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-600/20 text-white border border-sky-500/30 shadow-sm'
                      : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'calc'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.type === 'url'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.type === 'tab'
                          ? 'bg-slate-800 text-sky-400'
                          : item.type === 'history'
                          ? 'bg-sky-500/15 text-sky-400'
                          : item.type === 'search'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {item.favIcon ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.favIcon}
                          alt="icon"
                          className="w-4 h-4 rounded"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : item.type === 'calc' ? (
                        <Calculator className="w-4 h-4" />
                      ) : item.type === 'url' ? (
                        <Globe className="w-4 h-4" />
                      ) : item.type === 'tab' ? (
                        <Laptop className="w-4 h-4" />
                      ) : item.type === 'history' ? (
                        <History className="w-4 h-4" />
                      ) : item.type === 'search' ? (
                        <Search className="w-4 h-4" />
                      ) : item.iconType === 'plus' ? (
                        <Plus className="w-4 h-4" />
                      ) : item.iconType === 'copy' ? (
                        <Copy className="w-4 h-4" />
                      ) : item.iconType === 'pin' ? (
                        <Pin className="w-4 h-4" />
                      ) : item.iconType === 'split' ? (
                        <SplitSquareHorizontal className="w-4 h-4" />
                      ) : (
                        <Command className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.type === 'tab' && item.id.replace('tab-', '') === activeTabId && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 border border-sky-500/40 text-sky-400 font-semibold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-2">
                        <span>{item.subtitle}</span>
                        {item.metaInfo && (
                          <span className="text-slate-400 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80">
                            {item.metaInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
                        {item.badge}
                      </span>
                    )}
                    <kbd
                      className={`hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                        isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ↵
                    </kbd>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Status / Keyboard Hint Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/70 text-[11px] text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">Tab / →</kbd>
              <span>autofill</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">↵</kbd>
              <span>new tab</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">⇧↵</kbd>
              <span>current tab</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">Esc</kbd>
              <span>close</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-sky-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Floating Command Overlay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
