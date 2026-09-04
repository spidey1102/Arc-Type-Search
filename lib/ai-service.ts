import {
  detectLocalAgentAction,
  executeAgentAction,
  AgentAction,
  addSearchBang
} from '@/lib/agentic-ai';

export interface AiServiceConfig {
  apiKey: string;
  model: string;
  useLocalFallback: boolean;
}

export interface AiQueryResult {
  text: string;
  actionExecuted?: AgentAction;
}

const LOCAL_KEY_STORAGE = 'arc-gemini-key';
const LOCAL_MODEL_STORAGE = 'arc-gemini-model';

export function getStoredApiKey(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(LOCAL_KEY_STORAGE);
    if (custom && custom.trim()) return custom.trim();
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
}

export function saveStoredApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(LOCAL_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(LOCAL_KEY_STORAGE);
    }
  }
}

export function getStoredModel(): string {
  if (typeof window !== 'undefined') {
    const m = localStorage.getItem(LOCAL_MODEL_STORAGE);
    if (m) return m;
  }
  return 'gemini-2.5-flash';
}

export function saveStoredModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_MODEL_STORAGE, model);
  }
}

/**
 * Intelligent local fallback knowledge engine when offline or no API key is set.
 */
export function getLocalAiAnswer(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();

  // 1. Arc capabilities and identity
  if (/^(what can you do|capabilities|features|what do you do)\b/i.test(p)) {
    return `✨ **Arc Desktop Intelligence Capabilities:**
• **Agentic Shortcuts & Bangs**: Tell me to *"create shortcut rd to search reddit"* or *"add bang amz for amazon"*, and I'll configure it on the fly!
• **Search Prefixes (Bangs)**: Type \`yt <query>\`, \`gh <repo>\`, \`wiki <topic>\`, or your custom bangs for direct search.
• **Instant App & Tool Launching**: Launch system applications (VS Code, Terminal, Chrome, Spotify, etc.) via keyboard.
• **Calculations & Math**: Type equations (e.g. \`15% of 850\`, \`sqrt(144) * 12\`) for instant calculation.
• **AI Assistance**: Get instant answers, code snippets, definitions, and summaries on any topic.
• **Bookmarks & Clipboard**: Save URLs and frequently copied text snippets with one-click access.
• **Global Hotkey**: Press **Alt + Space** anywhere on your desktop to toggle Arc.`;
  }

  if (/^(who are you|what is this|about arc|who made you)\b/i.test(p)) {
    return `⚡ **Arc Desktop Command Palette**
I am your high-performance desktop companion built with Rust & Tauri. Designed for lightning-fast productivity, instant calculations, application launching, and agentic AI intelligence.`;
  }

  if (/^(help|commands|shortcuts|how to use)\b/i.test(p)) {
    return `⌨️ **Arc Desktop Quick Guide:**
• **Alt + Space**: Summon or dismiss command bar anywhere.
• **Search Bangs**: Type \`yt <query>\` (YouTube), \`gh <query>\` (GitHub), \`rd <query>\` (Reddit), etc.
• **Agentic AI**: Tell me *"create shortcut eb for ebay"* or *"bookmark https://... as My Link"*.
• **Shift + Enter**: Send active prompt to AI Assistant.
• **Type Math**: e.g., \`25 * 40\`, \`120 usd to eur\`, \`30% of 1500\`.
• **Settings (⚙)**: Manage system apps visibility, configure search bangs, and manage API keys.`;
  }

  // 2. Greetings
  if (/^(hi|hello|hey|greetings|hola|good morning|good evening|good afternoon)\b/i.test(p)) {
    return `👋 **Hello!** How can I help you right now?
Try typing an application name (e.g. *Code*, *Terminal*), a search bang (e.g. *yt lo-fi*), or ask me to create a new shortcut on the fly!`;
  }

  // 3. Coding snippets & questions
  if (p.includes('reverse a string') || p.includes('reverse string')) {
    return `💻 **Reversing a string:**
• **Python:** \`text[::-1]\`
• **JavaScript / TypeScript:** \`str.split('').reverse().join('')\`
• **Rust:** \`s.chars().rev().collect::<String>()\`
• **Java:** \`new StringBuilder(str).reverse().toString()\``;
  }

  if (p.includes('difference between let and const') || p.includes('let vs const')) {
    return `📌 **\`let\` vs \`const\` in JavaScript / TypeScript:**
• **\`const\`**: Block-scoped, cannot be reassigned after declaration. (Use by default for immutable bindings).
• **\`let\`**: Block-scoped, can be reassigned to a new value. (Use when variable value changes, e.g. in loops).`;
  }

  if (p.includes('git undo commit') || p.includes('undo last commit')) {
    return `🔧 **Undo last Git commit:**
• **Keep changes staged:** \`git reset --soft HEAD~1\`
• **Keep changes unstaged:** \`git reset HEAD~1\`
• **Discard all changes (destructive):** \`git reset --hard HEAD~1\``;
  }

  // 4. Time and Date
  if (/^(time|current time|date|what day is it|today's date)\b/i.test(p)) {
    const now = new Date();
    return `🕒 **Current Date & Time:**\n${now.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}`;
  }

  // 5. Jokes / Fun
  if (/^(tell me a joke|joke|funny)\b/i.test(p)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "Why was the JavaScript developer sad? Because they didn't know how to 'null' their feelings.",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
    ];
    return `😄 ${jokes[Math.floor(Math.random() * jokes.length)]}`;
  }

  // 6. Common definitions & concepts
  if (p.includes('quantum computing')) {
    return `⚛️ **Quantum Computing:**
A branch of computing that leverages the principles of quantum mechanics—such as *superposition* and *entanglement*—using **qubits** instead of classical bits (0 or 1). This allows exponentially faster solving of complex cryptography, chemical simulations, and optimization problems.`;
  }

  if (p.includes('what is typescript') || p.includes('what is ts')) {
    return `📘 **TypeScript:**
A strongly typed superset of JavaScript developed by Microsoft. It adds static type definitions, interfaces, and compile-time verification, helping catch errors before runtime and enabling superior IDE tooling.`;
  }

  if (p.includes('what is rust') || p.includes('rust programming')) {
    return `🦀 **Rust:**
A modern systems programming language focused on safety, speed, and concurrency. It guarantees memory safety without a garbage collector through its compile-time ownership and borrowing model.`;
  }

  return null;
}

