'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrowserSimulator } from '@/components/BrowserSimulator';
import { InstallationGuide } from '@/components/InstallationGuide';
import { CodeInspectorModal } from '@/components/CodeInspectorModal';
import { DesktopAppGuide } from '@/components/DesktopAppGuide';
import { generateExtensionZip } from '@/lib/extension-code';
import {
  Sparkles,
  Download,
  Code2,
  Layers,
  Keyboard,
  ExternalLink,
  Laptop,
  CheckCircle2,
  FileCode,
  Github,
  Zap,
  Play,
  Monitor
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'desktop' | 'extension'>('desktop');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const zipBlob = await generateExtensionZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arc-tab-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-400"></span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Arc Desktop & Tab</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold">
                  Tauri v2 + MV3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">System-Wide Desktop Command Bar & Browser Extension</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/launcher"
              className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-semibold text-sky-300 hover:text-white transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Desktop View</span>
            </Link>

            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition hidden md:flex items-center gap-1.5"
              title="Inspect extension source code"
            >
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span>View Source</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition flex items-center gap-1.5 active:scale-98 disabled:opacity-50"
              title="Download unpacked extension for Chrome/Edge/Brave"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDownloading ? 'Packaging...' : downloadSuccess ? 'Downloaded!' : 'Extension ZIP'}</span>
              <span className="sm:hidden">ZIP</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Mode Selector Pill Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl inline-flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setActiveTab('desktop')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'desktop'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>System-Wide Desktop App (Tauri)</span>
            </button>

            <button
              onClick={() => setActiveTab('extension')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'extension'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Browser Extension (Simulator)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: System-Wide Desktop App (Tauri) */}
        {activeTab === 'desktop' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <DesktopAppGuide />
          </div>
        )}

        {/* Tab 2: In-Browser Extension (Manifest V3) */}
        {activeTab === 'extension' && (
          <div className="space-y-10 animate-in fade-in duration-200">
            {/* Intro & Live Interactive Simulator Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Simulate the Arc experience below</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Arc Browser Floating New Tab
              </h1>

              <p className="text-sm text-slate-400 leading-relaxed">
                Instead of opening an empty new page, a sleek command bar floats directly over your current window. Try it in the live browser simulator below by pressing <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs">Alt + T</kbd> or clicking anywhere inside.
              </p>
            </div>

            {/* Live Interactive Browser Simulator */}
            <div className="relative">
              <BrowserSimulator />
            </div>

            {/* Feature Overview Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-1">
                <div className="text-lg font-bold text-white">Zero Context Switch</div>
                <div className="text-xs text-slate-400">Floats directly on top of your page</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-1">
                <div className="text-lg font-bold text-white">Instant Tab Switch</div>
                <div className="text-xs text-slate-400">Fuzzy search all open browser tabs</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-1">
                <div className="text-lg font-bold text-white">Smart Math & URLs</div>
                <div className="text-xs text-slate-400">Inline calculations & direct navigation</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-1">
                <div className="text-lg font-bold text-white">Shadow DOM Isolation</div>
                <div className="text-xs text-slate-400">Immune to website CSS interference</div>
              </div>
            </div>

            {/* Installation Guide & Instructions */}
            <InstallationGuide />
          </div>
        )}
      </div>

      {/* Code Inspector Drawer/Modal */}
      <CodeInspectorModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-slate-400 font-medium">Arc Desktop & Tab</span>
            <span>— Inspired by The Browser Company&apos;s Arc Browser</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/launcher" className="hover:text-white transition">
              Desktop View
            </Link>
            <span>•</span>
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="hover:text-white transition"
            >
              Inspect Source Code
            </button>
            <span>•</span>
            <button
              onClick={handleDownloadZip}
              className="hover:text-sky-400 transition"
            >
              Download ZIP
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
