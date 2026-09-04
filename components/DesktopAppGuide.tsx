'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Terminal,
  Download,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Sparkles,
  Shield,
  Cpu,
  ArrowRight,
  FolderGit2,
  Play
} from 'lucide-react';

export function DesktopAppGuide() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Desktop Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-sky-950/40 via-slate-900/60 to-slate-900/90 border border-sky-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs font-semibold text-sky-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Native Desktop Engine (Tauri v2)</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Arc Desktop: System-Wide Command Bar
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Transform Arc Tab from an in-browser bar into a full operating-system launcher. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-xs border border-slate-700">Alt + Space</kbd> anywhere on your computer to summon it over any application, game, or desktop window.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/launcher"
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Desktop Launcher View</span>
            </Link>

            <a
              href="https://github.com/spidey1102/Arc-Type-Search"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <FolderGit2 className="w-4 h-4 text-sky-400" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Global OS Hotkey</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Registered at the kernel windowing level with Tauri. Works inside VS Code, full-screen games, terminals, or design suites.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">~15 MB RAM Footprint</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Powered by Rust and your native operating system webview instead of bloated Chromium. Zero battery drain when idling.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Vercel Auto-Updates</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Integrated with <code className="text-sky-300 font-mono">/api/desktop-update</code>. Push releases from GitHub and Tauri automatically updates in the background.
          </p>
        </div>
      </div>

      {/* Quick Setup / Local Run Instructions */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">How to Run & Build Arc Desktop Locally</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Tauri v2 + Next.js</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>1. Run desktop development mode (with live reload):</span>
              <button
                onClick={() => copyToClipboard('npm run desktop:dev', 'cmd1')}
                className="hover:text-white transition flex items-center gap-1"
              >
                {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'cmd1' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-sky-300 border border-slate-800/80">
              npm run desktop:dev
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>2. Compile standalone native executable (.exe, .msi, .dmg, .AppImage):</span>
              <button
                onClick={() => copyToClipboard('npm run desktop:build', 'cmd2')}
                className="hover:text-white transition flex items-center gap-1"
              >
                {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'cmd2' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-sky-300 border border-slate-800/80">
              npm run desktop:build
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>3. Automated GitHub Actions CI workflow:</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              A pre-configured GitHub Actions workflow has been created at <code className="text-slate-200 font-mono">.github/workflows/build-desktop.yml</code>. Whenever you create a tag or push to main in your GitHub repository, it automatically builds installers for Windows, macOS, and Linux and publishes them to your GitHub Releases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