/**
 * Gemini Tools / Function Declarations for Agentic Action Execution
 */
const GEMINI_AGENTIC_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_search_bang',
        description: 'Creates a new instant search bang/prefix shortcut in Arc Desktop so the user can search any website directly (e.g. prefix "eb" for eBay, "amz" for Amazon, "rd" for Reddit).',
        parameters: {
          type: 'OBJECT',
          properties: {
            prefix: { type: 'STRING', description: 'The short lowercase prefix trigger, e.g. "eb", "ddg", "yt"' },
            name: { type: 'STRING', description: 'The human-friendly name of the website or search engine, e.g. "eBay", "Reddit"' },
            url_template: { type: 'STRING', description: 'The search URL template containing "{q}" where user query will be inserted, e.g. "https://www.ebay.com/sch/i.html?_nkw={q}"' },
            example_query: { type: 'STRING', description: 'A realistic example query, e.g. "headphones"' }
          },
          required: ['prefix', 'name', 'url_template']
        }
      },
      {
        name: 'create_bookmark',
        description: 'Saves a web URL link or clipboard text snippet to the user\'s favorites in Arc Desktop.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Short descriptive title for the bookmark or snippet' },
            value: { type: 'STRING', description: 'The web URL (https://...) or text string to copy' },
            type: { type: 'STRING', enum: ['url', 'copy'], description: 'Whether it is a web URL or a clipboard copy snippet' }
          },
          required: ['title', 'value']
        }
      },
      {
        name: 'create_app_shortcut',
        description: 'Adds a custom desktop application shortcut or executable command.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Application name, e.g. "Blender", "IntelliJ"' },
            command: { type: 'STRING', description: 'Executable command or path, e.g. "blender", "idea"' },
            category: { type: 'STRING', description: 'Category e.g. "developer", "graphics", "system"' }
          },
          required: ['name', 'command']
        }
      }
    ]
  }
];

/**
 * Generate AI Response with Agentic Tool-Execution.
 */
export async function queryGeminiAi(prompt: string): Promise<string> {
  const result = await queryAgenticAi(prompt);
  return result.text;
}

