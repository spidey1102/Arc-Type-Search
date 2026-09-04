'use client';

import React, { useState } from 'react';
import {
  Keyboard,
  Check,
  Copy,
  Terminal,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Monitor,
  Laptop
} from 'lucide-react';

export function CtrlTExplainer() {
  const [activeMode, setActiveMode] = useState<'inpage' | 'remap' | 'shortcuts'>('inpage');
  const [selectedOs, setSelectedOs] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [copied, setCopied] = useState(false);

  const scripts = {
    windows: `; AutoHotkey v2 Script for Arc Floating Tab
; Remaps physical Ctrl+T to Alt+T only when Chrome, Brave, or Edge is focused
; Result: Summons the Arc floating overlay on top of your page instead of opening a blank tab!
#HotIf WinActive("ahk_exe chrome.exe") or WinActive("ahk_exe brave.exe") or WinActive("ahk_exe msedge.exe")
^t::!t
#HotIf`,
    mac: `// Karabiner-Elements Complex Modification rule
// Place in ~/.config/karabiner/assets/complex_modifications/arc_tab.json
// Result: Cmd+T triggers Option+T to float Arc Bar directly over current window without opening a new tab
{
  "title": "Arc Tab Cmd+T to Option+T Remap",
  "rules": [
    {
      "description": "Remap Cmd+T to Option+T in Chrome and Brave for Arc Floating Bar",
      "manipulators": [
        {
          "type": "basic",
          "from": { "key_code": "t", "modifiers": { "mandatory": ["command"] } },
          "to": [{ "key_code": "t", "modifiers": ["option"] }],
          "conditions": [
            {
              "type": "frontmost_application_if",
              "bundle_identifiers": ["^com\\\\.google\\\\.Chrome$", "^com\\\\.brave\\\\.Browser$", "^com\\\\.microsoft\\\\.edgemac$"]
            }
          ]
        }
      ]
    }
  ]
}`,
    linux: `# Linux xbindkeys config (~/.xbindkeysrc)
# Maps Ctrl+t to Alt+t for Arc Tab in Chromium browsers
"xdotool key alt+t"
  Control + t`
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scripts[selectedOs]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      id="ctrl-t-explainer-card"
      className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Pure Overlay Architecture</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Float Directly Over Page (Zero New Tabs)</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            <strong>No blank tabs or URL overrides:</strong> Arc Tab floats purely as an overlay over your current webpage.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 self-start sm:self-center shrink-0">
          <button
            onClick={() => setActiveMode('inpage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeMode === 'inpage'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. In-Page Overlay (Alt+T)
          </button>
          <button
            onClick={() => setActiveMode('remap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeMode === 'remap'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Trigger with Ctrl+T
          </button>
          <button
            onClick={() => setActiveMode('shortcuts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeMode === 'shortcuts'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Browser Settings
          </button>
        </div>
      </div>

      {/* Mode 1: In-Page Floating Overlay */}
      {activeMode === 'inpage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>True Arc Experience: Floats Right Over Your Current Page</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Whether you are reading documentation, browsing GitHub, or watching a tutorial, pressing <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-xs text-sky-300 border border-slate-700">Alt + T</kbd> (or clicking the toolbar icon) floats the command bar right where you are.
              </p>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                It never overrides your New Tab page or launches a blank window.
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                <span><strong>No Unwanted Tabs:</strong> The command bar appears as an isolated modal in your active window.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                <span><strong>Open in New Tab:</strong> Pressing <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200 border border-slate-700">↵ Enter</kbd> opens your search or URL in a new tab by default.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                <span><strong>Navigate Current Tab:</strong> Press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200 border border-slate-700">⇧ + ↵</kbd> (Shift+Enter) whenever you want to load directly in your current tab.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                <span><strong>Instant Escape:</strong> Press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200 border border-slate-700">Esc</kbd> to dismiss without touching any tabs.</span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Graphic */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 space-y-4 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              </span>
              <span>Flow: In-Page Floating Bar</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">1</span>
                <span>You are on any web page (e.g. github.com)</span>
              </div>
              <div className="flex items-center gap-2 text-sky-400 pl-4 border-l-2 border-slate-800">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Press <strong>Alt + T</strong> (or custom shortcut)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 pl-4 border-l-2 border-slate-800">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Command bar floats on top — active tab stays open</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/90 border border-sky-500/30 text-sky-200">
                &gt; Enter: New tab | Shift+Enter: Navigates current tab | Esc: Dismiss
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Trigger With Ctrl+T (System Remap) */}
      {activeMode === 'remap' && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Trigger Directly With Physical Ctrl + T (Without Chrome Opening a Tab)</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                Chromium protects physical <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-xs text-sky-300">Ctrl+T</kbd> inside its C++ kernel to always open Chrome&apos;s blank tab. To summon the floating overlay on your current page with physical <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-xs text-sky-300">Ctrl+T</kbd> without Chrome opening a new tab, use this 2-line remap:
              </p>
            </div>

            {/* OS Picker */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                onClick={() => setSelectedOs('windows')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  selectedOs === 'windows' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Windows (AHK)</span>
              </button>
              <button
                onClick={() => setSelectedOs('mac')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  selectedOs === 'mac' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>macOS</span>
              </button>
              <button
                onClick={() => setSelectedOs('linux')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  selectedOs === 'linux' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Linux</span>
              </button>
            </div>
          </div>

          {/* Script Code Box with Copy Button */}
          <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto">
            <button
              onClick={handleCopyScript}
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>

            <pre className="text-sky-300 leading-relaxed whitespace-pre pr-24">
              {scripts[selectedOs]}
            </pre>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            {selectedOs === 'windows' && (
              <p>
                💡 <strong>Windows:</strong> Save as <code className="text-slate-300 font-mono">arc-tab.ahk</code> with <a href="https://www.autohotkey.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline underline-offset-2">AutoHotkey</a>. Pressing <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Ctrl+T</kbd> now floats the Arc bar directly on your page, completely bypassing Chrome&apos;s new tab!
              </p>
            )}
            {selectedOs === 'mac' && (
              <p>
                💡 <strong>macOS:</strong> With Karabiner-Elements or Raycast, map <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Cmd+T</kbd> to <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Option+T</kbd> in Chrome. The overlay floats instantly on your current window.
              </p>
            )}
            {selectedOs === 'linux' && (
              <p>
                💡 <strong>Linux:</strong> Add to <code className="text-slate-300 font-mono">~/.xbindkeysrc</code> so pressing Ctrl+T triggers the Alt+T overlay command directly.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Custom Browser Settings */}
      {activeMode === 'shortcuts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Customize Any Shortcut in Chrome</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Chromium gives you a native shortcuts manager to assign any key combination to Arc Tab (like <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-xs text-sky-300">Cmd+Shift+K</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-xs text-sky-300">Ctrl+Space</kbd>).
              </p>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>Navigate to <code className="text-sky-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">chrome://extensions/shortcuts</code> in your browser</li>
              <li>Find <strong>&quot;Arc Tab - Floating Command Bar&quot;</strong></li>
              <li>Click the pencil icon next to <em>Toggle Arc Floating Command Bar Overlay</em></li>
              <li>Press your favorite key combination (e.g. <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-200">Cmd+K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-200">Ctrl+Shift+Space</kbd>)</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Global Shortcut Support</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              In <code className="text-slate-300">chrome://extensions/shortcuts</code>, you can also change the scope from <em>&quot;In Chrome&quot;</em> to <em>&quot;Global&quot;</em>, allowing you to summon Arc Tab from any app on your computer!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
