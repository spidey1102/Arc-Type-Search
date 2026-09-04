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
  ChevronRight
} from 'lucide-react';
import { useIsTauri, hideDesktopWindow, openDesktopUrl, POPULAR_DESKTOP_APPS } from '@/lib/desktop-ipc';
import { evaluateSmartQuery, EvaluationResult } from '@/lib/smart-evaluator';

interface LauncherItem {
  id: string;
  type: 'app' | 'calc' | 'search' | 'url' | 'system' | 'ai';
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
  badge?: string;
  category: string;
}

export default function LauncherPage() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isTauri = useIsTauri();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulatedClosed, setIsSimulatedClosed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulatedClosed, isTauri, handleDismiss]);

  // Instant smart calculation & equation evaluator
  const smartEval = useMemo<EvaluationResult | null>(() => {
    return evaluateSmartQuery(query);
  }, [query]);

  // Handle AI question
  const askAi = useCallback(async (prompt: string) => {
    setAiGenerating(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are Arc Desktop AI Assistant. Answer in 2 succinct sentences or bullet points: ${prompt}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.text || 'No answer generated.');
      } else {
        // If smartEval is available, use its explanation
        if (smartEval) {
          setAiResponse(`${smartEval.result}. ${smartEval.explanation || ''}`);
        } else {
          setAiResponse(`Search Web: "${prompt}" (Press Enter to open in browser)`);
        }
      }
    } catch {
      if (smartEval) {
        setAiResponse(`${smartEval.result}. ${smartEval.explanation || ''}`);
      } else {
        setAiResponse(`Search Web: "${prompt}" (Open in browser)`);
      }
    } finally {
      setAiGenerating(false);
    }
  }, [smartEval]);

  // Build items list based on query
  const items = useMemo<LauncherItem[]>(() => {
    const list: LauncherItem[] = [];
    const q = query.trim().toLowerCase();

    // 1. Instant Equation or Math calculation result
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

    // 3. Native & Web Apps
    POPULAR_DESKTOP_APPS.forEach(app => {
      if (!q || app.name.toLowerCase().includes(q) || app.command.toLowerCase().includes(q) || app.category.includes(q)) {
        let AppIcon = Terminal;
        if (app.icon === 'Code') AppIcon = Code;
        else if (app.icon === 'Music') AppIcon = Music;
        else if (app.icon === 'Settings') AppIcon = Settings;
        else if (app.icon === 'Calculator') AppIcon = Calculator;
        else if (app.icon === 'Globe') AppIcon = Globe;

        list.push({
          id: app.id,
          type: 'app',
          title: app.name,
          subtitle: `Launch application (${app.category})`,
          icon: AppIcon,
          category: 'Applications',
          badge: 'App',
          action: () => {
            if (app.url) {
              openDesktopUrl(app.url);
            } else {
              showToast(`Launching ${app.name}...`);
              handleDismiss();
            }
          }
        });
      }
    });

    // 4. Quick System Commands
    const systemCommands = [
      { id: 'sys-lock', title: 'Lock Screen', subtitle: 'Lock current desktop session', icon: Lock, command: 'lock' },
      { id: 'sys-mute', title: 'Mute / Unmute Audio', subtitle: 'Toggle master system volume', icon: VolumeX, command: 'mute' },
      { id: 'sys-downloads', title: 'Open Downloads Folder', subtitle: 'Reveal files in Finder / Explorer', icon: FolderOpen, command: 'downloads' },
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
            showToast(`Executed: ${cmd.title}`);
            handleDismiss();
          }
        });
      }
    });

    // 5. AI Query & Web Search when user types
    if (q) {
      list.push({
        id: 'ai-prompt',
        type: 'ai',
        title: `Ask AI: "${query}"`,
        subtitle: 'Get instantaneous inline AI summary and synthesized answer',
        icon: Sparkles,
        category: 'Intelligence',
        badge: 'Gemini',
        action: () => {
          askAi(query);
        }
      });

      list.push({
        id: 'web-google',
        type: 'search',
        title: `Search Google for "${query}"`,
        subtitle: 'Open web search in default browser',
        icon: Globe,
        category: 'Web Search',
        badge: 'Search',
        action: () => {
          openDesktopUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        }
      });
    }

    return list;
  }, [query, smartEval, askAi, handleDismiss, showToast]);

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
      if (items[activeIndex]) {
        handleItemSelect(items[activeIndex]);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-transparent text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 selection:bg-sky-500/30 selection:text-sky-200">
      {/* If dismissed in web simulation mode, show a discreet floating summon button */}
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
            <Link
              href="/"
              className="hover:text-white transition flex items-center gap-1 text-[11px]"
            >
              <span>App Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Hide Window (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Card Container */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden flex flex-col transition-all">
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

          {/* AI Response Panel (if active) */}
          {(aiGenerating || aiResponse) && (
            <div className="p-4 bg-sky-950/20 border-b border-sky-800/30 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {aiGenerating ? (
                  <div className="flex items-center gap-2 text-sky-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Synthesizing answer with Gemini...</span>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-sky-400 text-xs uppercase tracking-wider mb-1">
                      Arc Intelligence
                    </div>
                    <p>{aiResponse}</p>
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
                    className={`pt-1 first:pt-0 cursor-pointer group`}
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
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                  Enter
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                  Esc
                </kbd>
                <span>Dismiss</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Arc Desktop v0.1.0</span>
            </div>
          </div>
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