export async function queryAgenticAi(prompt: string): Promise<AiQueryResult> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return { text: 'Please enter a prompt or instruction.' };

  // 1. FIRST check our local intelligent NLP agent parser for instantaneous offline action execution
  const localAction = detectLocalAgentAction(cleanPrompt);
  if (localAction) {
    const executed = executeAgentAction(localAction);
    if (executed) {
      let detailMsg = '';
      if (localAction.type === 'create_bang') {
        const { prefix, name, exampleQuery } = localAction.payload;
        detailMsg = `⚡ **Agent Action Executed:**\n• Created search shortcut **\`${prefix}\`** for **${name}**.\n• You can now type **\`${prefix} <anything>\`** in the command bar to search ${name} directly!\n• *Example:* Try typing \`${prefix} ${exampleQuery || 'news'}\` in Arc.`;
      } else if (localAction.type === 'create_bookmark') {
        detailMsg = `⚡ **Agent Action Executed:**\n• ${localAction.summary}\n• Saved to your Bookmarks list and immediately accessible.`;
      } else if (localAction.type === 'create_app') {
        detailMsg = `⚡ **Agent Action Executed:**\n• ${localAction.summary}\n• App shortcut registered in your Arc launcher.`;
      } else if (localAction.type === 'system_command') {
        detailMsg = `⚡ **Agent Action Executed:**\n• ${localAction.summary}`;
      }
      return { text: detailMsg, actionExecuted: localAction };
    }
  }

  const apiKey = getStoredApiKey();
  const modelName = getStoredModel() || 'gemini-2.5-flash';

  // 2. If API Key is present, call Google Gemini with tool declarations
  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Arc Desktop AI, an ultra-fast desktop assistant. You have access to tools to create search bangs (shortcuts like 'yt' for YouTube or 'eb' for eBay), bookmarks, and app shortcuts on command. If the user asks you to create or add a shortcut, bang, link, or app, call the appropriate tool. Otherwise, answer clearly, concisely, and formatting with clean Markdown bullet points:\n${cleanPrompt}`
            }]
          }],
          tools: GEMINI_AGENTIC_TOOLS,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const content = candidate?.content;

        // Check if Gemini invoked a function call
        const functionCallPart = content?.parts?.find((p: any) => p.functionCall);
        if (functionCallPart && functionCallPart.functionCall) {
          const { name, args } = functionCallPart.functionCall;

          if (name === 'create_search_bang') {
            const newBang = addSearchBang(args.prefix, args.name, args.url_template, args.example_query);
            const action: AgentAction = {
              type: 'create_bang',
              summary: `Created search bang \`${newBang.prefix}\` for ${newBang.name}!`,
              payload: newBang
            };
            return {
              text: `⚡ **Agent Action Executed:**\n• Created search shortcut **\`${newBang.prefix}\`** for **${newBang.name}**.\n• You can now type **\`${newBang.prefix} <anything>\`** in Arc to search ${newBang.name} directly!\n• *Example:* \`${newBang.prefix} ${args.example_query || 'demo'}\``,
              actionExecuted: action
            };
          }

          if (name === 'create_bookmark') {
            const action: AgentAction = {
              type: 'create_bookmark',
              summary: `Saved bookmark "${args.title}"!`,
              payload: { title: args.title, value: args.value, type: args.type || 'url' }
            };
            executeAgentAction(action);
            return {
              text: `⚡ **Agent Action Executed:**\n• Saved **${args.title}** (${args.value}) to your bookmarks.`,
              actionExecuted: action
            };
          }

          if (name === 'create_app_shortcut') {
            const action: AgentAction = {
              type: 'create_app',
              summary: `Registered app shortcut "${args.name}"!`,
              payload: { name: args.name, command: args.command, category: args.category || 'Custom' }
            };
            executeAgentAction(action);
            return {
              text: `⚡ **Agent Action Executed:**\n• Added desktop app shortcut for **${args.name}** (command: \`${args.command}\`).`,
              actionExecuted: action
            };
          }
        }

        // Regular text response
        const textPart = content?.parts?.find((p: any) => p.text);
        if (textPart && textPart.text) {
          return { text: textPart.text.trim() };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Gemini API error response:', errJson);
        const errMsg = errJson.error?.message || res.statusText;
        if (res.status === 400 || res.status === 403) {
          return {
            text: `⚠️ **Gemini API Error:** ${errMsg}\n\nPlease check your API key in **Settings (⚙) → AI & Gemini API**.`
          };
        }
      }
    } catch (apiErr) {
      console.warn('Network error reaching Gemini API:', apiErr);
    }
  }

  // 3. Local Knowledge Engine fallback
  const localAnswer = getLocalAiAnswer(cleanPrompt);
  if (localAnswer) {
    return { text: localAnswer };
  }

  // 4. Default helpful fallback
  return {
    text: `💡 **Arc Intelligence Summary:**
• **Query:** "${cleanPrompt}"
• **Agentic Actions:** You can ask me:
  - *"Create a shortcut 'eb' to search eBay"*
  - *"Add a bang 'ddg' for DuckDuckGo"*
  - *"Bookmark https://news.ycombinator.com as Hacker News"*
  - *"Add app Blender with command blender"*

*Tip: Connect your free Gemini API key in Settings (⚙) to enable live multi-turn reasoning.*`
  };
}
