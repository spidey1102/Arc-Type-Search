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

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionExecuted?: AgentAction;
  timestamp: number;
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
export function getLocalAiAnswer(prompt: string, history?: AiChatMessage[]): string | null {
  const p = prompt.trim().toLowerCase();

  // 0. Contextual follow-up handling from history if available
  if (history && history.length > 0) {
    const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.text || '';
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.text || '';
    const ctx = (lastAssistantMsg + ' ' + lastUserMsg).toLowerCase();

    // Contextual follow-up: Explain more / in depth
    if (/^(explain more|tell me more|elaborate|go deeper|more details|explain further|why is that|how so|can you elaborate)\b/i.test(p)) {
      if (ctx.includes('reverse a string') || ctx.includes('reverse string')) {
        return `🔍 **Deep Dive: String Reversal Mechanisms**
• **Python (\`text[::-1]\`)**: Uses slice notation \`[start:stop:step]\`. Step \`-1\` strides backward in $O(N)$ time with minimal allocation overhead.
• **JavaScript / TypeScript**: Strings are primitive values (immutable). \`split('')\` allocates a character array, \`reverse()\` reverses in-place, and \`join('')\` reassembles. For full Unicode/emoji safety, use \`Array.from(str).reverse().join('')\`.
• **Rust**: Strings are valid UTF-8 sequences. \`.chars()\` iterates over Unicode scalar values, \`.rev()\` reverses the iterator, and \`.collect::<String>()\` allocates the final reversed buffer safely without breaking multi-byte character boundaries.`;
      }
      if (ctx.includes('let vs const') || ctx.includes('let and const')) {
        return `🔍 **Deep Dive: Temporal Dead Zone & Scope**
• **Temporal Dead Zone (TDZ)**: Both \`let\` and \`const\` exist in TDZ from the start of the block until the evaluation of their declaration line. Accessing them beforehand throws a \`ReferenceError\`.
• **Reference vs Value Immutability**: \`const\` guarantees that the identifier binding cannot be reassigned. However, the properties of an object or elements of an array assigned to \`const\` can still be mutated unless protected by \`Object.freeze()\`.`;
      }
      if (ctx.includes('git undo commit') || ctx.includes('git reset')) {
        return `🔍 **Deep Dive: Git Reset Internals**
• Git commits are immutably addressed SHA pointers in a DAG.
• \`--soft\` moves the \`HEAD\` branch ref back 1 commit while leaving your staging index and working tree untouched.
• \`--mixed\` (default) resets the staging index but keeps working tree changes unstaged.
• \`--hard\` updates index and working tree. If run accidentally, recover lost commits using \`git reflog\`.`;
      }
      if (ctx.includes('quantum computing')) {
        return `🔍 **Deep Dive: Superposition & Entanglement**
• **Superposition**: A qubit can represent states as a linear superposition $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$, allowing algorithms to explore vast solution spaces simultaneously.
• **Entanglement**: Qubits can be linked such that measuring one immediately determines the state of the other, enabling high-performance quantum telecomputation and dense cryptography.`;
      }
      return `🔍 **Detailed Breakdown for "${lastUserMsg}":**
• **Core Concept**: Following up on our previous discussion about ${lastUserMsg || 'your question'}.
• **Application**: Break down the problem into discrete modules, ensuring clear boundary conditions.
• **Best Practice**: Validate runtime inputs, monitor latency, and keep dependencies minimal.`;
    }

    // Contextual follow-up: Give an example / code example
    if (/^(give an example|show an example|code example|example|demo|sample code|can you give an example)\b/i.test(p)) {
      if (ctx.includes('reverse a string') || ctx.includes('reverse string')) {
        return `📝 **Practical Code Example:**
\`\`\`typescript
// Unicode & Emoji-safe string reversal
function reverseString(input: string): string {
  return Array.from(input).reverse().join('');
}

console.log(reverseString("Arc Desktop")); // "potkseD crA"
console.log(reverseString("Rocket 🚀"));    // "🚀 tekcoR"
\`\`\``;
      }
      if (ctx.includes('let vs const')) {
        return `📝 **Practical Code Example:**
\`\`\`typescript
// Immutable configuration
const APP_PORT = 3000;

// Mutable state loop
let connectionAttempts = 0;
while (connectionAttempts < 3) {
  connectionAttempts++;
  console.log(\`Connecting... attempt \${connectionAttempts}\`);
}
\`\`\``;
      }
      return `📝 **Example Scenario:**
\`\`\`bash
# Run command in Arc Desktop or system terminal:
arc --query "${lastUserMsg || 'example'}"
\`\`\``;
    }

    // Contextual language translation (e.g. "in rust", "in python", "in typescript")
    if (p.includes('in rust') || p === 'rust') {
      return `🦀 **In Rust:**
\`\`\`rust
fn main() {
    let text = "Arc Desktop";
    let reversed: String = text.chars().rev().collect();
    println!("{}", reversed);
}
\`\`\``;
    }
    if (p.includes('in python') || p === 'python') {
      return `🐍 **In Python:**
\`\`\`python
text = "Arc Desktop"
print(text[::-1])
\`\`\``;
    }
    if (p.includes('in typescript') || p.includes('in javascript') || p === 'typescript' || p === 'js' || p === 'ts') {
      return `📘 **In TypeScript:**
\`\`\`typescript
const reversed = "Arc Desktop".split('').reverse().join('');
console.log(reversed);
\`\`\``;
    }

    // Contextual follow-up: Summarize
    if (/^(summarize|summary|tldr|tl;dr|in short|briefly)\b/i.test(p)) {
      const cleanSnippet = lastAssistantMsg.replace(/[*#`]/g, '').trim().slice(0, 180);
      return `⚡ **Summary:**\n${cleanSnippet}...`;
    }
  }

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
 * Helper to normalize conversation history for Gemini API multi-turn format.
 * Guarantees alternating roles (user -> model -> user) and ensures first item is 'user'.
 */
function normalizeHistoryForGemini(
  history: AiChatMessage[] | undefined,
  currentPrompt: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (history && history.length > 0) {
    // Keep the most recent 14 turns to avoid exceeding prompt bounds while retaining deep conversational memory
    const recent = history.slice(-14);
    for (const msg of recent) {
      if (!msg.text?.trim()) continue;
      const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${msg.text.trim()}`;
      } else {
        contents.push({
          role,
          parts: [{ text: msg.text.trim() }]
        });
      }
    }
  }

  // Append current prompt
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n\n${currentPrompt.trim()}`;
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: currentPrompt.trim() }]
    });
  }

  // Ensure first turn is 'user'
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
}

