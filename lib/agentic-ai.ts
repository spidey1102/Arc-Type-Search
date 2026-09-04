/**
 * Agentic AI Engine for Arc Desktop.
 * Translates natural language requests into structured desktop actions:
 * - Creating/deleting search bangs (e.g. `yt <query>` -> YouTube search)
 * - Creating/deleting bookmarks & snippets
 * - Adding custom app/command shortcuts
 * - Controlling system features & app visibility
 */

export interface SearchBang {
  id: string;
  prefix: string;
  name: string;
  urlTemplate: string; // Must contain {q}
  exampleQuery?: string;
  builtin?: boolean;
}

export interface AgentAction {
  type: 'create_bang' | 'delete_bang' | 'create_bookmark' | 'create_app' | 'toggle_app' | 'system_command';
  summary: string;
  payload: Record<string, any>;
}

export interface AgenticAiResponse {
  text: string;
  actionExecuted?: AgentAction;
}

export const DEFAULT_SEARCH_BANGS: SearchBang[] = [
  {
    id: 'bang-yt',
    prefix: 'yt',
    name: 'YouTube',
    urlTemplate: 'https://www.youtube.com/results?search_query={q}',
    exampleQuery: 'lo-fi beats',
    builtin: true
  },
  {
    id: 'bang-gh',
    prefix: 'gh',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q={q}',
    exampleQuery: 'tauri template',
    builtin: true
  },
  {
    id: 'bang-rd',
    prefix: 'rd',
    name: 'Reddit',
    urlTemplate: 'https://www.reddit.com/search?q={q}',
    exampleQuery: 'mechanical keyboards',
    builtin: true
  },
  {
    id: 'bang-wiki',
    prefix: 'wiki',
    name: 'Wikipedia',
    urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search={q}',
    exampleQuery: 'quantum computing',
    builtin: true
  },
  {
    id: 'bang-npm',
    prefix: 'npm',
    name: 'npm Packages',
    urlTemplate: 'https://www.npmjs.com/search?q={q}',
    exampleQuery: 'lucide-react',
    builtin: true
  },
  {
    id: 'bang-so',
    prefix: 'so',
    name: 'Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q={q}',
    exampleQuery: 'rust match pattern',
    builtin: true
  },
  {
    id: 'bang-amz',
    prefix: 'amz',
    name: 'Amazon',
    urlTemplate: 'https://www.amazon.com/s?k={q}',
    exampleQuery: 'usb-c hub',
    builtin: true
  },
  {
    id: 'bang-maps',
    prefix: 'maps',
    name: 'Google Maps',
    urlTemplate: 'https://www.google.com/maps/search/{q}',
    exampleQuery: 'coffee shops near me',
    builtin: true
  },
  {
    id: 'bang-x',
    prefix: 'x',
    name: 'X (Twitter)',
    urlTemplate: 'https://x.com/search?q={q}',
    exampleQuery: 'gemini api',
    builtin: true
  }
];

const BANGS_STORAGE_KEY = 'arc-search-bangs';

export function getStoredBangs(): SearchBang[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BANGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_SEARCH_BANGS;
}

export function saveStoredBangs(bangs: SearchBang[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BANGS_STORAGE_KEY, JSON.stringify(bangs));
  }
}

export function addSearchBang(prefix: string, name: string, urlTemplate: string, exampleQuery?: string): SearchBang {
  const bangs = getStoredBangs();
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  let template = urlTemplate.trim();
  if (!template.includes('{q}')) {
    template = template.includes('?') ? `${template}&q={q}` : `${template}?q={q}`;
  }

  const existingIdx = bangs.findIndex(b => b.prefix === cleanPrefix);
  const newBang: SearchBang = {
    id: existingIdx >= 0 ? bangs[existingIdx].id : `bang-${Date.now()}`,
    prefix: cleanPrefix,
    name: name.trim() || `${cleanPrefix.toUpperCase()} Search`,
    urlTemplate: template,
    exampleQuery: exampleQuery || 'test',
    builtin: false
  };

  if (existingIdx >= 0) {
    bangs[existingIdx] = newBang;
  } else {
    bangs.push(newBang);
  }

  saveStoredBangs(bangs);
  return newBang;
}

