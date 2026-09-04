'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ArrowLeft,
  X,
  Laptop,
  Check,
  Zap,
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
  Sliders,
  Key,
  Bot,
  Compass,
  ArrowDownCircle,
  Download,
  CheckCircle2,
  Send,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  checkForAppUpdates,
  applyAppUpdate,
  restartApplication,
  getAutoCheckUpdates,
  setAutoCheckUpdates,
  UpdateInfo,
  GITHUB_RELEASES_PAGE,
} from '@/lib/updater-service';
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
import {
  queryGeminiAi,
  queryAgenticAi,
  getStoredApiKey,
  saveStoredApiKey,
  getStoredModel,
  saveStoredModel,
  AiChatMessage
} from '@/lib/ai-service';
import {
  SearchBang,
  getStoredBangs,
  saveStoredBangs,
  addSearchBang,
  deleteSearchBang,
  DEFAULT_SEARCH_BANGS,
  detectLocalAgentAction
} from '@/lib/agentic-ai';

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
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const followUpInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulatedClosed, setIsSimulatedClosed] = useState(false);

  // Settings & Tabs
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'apps' | 'bangs' | 'favorites' | 'ai' | 'updates'>('apps');

  // Auto-Updater State
  const [autoCheckUpdates, setAutoCheckUpdatesState] = useState<boolean>(() => getAutoCheckUpdates());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [detectedUpdate, setDetectedUpdate] = useState<UpdateInfo | null>(null);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateReadyRestart, setUpdateReadyRestart] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Search Bangs State
  const [searchBangs, setSearchBangs] = useState<SearchBang[]>(() => getStoredBangs());
  const [newBangPrefix, setNewBangPrefix] = useState('');
  const [newBangName, setNewBangName] = useState('');
  const [newBangUrl, setNewBangUrl] = useState('');
  const [newBangExample, setNewBangExample] = useState('');

  // AI Configuration State in Settings
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => getStoredModel());
  const [isTestingAiKey, setIsTestingAiKey] = useState(false);
  const [aiKeyTestResult, setAiKeyTestResult] = useState<string | null>(null);

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleDismiss = useCallback(async () => {
    if (isTauri) {
      await hideDesktopWindow();
    } else {
      setIsSimulatedClosed(true);
    }
  }, [isTauri]);

  const handleOpen = useCallback(() => {
    setIsSimulatedClosed(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

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

  // Search Bangs Management
  const handleAddBang = () => {
    if (!newBangPrefix.trim() || !newBangUrl.trim()) return;
    const bang = addSearchBang(newBangPrefix, newBangName || newBangPrefix, newBangUrl, newBangExample);
    setSearchBangs(getStoredBangs());
    setNewBangPrefix('');
    setNewBangName('');
    setNewBangUrl('');
    setNewBangExample('');
    showToast(`Created search shortcut "!${bang.prefix}" for ${bang.name}!`);
  };

  const handleDeleteBang = (prefix: string) => {
    deleteSearchBang(prefix);
    setSearchBangs(getStoredBangs());
    showToast(`Deleted bang "!${prefix}".`);
  };

  const handleResetBangs = () => {
    saveStoredBangs(DEFAULT_SEARCH_BANGS);
    setSearchBangs(DEFAULT_SEARCH_BANGS);
    showToast('Reset search bangs to defaults.');
  };

  // Favorites Management
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

  const handleDeleteFavorite = (favId: string) => {
    const updated = favorites.filter(f => f.id !== favId);
    saveFavorites(updated);
    showToast('Favorite removed');
  };

  const handleSaveApiKey = () => {
    saveStoredApiKey(apiKeyInput);
    saveStoredModel(selectedModel);
    showToast('AI API Settings saved!');
  };

  const handleTestAiKey = async () => {
    if (!apiKeyInput.trim()) {
      setAiKeyTestResult('⚠️ Please enter an API key first.');
      return;
    }
    setIsTestingAiKey(true);
    setAiKeyTestResult(null);
    saveStoredApiKey(apiKeyInput);
    saveStoredModel(selectedModel);
    try {
      const res = await queryGeminiAi('Say "Connection Successful! Gemini API is active." in one sentence.');
      setAiKeyTestResult(`✅ ${res}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAiKeyTestResult(`❌ Connection failed: ${errorMsg}`);
    } finally {
      setIsTestingAiKey(false);
    }
  };

  // Silently check for updates on mount if auto-check is enabled
  useEffect(() => {
    if (!autoCheckUpdates) return;
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const info = await checkForAppUpdates();
        if (isMounted && info.available) {
          setDetectedUpdate(info);
          setShowUpdateBanner(true);
        }
      } catch (err) {
        console.warn('Auto update check error:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [autoCheckUpdates]);

  const handleCheckUpdatesManually = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusText('Checking for new releases...');
    try {
      const info = await checkForAppUpdates();
      setDetectedUpdate(info);
      if (info.available) {
        setUpdateStatusText(`New release available: ${info.latestVersion}`);
        showToast(`Update available: ${info.latestVersion}`);
        setShowUpdateBanner(true);
      } else {
        setUpdateStatusText(`Arc Desktop is up to date (v${CURRENT_APP_VERSION})`);
        showToast(`Arc Desktop is up to date (v${CURRENT_APP_VERSION})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateStatusText(`Check failed: ${msg}`);
      showToast('Could not check for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!detectedUpdate) return;
    setUpdateProgress(0);
    setUpdateStatusText('Connecting to update server...');
    try {
      const result = await applyAppUpdate(detectedUpdate, (pct, status) => {
        setUpdateProgress(pct);
        setUpdateStatusText(status);
      });
      if (result.success) {
        setUpdateReadyRestart(true);
        showToast(result.message);
      } else {
        showToast(result.message);
        setUpdateProgress(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateStatusText(`Installation failed: ${msg}`);
      showToast('Update failed: ' + msg);
      setUpdateProgress(null);
    }
  };

  const handleRestartApp = async () => {
    showToast('Restarting Arc Desktop...');
    await restartApplication();
  };

  const handleSimulateUpdateFlow = () => {
    setDetectedUpdate({
      available: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: 'v0.2.0',
      releaseDate: new Date().toLocaleDateString(),
      notes: '• Added automated background updater with signature verification\n• Added agentic AI natural language action execution\n• Optimized Alt+Space launcher response latency',
      isNativeTauri: isTauri,
    });
    setShowUpdateBanner(true);
    setUpdateReadyRestart(false);
    setUpdateProgress(null);
    setUpdateStatusText('Simulated release v0.2.0 ready to test');
    showToast('Simulated update v0.2.0 loaded');
  };

  // Global key listener for hotkey and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        if (isSimulatedClosed) {
          handleOpen();
        } else {
          handleDismiss();
        }
      }

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
  }, [isSimulatedClosed, isTauri, handleDismiss, handleOpen, showSettings]);

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

  // Handle Agentic AI with automated tool execution & multi-turn follow-up
  const askAi = useCallback(async (prompt: string, isFollowUp: boolean = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: cleanPrompt,
      timestamp: Date.now()
    };

    const historyForQuery = isFollowUp ? aiMessages : [];
    const baseMessages = isFollowUp ? [...aiMessages, userMsg] : [userMsg];
    setAiMessages(baseMessages);
    setAiGenerating(true);
    setFollowUpInput('');

    if (!isFollowUp) {
      setQuery('');
    }

    try {
      const res = await queryAgenticAi(cleanPrompt, historyForQuery);
      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        text: res.text,
        actionExecuted: res.actionExecuted,
        timestamp: Date.now()
      };
      setAiMessages(prev => [...prev, assistantMsg]);

      if (res.actionExecuted) {
        // Sync state from storage if agent created bangs, bookmarks, or apps
        setSearchBangs(getStoredBangs());
        if (typeof window !== 'undefined') {
          try {
            const favs = localStorage.getItem('arc-favorites');
            if (favs) setFavorites(JSON.parse(favs));
            const apps = localStorage.getItem('arc-installed-apps');
            if (apps) setInstalledApps(JSON.parse(apps));
          } catch {}
        }
        showToast(res.actionExecuted.summary);
      }
    } catch {
      let fallbackText = `Query: "${cleanPrompt}". Press Enter to open results in browser.`;
      if (smartEval) {
        fallbackText = `${smartEval.result}. ${smartEval.explanation || ''}`;
      }
      setAiMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setAiGenerating(false);
      setTimeout(() => {
        followUpInputRef.current?.focus();
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [aiMessages, smartEval, showToast]);

  const copyFullConversation = useCallback(() => {
    if (aiMessages.length === 0) return;
    const transcript = aiMessages
      .map(m => `### ${m.role === 'user' ? 'User' : 'Arc Intelligence'}\n${m.text}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(transcript);
    showToast('Full conversation copied to clipboard!');
  }, [aiMessages, showToast]);

  const suggestedFollowUps = useMemo(() => {
    if (aiMessages.length === 0) return [];
    const lastUser = [...aiMessages].reverse().find(m => m.role === 'user')?.text.toLowerCase() || '';
    const lastAi = [...aiMessages].reverse().find(m => m.role === 'assistant')?.text.toLowerCase() || '';
    const combined = lastUser + ' ' + lastAi;

    const suggestions: string[] = [];
    if (combined.includes('python') || combined.includes('code') || combined.includes('rust') || combined.includes('function') || combined.includes('git')) {
      if (!combined.includes('rust')) suggestions.push('In Rust');
      if (!combined.includes('python')) suggestions.push('In Python');
      suggestions.push('Explain step-by-step');
      suggestions.push('Show practical example');
    } else if (combined.includes('shortcut') || combined.includes('bang') || combined.includes('search')) {
      suggestions.push('Create shortcut for this');
      suggestions.push('Explain how bangs work');
      suggestions.push('Give another example');
    } else {
      suggestions.push('Explain in more detail');
      suggestions.push('Give an example');
      suggestions.push('Summarize key points');
    }
    return suggestions.slice(0, 3);
  }, [aiMessages]);

  // Build Results List
  const items = useMemo<LauncherItem[]>(() => {
    const list: LauncherItem[] = [];
    const q = query.trim().toLowerCase();

    // 0. Check for Agentic Action Intent directly from search query
    // e.g. "add shortcut eb for ebay" or "create bang rd for reddit"
    if (q) {
      const detectedAction = detectLocalAgentAction(query);
      if (detectedAction) {
        list.push({
          id: 'agentic-action-preview',
          type: 'ai',
          title: `⚡ Execute Action: ${detectedAction.summary.replace(/[*_`]/g, '')}`,
          subtitle: 'Press Enter to have Arc Agent configure this shortcut immediately',
          icon: Sparkles,
          category: 'Agent Action',
          badge: 'Agentic AI',
          action: () => {
            askAi(query, aiMessages.length > 0);
          }
        });
      }
    }

    // 1. Check for Search Bang Prefix (e.g. "yt lofi hip hop", "gh tauri", "rd mechanical keyboards")
    const bangPrefixMatch = query.match(/^([a-z0-9_-]+)\s+(.*)$/i);
    if (bangPrefixMatch) {
      const enteredPrefix = bangPrefixMatch[1].toLowerCase();
      const queryRemainder = bangPrefixMatch[2].trim();
      const matchedBang = searchBangs.find(b => b.prefix === enteredPrefix);
      if (matchedBang && queryRemainder) {
        const targetUrl = matchedBang.urlTemplate.replace('{q}', encodeURIComponent(queryRemainder));
        list.push({
          id: `bang-exec-${matchedBang.id}`,
          type: 'url',
          title: `Search ${matchedBang.name} for "${queryRemainder}"`,
          subtitle: `Launch direct URL: ${targetUrl}`,
          icon: Compass,
          category: 'Search Bangs',
          badge: `!${matchedBang.prefix}`,
          action: () => {
            openDesktopUrl(targetUrl);
          }
        });
      }
    } else if (q) {
      // If user typed only a bang prefix (e.g. "yt", "gh"), show hint card
      const exactBang = searchBangs.find(b => b.prefix === q);
      if (exactBang) {
        list.push({
          id: `bang-hint-${exactBang.id}`,
          type: 'search',
          title: `${exactBang.name} Search (!${exactBang.prefix})`,
          subtitle: `Type "${exactBang.prefix} <search query>" (e.g. "${exactBang.prefix} ${exactBang.exampleQuery || 'hello'}")`,
          icon: Compass,
          category: 'Search Bangs',
          badge: `!${exactBang.prefix}`,
          action: () => {
            setQuery(`${exactBang.prefix} `);
          }
        });
      }
    }

    // 2. User Saved Favorites
    favorites.forEach(fav => {
      if (!q || fav.title.toLowerCase().includes(q) || fav.value.toLowerCase().includes(q)) {
        list.push({
          id: fav.id,
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

    // 3. Instant Equation / Math evaluation result
    if (smartEval) {
      list.push({
        id: 'smart-eval-result',
        type: 'calc',
        title: smartEval.result,
        subtitle: smartEval.explanation || `Instant calculation for "${query}"`,
        icon: Calculator,
        category: 'Instant Calculation',
        badge: 'Enter to Copy',
        action: () => {
          navigator.clipboard.writeText(smartEval.result);
          showToast(`Copied "${smartEval.result}" to clipboard!`);
          handleDismiss();
        }
      });
    }

    // 4. Direct URL match
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

    // 5. User Enabled Installed System Apps & Tools
    installedApps.forEach(app => {
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

    // 6. Quick System Commands
    const systemCommands = [
      { id: 'sys-settings', title: 'Arc Desktop Settings & App Manager', subtitle: 'Toggle app visibility, manage search bangs and bookmarks', icon: Sliders, command: 'settings' },
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

    // 7. AI Query & Web Search when user types
    if (q) {
      const isFollowUp = aiMessages.length > 0;
      list.push({
        id: 'ai-prompt',
        type: 'ai',
        title: isFollowUp ? `Ask AI Follow-Up: "${query}"` : `Ask Arc Intelligence: "${query}"`,
        subtitle: isFollowUp
          ? 'Continue current conversation with context (Shift + Enter)'
          : 'Get inline AI answers or execute agent actions (Shift + Enter)',
        icon: Sparkles,
        category: isFollowUp ? 'AI Follow-Up' : 'Intelligence',
        badge: isFollowUp ? 'Follow-Up' : 'Gemini',
        action: () => {
          askAi(query, isFollowUp);
        }
      });

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
    }

    return list;
  }, [query, smartEval, askAi, handleDismiss, showToast, favorites, installedApps, appVisibility, executeAppLaunch, searchBangs, aiMessages]);

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
        askAi(query, aiMessages.length > 0);
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

        {/* Update Notification Banner */}
        {showUpdateBanner && detectedUpdate && (
          <div className="mb-2 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-emerald-500/20 border border-sky-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-sky-200 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>
                Arc Desktop <strong>{detectedUpdate.latestVersion || 'Update'}</strong> is available!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setSettingsTab('updates');
                }}
                className="px-2.5 py-1 bg-sky-500 text-slate-950 font-bold rounded-md hover:bg-sky-400 transition text-[11px] shadow-sm"
              >
                View & Install
              </button>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className="p-1 text-slate-400 hover:text-white transition rounded"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Command Card Container */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden flex flex-col transition-all relative">
          {showSettings ? (
            <div className="flex flex-col h-[520px]">
              {/* Settings Header with Tab Switcher */}
              <div className="p-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                    title="Back to search"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
                    <button
                      onClick={() => setSettingsTab('apps')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'apps' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Apps ({installedApps.length})</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('bangs')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'bangs' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Bangs ({searchBangs.length})</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('favorites')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'favorites' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Links ({favorites.length})</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('ai')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'ai' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI & Agent</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('updates')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${settingsTab === 'updates' ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>Updates {detectedUpdate?.available ? '●' : ''}</span>
                    </button>
                  </div>
                </div>

                {settingsTab === 'apps' && (
                  <button
                    onClick={handleRefreshApps}
                    disabled={isScanningApps}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50 shrink-0"
                    title="Scan PC for installed apps"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningApps ? 'animate-spin text-sky-400' : ''}`} />
                    <span className="hidden sm:inline">Scan</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Manage Apps & Visibility */}
              {settingsTab === 'apps' ? (
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
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

                  {/* Add Custom App */}
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
              ) : settingsTab === 'bangs' ? (
                /* Tab 2: Search Bangs & Shortcuts */
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                  {/* Add New Search Bang */}
                  <div className="p-3.5 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>Create Custom Search Bang</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Or ask AI: <span className="text-sky-300 font-mono">&quot;create shortcut eb for ebay&quot;</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        placeholder="Prefix (e.g. eb, rd)"
                        value={newBangPrefix}
                        onChange={e => setNewBangPrefix(e.target.value)}
                      />
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 sm:col-span-2"
                        placeholder="Service Name (e.g. eBay, Reddit)"
                        value={newBangName}
                        onChange={e => setNewBangName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 sm:col-span-2"
                        placeholder="Search URL template with {q} (e.g. https://site.com/search?q={q})"
                        value={newBangUrl}
                        onChange={e => setNewBangUrl(e.target.value)}
                      />
                      <input
                        className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                        placeholder="Example (e.g. watch)"
                        value={newBangExample}
                        onChange={e => setNewBangExample(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleAddBang}
                      disabled={!newBangPrefix.trim() || !newBangUrl.trim()}
                      className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold py-2 rounded-lg text-xs transition"
                    >
                      Save Search Bang
                    </button>
                  </div>

                  {/* Registered Bangs List */}
                  <div className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
                      <span>Search Shortcuts ({searchBangs.length})</span>
                      <button
                        onClick={handleResetBangs}
                        className="text-sky-400 hover:underline text-[11px]"
                      >
                        Reset Defaults
                      </button>
                    </div>

                    {searchBangs.map(bang => (
                      <div
                        key={bang.id}
                        className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="text-xs text-white font-medium flex items-center gap-2">
                            <span className="font-mono text-sky-300 font-bold bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded text-[11px]">
                              {bang.prefix}
                            </span>
                            <span>{bang.name}</span>
                            {bang.builtin && (
                              <span className="text-[10px] text-slate-500">Built-in</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {bang.urlTemplate}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              const testUrl = bang.urlTemplate.replace('{q}', encodeURIComponent(bang.exampleQuery || 'hello'));
                              openDesktopUrl(testUrl);
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                            title="Test search"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Test</span>
                          </button>

                          {!bang.builtin && (
                            <button
                              onClick={() => handleDeleteBang(bang.prefix)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-md"
                              title="Delete search bang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : settingsTab === 'favorites' ? (
                /* Tab 3: Favorites / Links */
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
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
              ) : settingsTab === 'ai' ? (
                /* Tab 4: AI & Agent Configuration */
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-semibold text-white">Google Gemini AI Setup</h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                        Agentic Function Calling Active
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                        <span>Gemini API Key</span>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>Get Free Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKeyInput}
                          onChange={e => setApiKeyInput(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Stored locally in your desktop client. Powers live reasoning and automatic shortcut creation.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 font-medium">Model Selection</label>
                      <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-Fast & Recommended)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveApiKey}
                        className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 rounded-lg text-xs transition"
                      >
                        Save AI Preferences
                      </button>
                      <button
                        onClick={handleTestAiKey}
                        disabled={isTestingAiKey}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 rounded-lg text-xs transition border border-slate-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingAiKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Play className="w-3.5 h-3.5" />}
                        <span>Test Key</span>
                      </button>
                    </div>

                    {aiKeyTestResult && (
                      <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-200">
                        {aiKeyTestResult}
                      </div>
                    )}

                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-300">Agentic Voice & Command Examples:</div>
                      <div>• &quot;create a shortcut eb to search ebay&quot;</div>
                      <div>• &quot;add search bang amz for amazon&quot;</div>
                      <div>• &quot;bookmark https://linear.app as Linear&quot;</div>
                      <div>• &quot;save snippet :email with myemail@domain.com&quot;</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 5: Updates & Maintenance */
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  {/* Current App Version & Environment */}
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <ArrowDownCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-white">Arc Desktop Auto-Updater</h3>
                          <p className="text-[11px] text-slate-400">
                            Current Version: <span className="font-mono text-sky-300 font-semibold">v{CURRENT_APP_VERSION}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${
                        isTauri ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {isTauri ? 'Tauri Native Mode' : 'Web Simulation'}
                      </span>
                    </div>

                    {/* Auto-check Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                      <div>
                        <span className="text-xs text-slate-200 font-medium block">Automatic Update Checks</span>
                        <span className="text-[11px] text-slate-400 block">Silently check for new versions on application launch</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !autoCheckUpdates;
                          setAutoCheckUpdatesState(next);
                          setAutoCheckUpdates(next);
                          showToast(next ? 'Automatic update checks enabled' : 'Automatic update checks disabled');
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative ${autoCheckUpdates ? 'bg-sky-500' : 'bg-slate-700'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${autoCheckUpdates ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Check & Status Panel */}
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200">Release Status</h4>
                      <button
                        onClick={handleCheckUpdatesManually}
                        disabled={isCheckingUpdate}
                        className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                        <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                      </button>
                    </div>

                    {/* If update found */}
                    {detectedUpdate?.available ? (
                      <div className="p-3.5 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-white">
                                New Version Available: <span className="font-mono text-sky-300 font-bold">{detectedUpdate.latestVersion}</span>
                              </p>
                              {detectedUpdate.releaseDate && (
                                <p className="text-[11px] text-slate-400">Published on {detectedUpdate.releaseDate}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold uppercase tracking-wider">
                            Ready
                          </span>
                        </div>

                        {detectedUpdate.notes && (
                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap font-sans">
                            {detectedUpdate.notes}
                          </div>
                        )}

                        {/* Progress bar if downloading */}
                        {updateProgress !== null && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>{updateStatusText || 'Downloading...'}</span>
                              <span>{updateProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                                style={{ width: `${updateProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action button */}
                        <div className="flex items-center gap-2 pt-1">
                          {updateReadyRestart ? (
                            <button
                              onClick={handleRestartApp}
                              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Restart Arc Desktop to Apply</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleInstallUpdate}
                              disabled={updateProgress !== null}
                              className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download & Install {detectedUpdate.latestVersion}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{updateStatusText || `Arc Desktop is up to date (v${CURRENT_APP_VERSION})`}</span>
                        </div>
                        <button
                          onClick={handleSimulateUpdateFlow}
                          className="text-[11px] text-sky-400 hover:text-sky-300 underline shrink-0"
                          title="Test simulation of the updater UI flow"
                        >
                          Test Simulation
                        </button>
                      </div>
                    )}

                    {/* GitHub Releases Info */}
                    <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                      <span>GitHub Releases Channel</span>
                      <a
                        href={GITHUB_RELEASES_PAGE}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>View releases on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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
                  placeholder="Type an app, search bang (e.g. yt lofi), math, or command AI..."
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

              {/* Multi-Turn AI Conversation & Follow-Up Panel */}
              {(aiGenerating || aiMessages.length > 0) && (
                <div className="p-3.5 bg-gradient-to-b from-sky-950/40 to-slate-900/40 border-b border-sky-800/40 animate-in fade-in slide-in-from-top-1 flex flex-col gap-2.5">
                  {/* Conversation Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                        <Sparkles className={`w-3 h-3 text-sky-400 ${aiGenerating ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white tracking-wide">
                          Arc Desktop Intelligence
                        </span>
                        {aiMessages.length > 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30">
                            {Math.ceil(aiMessages.length / 2)} turns
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAiMessages([]);
                          setFollowUpInput('');
                          showToast('Conversation cleared. Ready for new topic.');
                        }}
                        title="Start New Chat"
                        className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] font-medium transition flex items-center gap-1 border border-slate-700/60"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>New Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={copyFullConversation}
                        title="Copy Entire Conversation"
                        className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] font-medium transition flex items-center gap-1 border border-slate-700/60"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Thread</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiMessages([]);
                          setFollowUpInput('');
                        }}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 transition ml-1"
                        title="Close AI Panel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="max-h-[260px] overflow-y-auto space-y-3 pr-1 divide-y divide-slate-800/30">
                    {aiMessages.map((msg, idx) => {
                      if (msg.role === 'user') {
                        return (
                          <div key={msg.id || `msg-${idx}`} className="pt-2 first:pt-0 flex justify-end">
                            <div className="max-w-[85%] bg-slate-800/90 text-slate-100 rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs leading-relaxed border border-slate-700/60 shadow-sm">
                              <div className="text-[10px] font-medium text-sky-400/90 mb-0.5 flex items-center justify-between gap-2">
                                <span>You</span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="whitespace-pre-wrap font-normal text-slate-100">{msg.text}</div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id || `msg-${idx}`} className="pt-2 first:pt-0 flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-sky-400" />
                          </div>
                          <div className="flex-1 min-w-0 bg-slate-900/60 rounded-2xl rounded-tl-sm p-3 border border-slate-800/80 text-xs text-slate-200 leading-relaxed space-y-2">
                            <div className="whitespace-pre-line text-slate-100 font-normal selection:bg-sky-500/30">
                              {msg.text}
                            </div>

                            {msg.actionExecuted && (
                              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{msg.actionExecuted.summary}</span>
                              </div>
                            )}

                            <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.text);
                                  showToast('Answer copied!');
                                }}
                                className="hover:text-slate-200 flex items-center gap-1 transition px-1.5 py-0.5 rounded hover:bg-slate-800/70 border border-transparent hover:border-slate-700"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {aiGenerating && (
                      <div className="pt-2 flex items-start gap-2.5 animate-in fade-in">
                        <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                        </div>
                        <div className="bg-slate-900/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-sky-800/40 text-xs text-sky-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                          <span>Arc Agent Thinking & Reasoning...</span>
                        </div>
                      </div>
                    )}

                    <div ref={chatScrollRef} />
                  </div>

                  {/* Contextual Quick Follow-Up Chips */}
                  {!aiGenerating && suggestedFollowUps.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Suggestions:</span>
                      {suggestedFollowUps.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => askAi(suggestion, true)}
                          className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-200 text-[11px] font-medium border border-slate-700/60 hover:border-sky-500/40 transition flex items-center gap-1"
                        >
                          <span>{suggestion}</span>
                          <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-Up Input Box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (followUpInput.trim() && !aiGenerating) {
                        askAi(followUpInput, true);
                      }
                    }}
                    className="pt-2 border-t border-slate-800/60 flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={followUpInputRef}
                        type="text"
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        placeholder="Ask a follow-up question... (Enter to send)"
                        disabled={aiGenerating}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!followUpInput.trim() || aiGenerating}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </form>

                  {/* Settings quick links */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettings(true);
                          setSettingsTab('bangs');
                        }}
                        className="hover:text-sky-300 flex items-center gap-1 transition"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Search Bangs</span>
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettings(true);
                          setSettingsTab('ai');
                        }}
                        className="hover:text-sky-300 flex items-center gap-1 transition"
                      >
                        <Key className="w-3 h-3" />
                        <span>AI Settings</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Press Shift+Enter or type below to follow up
                    </span>
                  </div>
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
                    <span>Ask AI / Agent</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      yt &lt;q&gt;
                    </kbd>
                    <span className="hidden sm:inline">Bangs</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Arc Desktop v0.2.0</span>
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
