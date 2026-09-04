import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Arc Tab - Floating Command Bar Extension',
  description: 'An Arc Browser-inspired system-wide desktop command bar powered by Tauri and in-page Chromium extension with instant search, tab switching, and one-click export.',
  openGraph: {
    title: 'Arc Tab - Floating Command Bar Extension',
    description: 'An Arc Browser-inspired system-wide desktop command bar powered by Tauri and in-page Chromium extension with instant search, tab switching, and one-click export.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arc Tab - Floating Command Bar Extension',
    description: 'An Arc Browser-inspired system-wide desktop command bar powered by Tauri and in-page Chromium extension with instant search, tab switching, and one-click export.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="bg-transparent" suppressHydrationWarning>
      <body className="bg-transparent text-slate-100 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
