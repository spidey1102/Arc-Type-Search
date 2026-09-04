'use client';

import React, { useState } from 'react';
import {
  ALL_EXTENSION_FILES,
  ExtensionFile,
  generateExtensionZip
} from '@/lib/extension-code';
import {
  Code,
  Copy,
  Check,
  Download,
  FileCode,
  FileJson,
  FileText,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface CodeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeInspectorModal({ isOpen, onClose }: CodeInspectorProps) {
  const [activeFileName, setActiveFileName] = useState<string>('content.js');
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentFile =
    ALL_EXTENSION_FILES.find((f) => f.name === activeFileName) ||
    ALL_EXTENSION_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.json')) return <FileJson className="w-4 h-4 text-amber-400" />;
    if (fileName.endsWith('.js')) return <FileCode className="w-4 h-4 text-sky-400" />;
    if (fileName.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
    if (fileName.endsWith('.css')) return <FileCode className="w-4 h-4 text-indigo-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div
      id="code-inspector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="code-inspector-modal"
        className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Browser Extension Source Files</h3>
              <p className="text-xs text-slate-400">
                Inspect complete Manifest V3 files or download as a ready-to-load ZIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Packaging ZIP...' : 'Download Extension (.zip)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Left File List + Right Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 p-2 overflow-y-auto shrink-0 flex md:flex-col gap-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:block">
              Extension Files
            </div>
            {ALL_EXTENSION_FILES.map((file) => {
              const isActive = file.name === activeFileName;
              return (
                <button
                  key={file.name}
                  onClick={() => setActiveFileName(file.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition text-left shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-sky-300 border border-slate-700/60 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>

          {/* Main Code View Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            {/* File info bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-mono text-sky-400 font-medium">{currentFile.path}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px]">{currentFile.description}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700/60"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content Display */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