/**
 * Generate AI Response with Agentic Tool-Execution.
 */
export async function queryGeminiAi(prompt: string, history?: AiChatMessage[]): Promise<string> {
  const result = await queryAgenticAi(prompt, history);
  return result.text;
}

export async function queryAgenticAi(prompt: string, history?: AiChatMessage[]): Promise<AiQueryResult> {
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

  // 2. If API Key is present, call Google Gemini with tool declarations and conversation history
  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const contentsPayload = normalizeHistoryForGemini(history, cleanPrompt);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are Arc Desktop AI, an ultra-fast desktop assistant. You have access to tools to create search bangs (shortcuts like 'yt' for YouTube or 'eb' for eBay), bookmarks, and app shortcuts on command.
If the user asks you to create or add a shortcut, bang, link, or app, call the appropriate tool.
Remember conversation history and answer follow-up questions accurately and in context. Format responses with clean Markdown bullet points and code blocks.`
            }]
          },
          contents: contentsPayload,
          tools: GEMINI_AGENTIC_TOOLS,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
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

  // 3. Local Knowledge Engine fallback with conversation history
  const localAnswer = getLocalAiAnswer(cleanPrompt, history);
  if (localAnswer) {
    return { text: localAnswer };
  }

  // 4. Contextual fallback when in follow-up mode
  if (history && history.length > 0) {
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.text || 'previous topic';
    return {
      text: `💡 **Following up on "${lastUserMsg}":**
• You asked: "${cleanPrompt}".
• With Arc's local engine, you can ask for code examples, in-depth breakdowns, translations ("in Rust", "in Python"), or tell Arc to *"create a shortcut for this"*.

*Tip: Connect your free Gemini API key in Settings (⚙) to enable unrestricted live multi-turn reasoning.*`
    };
  }

  // 5. Default helpful fallback
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
