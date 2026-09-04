import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: '0.1.0',
    notes: 'Arc Desktop initial release: System-wide floating command bar with instant search, app launcher, and Gemini AI summaries.',
    pub_date: new Date().toISOString(),
    platforms: {
      'darwin-aarch64': {
        signature: '',
        url: 'https://github.com/spidey1102/Arc-Type-Search/releases/latest/download/arc-desktop_universal.dmg'
      },
      'darwin-x86_64': {
        signature: '',
        url: 'https://github.com/spidey1102/Arc-Type-Search/releases/latest/download/arc-desktop_universal.dmg'
      },
      'windows-x86_64': {
        signature: '',
        url: 'https://github.com/spidey1102/Arc-Type-Search/releases/latest/download/arc-desktop_x64-setup.exe'
      },
      'linux-x86_64': {
        signature: '',
        url: 'https://github.com/spidey1102/Arc-Type-Search/releases/latest/download/arc-desktop_amd64.AppImage'
      }
    }
  });
}
