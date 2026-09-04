'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Plus,
  X,
  Pin,
  ExternalLink,
  Laptop,
  Layers,
  Sparkles,
  Command,
  Share2,
  Bookmark,
  Search,
  Code2,
  BookOpen,
  FileText,
  Globe
} from 'lucide-react';
import { ArcCommandPalette, TabItem, HistoryRecord, DEFAULT_HISTORY } from './ArcCommandPalette';

const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    title: 'Arc Browser Concept: The Floating Command Center',
    url: 'https://browser-trends.design/arc-command-bar',
    category: 'design'
  },
  {
    id: 'tab-2',
    title: 'github.com/developer/arc-tab-extension',
    url: 'https://github.com/developer/arc-tab-extension',
    category: 'code'
  },
  {
    id: 'tab-3',
    title: 'Douglas Engelbart & The Mother of All Demos - Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Douglas_Engelbart',
    category: 'wiki'
  },
  {
    id: 'tab-4',
    title: 'Hacker News — Technology & Software Discussions',
    url: 'https://news.ycombinator.com',
    category: 'news'
  }
];

export function BrowserSimulator() {
  const [tabs, setTabs] = useState<TabItem[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [pinnedTabIds, setPinnedTabIds] = useState<string[]>([]);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>(INITIAL_TABS[0].url);
  const [history, setHistory] = useState<HistoryRecord[]>(DEFAULT_HISTORY);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Global keyboard shortcut listener for Alt+T, Ctrl+T/Cmd+T, or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltT = e.altKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT');
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK');
      const isCtrlT = (e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T' || e.code === 'KeyT');
      
      if (isAltT || isCmdK || isCtrlT) {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleSwitchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setUrlInput(target.url);
    }
  };

  const handleNavigateCurrentTab = (url: string, customTitle?: string) => {
    let domain = 'Page';
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }
    const pageTitle = customTitle || domain;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              title: pageTitle,
              url: url
            }
          : tab
      )
    );
    setUrlInput(url);

    // Record to browsing history
    setHistory((prev) => {
      const existing = prev.find((h) => h.url === url);
      if (existing) {
        return [
          { ...existing, title: pageTitle, visitCount: existing.visitCount + 1, lastVisited: 'Just now' },
          ...prev.filter((h) => h.url !== url)
        ];
      }
      return [
        {
          id: `hist-${Date.now()}`,
          title: pageTitle,
          url: url,
          domain: domain,
          visitCount: 1,
          lastVisited: 'Just now'
        },
        ...prev
      ];
    });
  };

  const handleNewTab = (url: string, customTitle?: string) => {
    const newId = `tab-${Date.now()}`;
    let domain = 'New Page';
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }
    const pageTitle = customTitle || domain;

    const newTab: TabItem = {
      id: newId,
      title: pageTitle,
      url: url
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setUrlInput(url);

    // Record to browsing history
    setHistory((prev) => {
      const existing = prev.find((h) => h.url === url);
      if (existing) {
        return [
          { ...existing, title: pageTitle, visitCount: existing.visitCount + 1, lastVisited: 'Just now' },
          ...prev.filter((h) => h.url !== url)
        ];
      }
      return [
        {
          id: `hist-${Date.now()}`,
          title: pageTitle,
          url: url,
          domain: domain,
          visitCount: 1,
          lastVisited: 'Just now'
        },
        ...prev
      ];
    });
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0].id);
      setUrlInput(nextTabs[0].url);
    }
  };

  const handleDuplicateTab = (tabId: string) => {
    const target = tabs.find((t) => t.id === tabId);
    if (!target) return;
    const newId = `tab-${Date.now()}`;
    const clonedTab: TabItem = {
      id: newId,
      title: `${target.title} (Copy)`,
      url: target.url
    };
    setTabs((prev) => [...prev, clonedTab]);
    setActiveTabId(newId);
  };

  const handlePinTab = (tabId: string) => {
    setPinnedTabIds((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  };

  return (
    <div id="browser-simulator-container" className="relative w-full rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Browser Header / Chrome Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 pt-2.5 pb-2 flex flex-col gap-2 select-none">
        {/* Row 1: Window Controls + Tabs List */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {/* Traffic light buttons */}
          <div className="flex items-center gap-1.5 pr-2 pl-1 shrink-0">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/40"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/40"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40"></span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto py-0.5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isPinned = pinnedTabIds.includes(tab.id);

              return (
                <div
                  key={tab.id}
                  onClick={() => handleSwitchTab(tab.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 shrink-0 max-w-[200px] border ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 border-slate-700/80 shadow-sm'
                      : 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {isPinned ? (
                    <Pin className="w-3 h-3 text-sky-400 rotate-45 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-sky-400/80 shrink-0"></span>
                  )}
                  <span className="truncate">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-100 transition"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Plus Tab Button */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition shrink-0"
              title="New Tab (Open Arc Floating Bar)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Summon Arc Bar Button */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium hover:bg-sky-500/25 transition shrink-0 shadow-sm"
            title="Summon Arc Command Bar (Ctrl+T or Alt+T)"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Arc Bar</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="bg-sky-950/90 border border-sky-500/40 px-1.5 py-0.5 rounded text-sky-300">
                Ctrl+T
              </kbd>
              <span className="text-slate-500">/</span>
              <kbd className="bg-sky-950/90 border border-sky-500/40 px-1.5 py-0.5 rounded text-sky-300">
                Alt+T
              </kbd>
            </div>
          </button>
        </div>

        {/* Row 2: Navigation & Omnibox */}
        <div className="flex items-center gap-2">
          <div className="flex items-center text-slate-400 gap-0.5">
            <button className="p-1 rounded hover:bg-slate-800 text-slate-500 cursor-not-allowed">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded hover:bg-slate-800 text-slate-500 cursor-not-allowed">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                // Flash reload effect
                const current = activeTabId;
                setActiveTabId('');
                setTimeout(() => setActiveTabId(current), 80);
              }}
              className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition"
              title="Reload Page"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox URL Bar */}
          <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && urlInput) {
                  let formatted = urlInput.trim();
                  if (!/^https?:\/\//i.test(formatted)) {
                    formatted = 'https://' + formatted;
                  }
                  handleNewTab(formatted);
                }
              }}
              className="w-full bg-transparent border-none outline-none font-mono text-slate-300 text-xs"
              placeholder="Search or enter web address..."
            />
          </div>

          {/* Extension Icon in Toolbar */}
          <button
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs ${
              isPaletteOpen
                ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                : 'bg-slate-800/80 text-sky-400 border-slate-700/60 hover:bg-slate-800'
            }`}
            title="Arc Tab Extension (Click to toggle floating bar)"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="font-semibold text-[11px] hidden sm:inline">Arc Tab</span>
          </button>
        </div>
      </div>

      {/* Simulated Webpage Body */}
      <div className="relative min-h-[440px] sm:min-h-[500px] bg-slate-950 flex flex-col overflow-y-auto">
        {/* Floating Arc Palette Modal (Renders right over this page!) */}
        <ArcCommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          openTabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={handleSwitchTab}
          onNavigateCurrentTab={handleNavigateCurrentTab}
          onNewTab={handleNewTab}
          onDuplicateTab={handleDuplicateTab}
          onPinTab={handlePinTab}
          onCloseTab={handleCloseTab}
          history={history}
        />

        {/* Floating Shortcut Banner Prompt (to let users know they can trigger it) */}
        {!isPaletteOpen && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 text-xs font-medium shadow-xl backdrop-blur-md hover:border-sky-500/50 hover:bg-slate-800 transition"
            >
              <div className="w-2 h-2 rounded-full bg-sky-400 group-hover:scale-125 transition"></div>
              <span>Press <b>Alt + T</b> to float command bar</span>
            </button>
          </div>
        )}

        {/* Content depending on active tab */}
        {activeTab?.id === 'tab-1' && (
          <div className="p-6 sm:p-10 max-w-3xl mx-auto w-full text-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Browser Interface Revolution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              How Floating Command Bars Replace Traditional New Tabs
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
              In classic browsers, clicking &quot;New Tab&quot; abruptly takes you away from your current web page into a blank void. Arc Browser pioneered a paradigm shift: instead of switching contexts, a floating command palette appears directly over your current window.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <Command className="w-4 h-4 text-sky-400" />
                  Zero Context Switch
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  You stay right on your active article, code repo, or video. Search suggestions, tab switching, and calculations float gracefully on top.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  Instant Tab Switching
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Find any open tab by simply typing part of its title or URL without visually hunting through 30 tab headers.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-800/40 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-sky-300">Try it right now on this page:</p>
                <p className="text-sm font-semibold text-white mt-0.5">Press Alt+T or click below to launch the overlay</p>
              </div>
              <button
                onClick={() => setIsPaletteOpen(true)}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition shrink-0 shadow-md"
              >
                Open Floating Bar
              </button>
            </div>
          </div>
        )}

        {activeTab?.id === 'tab-2' && (
          <div className="p-6 sm:p-10 max-w-3xl mx-auto w-full text-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-3 font-mono">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>developer / arc-tab-extension</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">arc-tab-extension (Manifest V3)</h2>
            <p className="text-xs text-slate-400 mb-6">
              A high-performance Chrome extension injecting an isolated Shadow DOM command palette into all browser tabs.
            </p>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-slate-500">{`// File Structure of the compiled extension:`}</div>
              <div className="flex items-center gap-2 text-emerald-400">├── manifest.json (v3 configuration & permissions)</div>
              <div className="flex items-center gap-2 text-sky-400">├── background.js (service worker managing tabs & shortcuts)</div>
              <div className="flex items-center gap-2 text-sky-400">├── content.js (Shadow DOM floating palette injector)</div>
              <div className="flex items-center gap-2 text-amber-400">├── newtab.html (Arc-style ambient new tab page)</div>
              <div className="flex items-center gap-2 text-amber-400">├── newtab.css & newtab.js</div>
              <div className="flex items-center gap-2 text-indigo-400">└── icons/ (icon16, icon48, icon128)</div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setIsPaletteOpen(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-white transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Test Overlay Over This Repo</span>
              </button>
            </div>
          </div>
        )}

        {activeTab?.id === 'tab-3' && (
          <div className="p-6 sm:p-10 max-w-3xl mx-auto w-full text-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>From Wikipedia, the free encyclopedia</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Douglas Carl Engelbart (1925–2013)</h2>
            <p className="text-xs text-slate-400 italic mb-4">American engineer, inventor, and early computer and internet pioneer</p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              Douglas Carl Engelbart was best known for his work on founding the field of human–computer interaction, particularly while at his Augmentation Research Center Lab in SRI International, which resulted in creation of the computer mouse, development of basic graphical user interfaces, hypertext, networked computers, and precursor technologies to graphical windowing systems.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              In his legendary 1968 <em>&quot;Mother of All Demos&quot;</em>, Engelbart demonstrated fundamentally new ways humans could collaborate through dynamic, floating windows and real-time command input—the very lineage that modern browser command bars continue today!
            </p>
          </div>
        )}

        {activeTab?.id === 'tab-4' && (
          <div className="p-6 sm:p-8 max-w-3xl mx-auto w-full text-slate-200 animate-in fade-in duration-150">
            <div className="border-b border-amber-500/40 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center rounded">
                  Y
                </span>
                <span className="font-bold text-sm text-white">Hacker News</span>
              </div>
              <span className="text-xs text-slate-400">new | past | comments | ask | show | jobs</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <div className="font-medium text-slate-200 hover:text-sky-300 cursor-pointer">
                  1. Show HN: Arc Tab — A floating command palette extension for any Chromium browser
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  184 points by techlead 3 hours ago | 64 comments
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <div className="font-medium text-slate-200 hover:text-sky-300 cursor-pointer">
                  2. Why modal interfaces outperform traditional browser tabs for cognitive focus
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  92 points by cognitivedesign 5 hours ago | 31 comments
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for other custom tabs */}
        {!['tab-1', 'tab-2', 'tab-3', 'tab-4'].includes(activeTab?.id || '') && (
          <div className="p-10 max-w-2xl mx-auto text-center flex flex-col items-center justify-center min-h-[300px]">
            <Globe className="w-12 h-12 text-sky-400/80 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">{activeTab?.title}</h3>
            <p className="text-xs text-slate-400 font-mono mb-6">{activeTab?.url}</p>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              This simulated page is loaded in your browser window. You can open the Arc Command Bar right over it by pressing <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Alt + T</kbd>.
            </p>
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 transition"
            >
              Open Floating Command Bar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
