'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Globe,
  Calculator,
  Terminal,
  Code,
  Music,
  Settings,
  Sparkles,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Command,
  X,
  Laptop,
  Check,
  Zap,
  Layers,
  FolderOpen,
  Lock,
  VolumeX,
  RotateCw,
  Copy,
  ChevronRight,
  Trash2,
  Plus,
  Play,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  useIsTauri,
  hideDesktopWindow,
  openDesktopUrl,
  launchDesktopApp,
  scanSystemInstalledApps,
  POPULAR_DESKTOP_APPS,
  DesktopAppDefinition
} from '@/lib/desktop-ipc';
import { evaluateSmartQuery, EvaluationResult } from '@/lib/smart-evaluator';

interface LauncherItem {
  id: string;
  type: 'app' | 'calc' | 'search' | 'url' | 'system' | 'ai' | 'copy';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
  category: string;
}

type Favorite = {
  id: string;
  type: 'url' | 'copy';
  title: string;
  value: string;
};

function generateUniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}`;
}

export default function LauncherPage() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isTauri = useIsTauri();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulatedClosed, setIsSimulatedClosed] = useState(false);

  // Settings & Tabs
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'apps' | 'favorites'>('apps');

  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('arc-favorites');
        return stored ? JSON.parse(stored) : [
          { id: 'fav-1', type: 'url', title: 'GitHub', value: 'https://github.com' },
          { id: 'fav-2', type: 'url', title: 'Google Search', value: 'https://google.com' },
          { id: 'fav-3', type: 'copy', title: 'Default Email', value: 'user@example.com' }
        ];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newFavTitle, setNewFavTitle] = useState('');
  const [newFavType, setNewFavType] = useState<'url' | 'copy'>('url');
  const [newFavValue, setNewFavValue] = useState('');

  // Apps Management (Installed & Visibility)
  const [installedApps, setInstalledApps] = useState<DesktopAppDefinition[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('arc-installed-apps');
        return stored ? JSON.parse(stored) : POPULAR_DESKTOP_APPS;
      } catch {
        return POPULAR_DESKTOP_APPS;
      }
    }
    return POPULAR_DESKTOP_APPS;
  });

  const [appVisibility, setAppVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('arc-app-visibility');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [appSearchFilter, setAppSearchFilter] = useState('');
  const [isScanningApps, setIsScanningApps] = useState(false);
  const [newCustomAppName, setNewCustomAppName] = useState('');
  const [newCustomAppCmd, setNewCustomAppCmd] = useState('');
  const [newCustomAppCat, setNewCustomAppCat] = useState('developer');

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scan installed apps on launch
  useEffect(() => {
    inputRef.current?.focus();
    async function loadApps() {
      try {
        const detected = await scanSystemInstalledApps();
        if (detected && detected.length > 0) {
          setInstalledApps(detected);
          if (typeof window !== 'undefined') {
            localStorage.setItem('arc-installed-apps', JSON.stringify(detected));
          }
        }
      } catch (err) {
        console.warn('App scan error:', err);
      }
    }
    loadApps();
  }, []);

  const handleRefreshApps = async () => {
    setIsScanningApps(true);
    try {
      const detected = await scanSystemInstalledApps();
      if (detected && detected.length > 0) {
        setInstalledApps(detected);
        if (typeof window !== 'undefined') {
          localStorage.setItem('arc-installed-apps', JSON.stringify(detected));
        }
        showToast(`Discovered ${detected.length} system apps & tools!`);
      }
    } catch {
      showToast('Finished app discovery scan.');
    } finally {
      setIsScanningApps(false);
    }
  };

  const toggleAppVisibility = (appId: string) => {
    setAppVisibility(prev => {
      const updated = { ...prev, [appId]: prev[appId] === false ? true : false };
      if (typeof window !== 'undefined') {
        localStorage.setItem('arc-app-visibility', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleAddCustomApp = () => {
    if (!newCustomAppName.trim() || !newCustomAppCmd.trim()) return;
    const newApp: DesktopAppDefinition = {
      id: generateUniqueId(),
      name: newCustomAppName.trim(),
      command: newCustomAppCmd.trim(),
      pathOrCommand: newCustomAppCmd.trim(),
      category: newCustomAppCat,
      icon: newCustomAppCat === 'developer' ? 'Code' : 'Laptop',
      enabled: true
    };
    const updated = [newApp, ...installedApps];
    setInstalledApps(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arc-installed-apps', JSON.stringify(updated));
    }
    setNewCustomAppName('');
    setNewCustomAppCmd('');
    showToast(`Added shortcut "${newApp.name}"!`);
  };

  const handleDeleteCustomApp = (appId: string) => {
    const updated = installedApps.filter(a => a.id !== appId);
    setInstalledApps(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arc-installed-apps', JSON.stringify(updated));
    }
    showToast('App shortcut removed.');
  };

  const saveFavorites = (newFavs: Favorite[]) => {
    setFavorites(newFavs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arc-favorites', JSON.stringify(newFavs));
    }
  };

  const handleAddFavorite = () => {
    if (!newFavTitle.trim() || !newFavValue.trim()) return;
    const favId = generateUniqueId();
    saveFavorites([...favorites, { id: favId, type: newFavType, title: newFavTitle.trim(), value: newFavValue.trim() }]);
    setNewFavTitle('');
    setNewFavValue('');
    showToast('Favorite added!');
  };

  const handleDeleteFavorite = (id: string) => {
    saveFavorites(favorites.filter(f => f.id !== id));
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  }, []);

  const handleDismiss = useCallback(async () => {
    if (isTauri) {
      await hideDesktopWindow();
    } else {
      setIsSimulatedClosed(true);
      showToast('Dismissed. Press Alt+Space to summon again.');
    }
  }, [isTauri, showToast]);

  const handleOpen = () => {
    setIsSimulatedClosed(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global hotkey simulation for web mode: Alt+Space or Cmd+Space
      if ((e.altKey && e.code === 'Space') || (e.metaKey && e.code === 'Space')) {
        e.preventDefault();
        setIsSimulatedClosed(prev => !prev);
        if (isSimulatedClosed) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        return;
      }

      if (isSimulatedClosed) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSettings) {
          setShowSettings(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          handleDismiss();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulatedClosed, isTauri, handleDismiss, showSettings]);

  // Instant smart calculation & equation evaluator
  const smartEval = useMemo<EvaluationResult | null>(() => {
    return evaluateSmartQuery(query);
  }, [query]);

  // Execute App Launch
  const executeAppLaunch = useCallback(async (app: DesktopAppDefinition) => {
    const cmd = app.pathOrCommand || app.command;
    if (cmd) {
      const launched = await launchDesktopApp(cmd);
      if (launched) {
        showToast(`Launched ${app.name}`);
        return;
      }
    }
    if (app.url) {
      await openDesktopUrl(app.url);
      showToast(`Opening ${app.name}...`);
    } else {
      showToast(`Launched "${app.name}" (${cmd || 'Desktop command'})`);
      handleDismiss();
    }
  }, [handleDismiss, showToast]);

  // Handle AI question with multi-tier intelligence
  const askAi = useCallback(async (prompt: string) => {
    setAiGenerating(true);
    setAiResponse(null);
    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // Instant local intelligence for common queries
    if (/^(hi|hello|hey|greetings|hola)\b/i.test(lower)) {
      setTimeout(() => {
        setAiResponse("Hello! I am Arc Desktop Intelligence. Type any app name, calculation, math problem, or search query to launch instantly.");
        setAiGenerating(false);
      }, 150);
      return;
    }

    if (/^(who are you|what is this|about)\b/i.test(lower)) {
      setTimeout(() => {
        setAiResponse("I am Arc Desktop Command Palette — an ultra-fast, native system launcher with global hotkey (Alt+Space), app execution, instant math solver, and AI assistance.");
        setAiGenerating(false);
      }, 150);
      return;
    }

    if (/^(help|commands|shortcuts)\b/i.test(lower)) {
      setTimeout(() => {
        setAiResponse("• Alt+Space to summon/hide anywhere\n• Type math (e.g. 15% of 850 or 140 * 12) for instant calculation\n• Shift+Enter to query AI\n• Manage Apps/Favorites in Settings");
        setAiGenerating(false);
      }, 150);
      return;
    }

    try {
      const apiUrl = isTauri 
        ? 'https://ais-pre-2x62xwyv5k44ctho6fh4yo-329522455645.asia-southeast1.run.app/api/gemini/generate' 
        : '/api/gemini/generate';
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are Arc Desktop AI Assistant. Answer concisely in 2 sentences or bullet points: ${cleanPrompt}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.text || `Summary for: "${cleanPrompt}"`);
      } else {
        if (smartEval) {
          setAiResponse(`${smartEval.result}. ${smartEval.explanation || ''}`);
        } else {
          setAiResponse(`Query: "${cleanPrompt}". Press Enter to open results in your default browser.`);
        }
      }
    } catch {
      if (smartEval) {
        setAiResponse(`${smartEval.result}. ${smartEval.explanation || ''}`);
      } else {
        setAiResponse(`Search Web: "${cleanPrompt}" (Press Enter to open in browser)`);
      }
    } finally {
      setAiGenerating(false);
    }
  }, [smartEval, isTauri]);

  // Build items list based on query
  const items = useMemo<LauncherItem[]>(() => {
    const list: LauncherItem[] = [];
    const q = query.trim().toLowerCase();

    // 0. User Saved Favorites
    favorites.forEach(fav => {
      if (!q || fav.title.toLowerCase().includes(q) || fav.value.toLowerCase().includes(q)) {
        list.push({
          id: `fav-${fav.id}`,
          type: fav.type,
          title: fav.title,
          subtitle: fav.type === 'url' ? `Open: ${fav.value}` : `Copy to clipboard: ${fav.value}`,
          icon: fav.type === 'url' ? Globe : Copy,
          category: 'Favorites',
          badge: fav.type === 'url' ? 'Link' : 'Copy',
          action: () => {
            if (fav.type === 'url') {
              openDesktopUrl(fav.value);
            } else {
              navigator.clipboard.writeText(fav.value);
              showToast(`Copied "${fav.title}" to clipboard!`);
              handleDismiss();
            }
          }
        });
      }
    });

    // 1. Instant Equation / Math evaluation result
    if (smartEval) {
      list.push({
        id: 'smart-eval-result',
        type: 'calc',
        title: smartEval.result,
        subtitle: smartEval.explanation || `Result for "${query}" (Press Enter to copy)`,
        icon: Calculator,
        category: 'Calculation',
        badge: smartEval.badge,
        action: () => {
          navigator.clipboard.writeText(smartEval.result);
          showToast(`Copied ${smartEval.result} to clipboard!`);
          handleDismiss();
        }
      });
    }

    // 2. Direct URL match
    const looksLikeUrl = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(query.trim());
    if (looksLikeUrl) {
      const fullUrl = query.startsWith('http://') || query.startsWith('https://') ? query : `https://${query}`;
      list.push({
        id: 'url-match',
        type: 'url',
        title: `Open ${query}`,
        subtitle: `Launch directly in default browser: ${fullUrl}`,
        icon: Globe,
        category: 'Direct URL',
        badge: 'Enter',
        action: () => {
          openDesktopUrl(fullUrl);
        }
      });
    }

    // 3. User Enabled Installed System Apps & Tools
    installedApps.forEach(app => {
      // Check if user has disabled this app
      if (appVisibility[app.id] === false) return;

      if (!q || app.name.toLowerCase().includes(q) || (app.command && app.command.toLowerCase().includes(q)) || (app.category && app.category.toLowerCase().includes(q))) {
        let AppIcon: React.ComponentType<{ className?: string }> = Terminal;
        if (app.icon === 'Code') AppIcon = Code;
        else if (app.icon === 'Music') AppIcon = Music;
        else if (app.icon === 'Settings') AppIcon = Settings;
        else if (app.icon === 'Calculator') AppIcon = Calculator;
        else if (app.icon === 'Globe') AppIcon = Globe;
        else if (app.icon === 'FolderOpen') AppIcon = FolderOpen;
        else if (app.icon === 'Laptop') AppIcon = Laptop;

        list.push({
          id: app.id,
          type: 'app',
          title: app.name,
          subtitle: `Launch application (${app.category || 'System'})`,
          icon: AppIcon,
          category: 'Applications',
          badge: 'App',
          action: () => {
            executeAppLaunch(app);
          }
        });
      }
    });

    // 4. Quick System Commands
    const systemCommands = [
      { id: 'sys-settings', title: 'Arc Desktop Settings & App Manager', subtitle: 'Toggle app visibility, manage bookmarks and shortcuts', icon: Sliders, command: 'settings' },
      { id: 'sys-calc', title: 'Open Calculator', subtitle: 'Quick access to desktop math tool', icon: Calculator, command: 'calc' },
      { id: 'sys-lock', title: 'Lock Screen', subtitle: 'Lock current desktop session', icon: Lock, command: 'lock' },
      { id: 'sys-mute', title: 'Mute / Unmute Audio', subtitle: 'Toggle master system volume', icon: VolumeX, command: 'mute' },
      { id: 'sys-downloads', title: 'Open Downloads Folder', subtitle: 'Reveal files in Explorer / Finder', icon: FolderOpen, command: 'downloads' },
      { id: 'sys-reload', title: 'Reload Command Palette', subtitle: 'Restart palette background process', icon: RotateCw, command: 'reload' },
    ];

    systemCommands.forEach(cmd => {
      if (!q || cmd.title.toLowerCase().includes(q) || cmd.command.includes(q)) {
        list.push({
          id: cmd.id,
          type: 'system',
          title: cmd.title,
          subtitle: cmd.subtitle,
          icon: cmd.icon,
          category: 'System',
          badge: 'System',
          action: () => {
            if (cmd.id === 'sys-settings') {
              setShowSettings(true);
              setQuery('');
            } else if (cmd.id === 'sys-calc') {
              launchDesktopApp('calc');
              showToast('Launching Calculator...');
            } else {
              showToast(`Executed: ${cmd.title}`);
              handleDismiss();
            }
          }
        });
      }
    });

    // 5. AI Query & Web Search when user types
    if (q) {
      list.push({
        id: 'web-google',
        type: 'search',
        title: `Search Google for "${query}"`,
        subtitle: 'Open web search in default browser (Enter)',
        icon: Globe,
        category: 'Web Search',
        badge: 'Search',
        action: () => {
          openDesktopUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        }
      });

      list.push({
        id: 'ai-prompt',
        type: 'ai',
        title: `Ask AI: "${query}"`,
        subtitle: 'Get instantaneous inline AI summary (Shift + Enter)',
        icon: Sparkles,
        category: 'Intelligence',
        badge: 'Gemini',
        action: () => {
          askAi(query);
        }
      });
    }

    return list;
  }, [query, smartEval, askAi, handleDismiss, showToast, favorites, installedApps, appVisibility, executeAppLaunch]);

  const activeIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1) : 0;

  const handleItemSelect = (item: LauncherItem) => {
    item.action();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey && query.trim()) {
        askAi(query);
      } else if (items[activeIndex]) {
        handleItemSelect(items[activeIndex]);
      }
    }
  };

  // Filtered list for Settings App Manager
  const filteredSettingsApps = useMemo(() => {
    if (!appSearchFilter.trim()) return installedApps;
    const f = appSearchFilter.toLowerCase();
    return installedApps.filter(a => a.name.toLowerCase().includes(f) || (a.command && a.command.toLowerCase().includes(f)));
  }, [installedApps, appSearchFilter]);

  return (
    <div className="min-h-screen w-full bg-transparent text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 selection:bg-sky-500/30 selection:text-sky-200">
      {/* If dismissed in web simulation mode, show a summon button */}
      {isSimulatedClosed && !isTauri && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 rounded-full px-5 py-2.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs text-slate-300 font-medium">Arc Desktop is running in background</span>
          <button
            onClick={handleOpen}
            className="px-2.5 py-1 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
          >
            <span>Summon (<kbd className="font-mono text-[10px]">Alt+Space</kbd>)</span>
          </button>
        </div>
      )}

      {/* Main Floating Arc Command Window */}
      <div
        className={`w-full max-w-2xl transition-all duration-200 ${
          isSimulatedClosed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* Top Header / Mode Badge */}
        <div className="flex items-center justify-between px-2 pb-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">
              {isTauri ? 'Arc Desktop Native (Tauri)' : 'Arc Desktop Window'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
              Alt + Space
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                if (showSettings) setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className={`p-1.5 rounded-md transition ${showSettings ? 'bg-sky-500 text-slate-950' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
              title="Arc Settings & App Manager"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Hide Window (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Card Container */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden flex flex-col transition-all relative">
          {showSettings ? (
            <div className="flex flex-col h-[520px]">
              {/* Settings Header with Tab Switcher */}
              <div className="p-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title="Back to search"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setSettingsTab('apps')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'apps' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Manage Apps ({installedApps.length})</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('favorites')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'favorites' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Bookmarks & Links ({favorites.length})</span>
                    </button>
                  </div>
                </div>

                {settingsTab === 'apps' && (
                  <button
                    onClick={handleRefreshApps}
                    disabled={isScanningApps}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
                    title="Scan PC for installed apps"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningApps ? 'animate-spin text-sky-400' : ''}`} />
                    <span className="hidden sm:inline">Scan Apps</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Manage Apps & Visibility */}
              {settingsTab === 'apps' ? (
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                  {/* Search / Filter Installed Apps */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                        placeholder="Filter system apps or commands..."
                        value={appSearchFilter}
                        onChange={e => setAppSearchFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Add Custom App Accordion / Form */}
                  <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Add Custom App or Command Shortcut</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                        placeholder="App Name (e.g. IntelliJ, Blender)"
                        value={newCustomAppName}
                        onChange={e => setNewCustomAppName(e.target.value)}
                      />
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                        placeholder="Command or Path (e.g. blender, C:\...)"
                        value={newCustomAppCmd}
                        onChange={e => setNewCustomAppCmd(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleAddCustomApp}
                      disabled={!newCustomAppName.trim() || !newCustomAppCmd.trim()}
                      className="w-full bg-slate-800 hover:bg-sky-500 hover:text-slate-950 disabled:opacity-40 text-slate-200 font-semibold py-1.5 rounded-lg text-xs transition border border-slate-700"
                    >
                      Save App Shortcut
                    </button>
                  </div>

                  {/* Installed Apps Checklist */}
                  <div className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
                      <span>Application Name</span>
                      <span>Visibility & Test Launch</span>
                    </div>

                    {filteredSettingsApps.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-700 rounded-xl">
                        No apps found matching &quot;{appSearchFilter}&quot;.
                      </div>
                    ) : (
                      filteredSettingsApps.map(app => {
                        const isVisible = appVisibility[app.id] !== false;
                        return (
                          <div
                            key={app.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition ${isVisible ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-950/40 border-slate-800/60 opacity-60'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                                <Laptop className="w-3.5 h-3.5 text-sky-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-white font-medium truncate">{app.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{app.pathOrCommand || app.command}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => executeAppLaunch(app)}
                                className="px-2 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                                title="Test launch application"
                              >
                                <Play className="w-3 h-3" />
                                <span>Launch</span>
                              </button>

                              <button
                                onClick={() => toggleAppVisibility(app.id)}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition ${isVisible ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                title={isVisible ? 'Visible in launcher (click to hide)' : 'Hidden from launcher (click to show)'}
                              >
                                {isVisible ? <Eye className="w-3 h-3 text-sky-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                                <span>{isVisible ? 'Visible' : 'Hidden'}</span>
                              </button>

                              {app.id.startsWith('id-') && (
                                <button
                                  onClick={() => handleDeleteCustomApp(app.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 transition"
                                  title="Delete custom shortcut"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Tab 2: Favorites / Links */
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                  {/* Add Bookmark Form */}
                  <div className="space-y-3 p-3.5 bg-slate-800/30 rounded-xl border border-slate-700/50">
                    <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Add Saved URL or Clipboard Snippet</span>
                    </h3>
                    <input
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
                      placeholder="Title (e.g. Work Email, Figma, Docs)"
                      value={newFavTitle}
                      onChange={e => setNewFavTitle(e.target.value)}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 w-full sm:w-1/3"
                        value={newFavType}
                        onChange={e => setNewFavType(e.target.value as 'url' | 'copy')}
                      >
                        <option value="url">Open Web Link</option>
                        <option value="copy">Copy Text to Clipboard</option>
                      </select>
                      <input
                        className="flex-1 bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
                        placeholder={newFavType === 'url' ? 'https://... or site.com' : 'Text to copy...'}
                        value={newFavValue}
                        onChange={e => setNewFavValue(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleAddFavorite}
                      disabled={!newFavTitle.trim() || !newFavValue.trim()}
                      className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold py-2 rounded-lg text-xs transition"
                    >
                      Save Bookmark
                    </button>
                  </div>

                  {/* Favorites List */}
                  <div className="space-y-1.5 pb-2">
                    <h3 className="text-xs font-semibold text-slate-300 px-1">Saved Bookmarks</h3>
                    {favorites.length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-700 rounded-xl">
                        No saved links yet. Add one above!
                      </div>
                    )}
                    {favorites.map(f => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="text-xs text-white font-medium flex items-center gap-1.5 truncate">
                            {f.type === 'url' ? <Globe className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                            {f.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{f.value}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {f.type === 'url' ? (
                            <button
                              onClick={() => openDesktopUrl(f.value)}
                              className="px-2 py-1 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                              title="Open link in default browser"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(f.value);
                                showToast(`Copied "${f.title}"!`);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteFavorite(f.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-md"
                            title="Delete bookmark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Input Bar */}
              <div className="p-4 flex items-center gap-3.5 border-b border-slate-800/80 bg-slate-950/40">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 p-0.5 shadow-md shadow-sky-500/10 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Search className="w-4 h-4 text-sky-400" />
                  </div>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search apps, type a calculation (e.g. 140 * 12), or ask AI..."
                  className="w-full bg-transparent text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none tracking-tight font-normal"
                  autoFocus
                />

                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* AI Response Panel */}
              {(aiGenerating || aiResponse) && (
                <div className="p-3.5 bg-sky-950/30 border-b border-sky-800/40 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {aiGenerating ? (
                      <div className="flex items-center gap-2 text-sky-300">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-sky-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <span>Arc Intelligence</span>
                        </div>
                        <p className="whitespace-pre-line text-slate-100">{aiResponse}</p>
                        {query && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => openDesktopUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`)}
                              className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-md text-xs font-medium transition flex items-center gap-1 border border-sky-500/30"
                            >
                              <Globe className="w-3 h-3" />
                              <span>Search Web for &quot;{query}&quot;</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setAiResponse(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Results List */}
              <div
                ref={listRef}
                className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
              >
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No matching apps or commands found for &quot;{query}&quot;.
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const isSelected = idx === activeIndex;
                    const IconComponent = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className="pt-1 first:pt-0 cursor-pointer group"
                      >
                        <div
                          className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-sky-500/15 border border-sky-500/30 text-white'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                              }`}
                            >
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate tracking-tight text-white">
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight
                              className={`w-4 h-4 text-slate-500 transition-transform ${
                                isSelected ? 'translate-x-0.5 text-sky-400' : 'opacity-0'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Bar */}
              <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      ↑↓
                    </kbd>
                    <span className="hidden sm:inline">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      Enter
                    </kbd>
                    <span>Open/Launch</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      ⇧+Enter
                    </kbd>
                    <span>Ask AI</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      Esc
                    </kbd>
                    <span className="hidden sm:inline">Dismiss</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Arc Desktop v0.1.0</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 z-50">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

