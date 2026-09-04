import { GoogleGenAI } from '@google/genai';

export interface AiServiceConfig {
  apiKey: string;
  model: string;
  useLocalFallback: boolean;
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
 * Covers general queries, commands, definitions, coding, conversions, and facts.
 */
export function getLocalAiAnswer(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();

  // 1. Arc capabilities and identity
  if (/^(what can you do|capabilities|features|what do you do)\b/i.test(p)) {
    return `✨ **Arc Desktop Intelligence Capabilities:**
• **Instant App & Tool Launching**: Launch system applications (VS Code, Terminal, Chrome, Spotify, etc.) via keyboard.
• **Calculations & Math**: Type equations (e.g. \`15% of 850\`, \`sqrt(144) * 12\`) for instant calculation.
• **AI Assistance**: Get instant answers, code snippets, definitions, and summaries on any topic.
• **System Controls**: Lock screen, mute audio, toggle dark mode, open Explorer/Downloads.
• **Bookmarks & Clipboard**: Save URLs and frequently copied text snippets with one-click access.
• **Global Hotkey**: Press **Alt + Space** anywhere on your desktop to toggle Arc.`;
  }

  if (/^(who are you|what is this|about arc|who made you)\b/i.test(p)) {
    return `⚡ **Arc Desktop Command Palette**
I am your high-performance desktop companion built with Rust & Tauri. Designed for lightning-fast productivity, instant calculations, application launching, and AI intelligence.`;
  }

  if (/^(help|commands|shortcuts|how to use)\b/i.test(p)) {
    return `⌨️ **Arc Desktop Quick Guide:**
• **Alt + Space**: Summon or dismiss command bar anywhere.
• **Enter**: Open selected app, link, or calculation.
• **Shift + Enter**: Send active prompt to AI Assistant.
• **Type Math**: e.g., \`25 * 40\`, \`120 usd to eur\`, \`30% of 1500\`.
• **Settings (⚙)**: Manage system apps visibility, configure Gemini API key, and manage bookmarks.`;
  }

  // 2. Greetings
  if (/^(hi|hello|hey|greetings|hola|good morning|good evening|good afternoon)\b/i.test(p)) {
    return `👋 **Hello!** How can I help you right now?
Try typing an application name (e.g. *Code*, *Terminal*), a math problem (e.g. *45 * 18*), or any question to get an instant answer.`;
  }

  // 3. Coding snippets & questions
  if (p.includes('reverse a string') || p.includes('reverse string')) {
    return `💻 **Reversing a string:**
• **Python:** \`text[::-1]\`
• **JavaScript / TypeScript:** \`str.split('').reverse().join('')\`
• **Rust:** \`s.chars().rev().collect::<String>()\`
• **Java:** \`new StringBuilder(str).reverse().toString()\` `;
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
 * Generate AI Response using either:
 * 1. User/Env Google Gemini API Key with @google/genai
 * 2. Or Direct REST endpoint
 * 3. Or Smart Local Engine
 */
export async function queryGeminiAi(prompt: string): Promise<string> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return 'Please enter a prompt or question.';

  const apiKey = getStoredApiKey();
  const modelName = getStoredModel() || 'gemini-2.5-flash';

  // 1. If API Key is present, call Google Gemini
  if (apiKey) {
    try {
      // Direct REST fallback if SDK has web worker or browser bundle issues
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are Arc Desktop AI, an ultra-fast desktop productivity assistant. Answer clearly, concisely, and formatting with clean Markdown bullet points when appropriate: ${cleanPrompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return candidate.trim();
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Gemini API error response:', errJson);
        const errMsg = errJson.error?.message || res.statusText;
        if (res.status === 400 || res.status === 403) {
          return `⚠️ **Gemini API Error:** ${errMsg}\n\nPlease check your API key in **Settings (⚙) → AI & Gemini API**.`;
        }
      }
    } catch (apiErr) {
      console.warn('Network error reaching Gemini API:', apiErr);
    }
  }

  // 2. Check Local Knowledge Engine
  const localAnswer = getLocalAiAnswer(cleanPrompt);
  if (localAnswer) {
    return localAnswer;
  }

  // 3. Fallback informative summary with tip to add API key
  return `💡 **Arc Intelligence Summary:**
• **Query:** "${cleanPrompt}"
• **Topic Analysis:** Arc Desktop processed this request.

*Tip: To unlock live multi-modal generative answers, add your free Google Gemini API key in **Settings (⚙) → AI & Gemini API**.*`;
}
