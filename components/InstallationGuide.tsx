'use client';

import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  SlidersHorizontal,
  Keyboard,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  ShieldCheck,
  Zap,
  History
} from 'lucide-react';
import { generateExtensionZip } from '@/lib/extension-code';
import { CtrlTExplainer } from './CtrlTExplainer';

export function InstallationGuide() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleDownload = async () => {
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
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 4000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const steps = [
    {
      num: '1',
      title: 'Download & Extract the Extension',
      desc: 'Click the download button to grab the complete Manifest V3 package, then unzip it to a folder on your computer (e.g. in your Documents or Dev folder).',
      badge: 'Step 1'
    },
    {
      num: '2',
      title: 'Open Extensions & Enable Developer Mode',
      desc: 'Open chrome://extensions (or brave://extensions / edge://extensions) in your address bar, then switch on the "Developer mode" toggle in the top-right corner.',
      badge: 'Step 2'
    },
    {
      num: '3',
      title: 'Click "Load Unpacked"',
      desc: 'Click the "Load unpacked" button in the top-left toolbar and select the unzipped extension directory. The Arc Tab extension is immediately active!',
      badge: 'Step 3'
    },
    {
      num: '4',
      title: 'Press Alt + T or Click the Extension Icon',
      desc: 'Open any standard webpage (e.g. google.com, wikipedia.org, or github.com) and press Alt + T, or click the Arc Tab icon in your Chrome toolbar. The floating command bar will appear directly over your page!',
      badge: 'Ready'
    }
  ];

  const faqs = [
    {
      q: 'How does Search History & Omnibox Autocomplete work?',
      a: 'As you type in the floating command bar, Arc Tab queries your browser\'s local history via chrome.history.search. If a domain or URL starts with what you typed (e.g. typing "git" suggests "github.com"), an inline ghost-text completion appears. Press Tab or Right Arrow to accept it immediately, or browse ranked past visits directly in the results list.'
    },
    {
      q: 'Why didn\'t Alt + T or clicking the icon work while I was looking at chrome://extensions?',
      a: 'Google Chrome\'s security policy completely forbids extensions from running content scripts on internal browser URLs (such as chrome://extensions, chrome://settings, or chrome://newtab). To test the floating overlay, open any real website (e.g., google.com or github.com) and press Alt + T. If you click the toolbar icon while on an internal page, Arc Tab automatically opens a standalone command center tab for you.'
    },
    {
      q: 'Can this extension replace Ctrl + T / Cmd + T directly?',
      a: 'The extension is designed strictly as a floating in-page overlay so it never opens unwanted blank tabs or hijacks your New Tab page. By default, you can summon it on any webpage with Alt+T (or a custom shortcut). If you want physical Ctrl+T to summon this floating overlay directly without Chrome opening a new tab, use the 2-line AutoHotkey (Windows) or Karabiner/Raycast (Mac) remap provided in the guide above.'
    },
    {
      q: 'Why does the in-page extension shortcut default to Alt + T instead of Ctrl + T?',
      a: 'Chromium browsers (Google Chrome, Brave, Edge) strictly reserve standard Ctrl+T / Cmd+T at the native browser level to prevent rogue extensions from trapping users. However, extensions can register custom global commands like Alt+T or Cmd+Shift+K to float over any active webpage.'
    },
    {
      q: 'Can I change the shortcut to Cmd + Shift + K or Ctrl + Space?',
      a: 'Yes! Navigate to chrome://extensions/shortcuts in your browser address bar. Scroll down to "Arc Tab - Floating Command Bar", click the pencil icon next to "Toggle Arc Floating Command Bar", and press your preferred key combination.'
    },
    {
      q: 'Does this interfere with the styles of the websites I visit?',
      a: 'No. The floating command bar is injected using an isolated Shadow DOM (attachShadow). This guarantees that the host website’s CSS never bleeds into the Arc overlay, and the extension’s styling never modifies the page.'
    },
    {
      q: 'Which browsers does this extension support?',
      a: 'All modern Chromium-based browsers, including Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi, and even Arc browser itself!'
    }
  ];

  return (
    <div id="installation-guide-section" className="w-full max-w-5xl mx-auto my-12 px-4 space-y-12">
      {/* Hero Banner with CTA */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Ready-to-Use Manifest V3 Extension</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Get the Real Arc Floating Tab for Your Browser
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience the power of Arc&apos;s floating command bar in Chrome, Brave, and Edge. Instant tab search, direct navigation, math computation, and zero context switching.
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-98 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Packaging Files...' : downloadDone ? 'Downloaded!' : 'Download Extension (.zip)'}</span>
            </button>
            <span className="text-[11px] text-slate-400 text-center sm:text-right">
              Includes manifest.json, background worker, and content scripts
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step Installation Visual Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-sky-400" />
            <span>Install in 30 Seconds</span>
          </h3>
          <span className="text-xs text-slate-400">No store account or compilation needed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
                    {step.badge}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm">{step.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Ctrl+T Replacement Explainer & Scripts */}
      <CtrlTExplainer />

      {/* Feature Deep Dive Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">Isolated Shadow DOM</h4>
          <p className="text-xs text-slate-400 leading-normal">
            Uses native browser Shadow Roots so web pages can never break your floating command bar or leak host styles.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">History & Autocomplete</h4>
          <p className="text-xs text-slate-400 leading-normal">
            Omnibox ghost completion with Tab/→ autofill and instant search through past browser visits.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Keyboard className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">Custom Global Hotkeys</h4>
          <p className="text-xs text-slate-400 leading-normal">
            Binds cleanly via Chromium&apos;s command API. Default is Alt+T, customizable to whatever combination you prefer.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">Private & Local</h4>
          <p className="text-xs text-slate-400 leading-normal">
            Zero third-party telemetry. Tab searches and history matching run 100% locally within your browser sandbox.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden transition"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-slate-850 transition"
                >
                  <span className="font-medium text-sm text-slate-200">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-sky-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