export function deleteSearchBang(prefix: string): boolean {
  const bangs = getStoredBangs();
  const filtered = bangs.filter(b => b.prefix !== prefix.toLowerCase());
  if (filtered.length !== bangs.length) {
    saveStoredBangs(filtered);
    return true;
  }
  return false;
}

/**
 * Domain pattern dictionary for automatic URL inference when user requests shortcuts.
 */
const KNOWN_SEARCH_PATTERNS: Record<string, { name: string; template: string; example: string }> = {
  ebay: { name: 'eBay', template: 'https://www.ebay.com/sch/i.html?_nkw={q}', example: 'mechanical keyboard' },
  duckduckgo: { name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q={q}', example: 'privacy tools' },
  ddg: { name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q={q}', example: 'privacy tools' },
  bing: { name: 'Bing', template: 'https://www.bing.com/search?q={q}', example: 'weather' },
  mdn: { name: 'MDN Web Docs', template: 'https://developer.mozilla.org/en-US/search?q={q}', example: 'css grid' },
  twitch: { name: 'Twitch', template: 'https://www.twitch.tv/search?term={q}', example: 'speedrun' },
  spotify: { name: 'Spotify Web', template: 'https://open.spotify.com/search/{q}', example: 'synthwave' },
  netflix: { name: 'Netflix', template: 'https://www.netflix.com/search?q={q}', example: 'sci-fi' },
  pinterest: { name: 'Pinterest', template: 'https://www.pinterest.com/search/pins/?q={q}', example: 'interior design' },
  imdb: { name: 'IMDb', template: 'https://www.imdb.com/find?q={q}', example: 'interstellar' },
  stackoverflow: { name: 'Stack Overflow', template: 'https://stackoverflow.com/search?q={q}', example: 'array reverse' },
  github: { name: 'GitHub', template: 'https://github.com/search?q={q}', example: 'nextjs' },
  youtube: { name: 'YouTube', template: 'https://www.youtube.com/results?search_query={q}', example: 'music' },
  reddit: { name: 'Reddit', template: 'https://www.reddit.com/search?q={q}', example: 'tech news' },
  google: { name: 'Google', template: 'https://www.google.com/search?q={q}', example: 'news' }
};

/**
 * Parses user natural language request into an Agentic Action (offline/local NLP parser).
 */
export function detectLocalAgentAction(prompt: string): AgentAction | null {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. Create/Add search bang or shortcut
  // Examples:
  // "create a shortcut eb to search ebay"
  // "add shortcut rd for reddit"
  // "make a bang ddg for duckduckgo https://duckduckgo.com/?q={q}"
  // "add search bang 'mdn' for mdn web docs"
  const bangMatch1 = lower.match(/(?:create|add|make|set up|register)\s+(?:a\s+)?(?:search\s+)?(?:shortcut|bang|prefix)\s+['"]?([a-z0-9_-]+)['"]?\s+(?:for|to search|search)\s+([^,.\n]+)/i);
  if (bangMatch1) {
    const prefix = bangMatch1[1].trim().toLowerCase();
    const target = bangMatch1[2].trim();

    // Check if target is a known service
    const knownKey = Object.keys(KNOWN_SEARCH_PATTERNS).find(k => target.toLowerCase().includes(k));
    let template = '';
    let name = target;
    let example = 'test';

    if (knownKey && KNOWN_SEARCH_PATTERNS[knownKey]) {
      name = KNOWN_SEARCH_PATTERNS[knownKey].name;
      template = KNOWN_SEARCH_PATTERNS[knownKey].template;
      example = KNOWN_SEARCH_PATTERNS[knownKey].example;
    } else {
      // Check if URL is explicitly provided in prompt
      const urlMatch = p.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        template = urlMatch[0];
      } else {
        const cleanTarget = target.replace(/[^a-z0-9.-]/gi, '').toLowerCase();
        const domain = cleanTarget.includes('.') ? cleanTarget : `${cleanTarget}.com`;
        template = `https://${domain}/search?q={q}`;
      }
    }

    return {
      type: 'create_bang',
      summary: `Created search bang \`${prefix}\` for **${name}**!`,
      payload: { prefix, name, urlTemplate: template, exampleQuery: example }
    };
  }

  // 2. Add bookmark or link
  // e.g. "bookmark https://github.com/trending as Trending Repos"
  // e.g. "save link https://news.ycombinator.com titled Hacker News"
  // e.g. "create bookmark for my figma https://figma.com/file/123"
  const bookmarkMatch = lower.match(/(?:bookmark|save link|add bookmark)\s+(?:for\s+)?(?:['"]?([^'"]+)['"]?\s+)?(https?:\/\/[^\s]+)(?:\s+(?:as|titled|named)\s+['"]?([^'"]+)['"]?)?/i);
  if (bookmarkMatch) {
    const rawUrl = bookmarkMatch[2];
    const rawTitle = bookmarkMatch[3] || bookmarkMatch[1] || 'Saved Link';
    return {
      type: 'create_bookmark',
      summary: `Added bookmark **${rawTitle.trim()}** (${rawUrl}) to your favorites!`,
      payload: { title: rawTitle.trim(), value: rawUrl, type: 'url' }
    };
  }

  // 3. Save clipboard snippet
  // e.g. "save snippet :email with contact@domain.com"
  // e.g. "create snippet :zoom https://zoom.us/j/123"
  const snippetMatch = p.match(/(?:save snippet|create snippet|add snippet)\s+[:']?([a-z0-9_:-]+)['"]?\s+(?:with|as|containing)\s+['"]?([^'"]+)['"]?/i);
  if (snippetMatch) {
    const title = snippetMatch[1].trim();
    const value = snippetMatch[2].trim();
    return {
      type: 'create_bookmark',
      summary: `Saved clipboard snippet **${title}**!`,
      payload: { title, value, type: 'copy' }
    };
  }

  // 4. Add custom desktop app shortcut
  // e.g. "add app Blender with command blender"
  // e.g. "create app shortcut IntelliJ with command idea"
  const appMatch = p.match(/(?:add app|add application|create app shortcut)\s+['"]?(.+?)['"]?\s+(?:with command|command|path)\s+['"]?([^'"]+)['"]?/i);
  if (appMatch) {
    const name = appMatch[1].trim();
    const cmd = appMatch[2].trim();
    return {
      type: 'create_app',
      summary: `Added desktop shortcut for **${name}** (command: \`${cmd}\`)!`,
      payload: { name, command: cmd, category: 'Custom' }
    };
  }

  // 5. System commands via AI
  if (/^(mute|unmute|toggle volume)\b/i.test(lower)) {
    return {
      type: 'system_command',
      summary: 'Triggered system audio toggle.',
      payload: { command: 'mute' }
    };
  }

  if (/^(lock|lock screen|lock pc|lock computer)\b/i.test(lower)) {
    return {
      type: 'system_command',
      summary: 'Triggered desktop screen lock.',
      payload: { command: 'lock' }
    };
  }

  if (/^(open downloads|downloads folder)\b/i.test(lower)) {
    return {
      type: 'system_command',
      summary: 'Opened Downloads folder.',
      payload: { command: 'downloads' }
    };
  }

  return null;
}

/**
 * Execute an agent action and commit to local state.
 */
export function executeAgentAction(action: AgentAction): boolean {
  try {
    switch (action.type) {
      case 'create_bang': {
        const { prefix, name, urlTemplate, exampleQuery } = action.payload;
        addSearchBang(prefix, name, urlTemplate, exampleQuery);
        return true;
      }
      case 'delete_bang': {
        const { prefix } = action.payload;
        return deleteSearchBang(prefix);
      }
      case 'create_bookmark': {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('arc-favorites');
          const favs = stored ? JSON.parse(stored) : [];
          const newFav = {
            id: `fav-${Date.now()}`,
            type: action.payload.type || 'url',
            title: action.payload.title,
            value: action.payload.value
          };
          favs.unshift(newFav);
          localStorage.setItem('arc-favorites', JSON.stringify(favs));
        }
        return true;
      }
      case 'create_app': {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('arc-installed-apps');
          const apps = stored ? JSON.parse(stored) : [];
          const newApp = {
            id: `id-${Date.now()}`,
            name: action.payload.name,
            command: action.payload.command,
            pathOrCommand: action.payload.command,
            category: action.payload.category || 'Custom',
            icon: 'Laptop',
            enabled: true
          };
          apps.unshift(newApp);
          localStorage.setItem('arc-installed-apps', JSON.stringify(apps));
        }
        return true;
      }
      default:
        return false;
    }
  } catch (err) {
    console.error('Error executing agent action:', err);
    return false;
  }
}
