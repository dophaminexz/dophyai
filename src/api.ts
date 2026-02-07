// =============================================================================
// API Layer — Google Gemini + OpenRouter (with robust key rotation)
// =============================================================================

export type ThemeMode = 'dark' | 'light';
export type ColorScheme = 'indigo' | 'emerald' | 'rose' | 'amber';

export interface ThemeConfig {
  mode: ThemeMode;
  scheme: ColorScheme;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  responseImages?: string[];
  model?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppConfig {
  googleKeys: string[];
  openrouterKey: string;
  systemPrompt: string;
  googleModels: string[];
  openrouterModels: string[];
  theme: ThemeConfig;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'warn';
  message: string;
}

export const DEFAULT_GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-image',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3-pro-image-preview',
];

export const DEFAULT_OPENROUTER_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'tngtech/deepseek-r1t2-chimera:free',
];

// Empty by default — user must add their own keys
export const DEFAULT_GOOGLE_KEYS: string[] = [];
export const DEFAULT_OPENROUTER_KEY = '';

export const DEFAULT_THEME: ThemeConfig = { mode: 'dark', scheme: 'indigo' };

export const DEFAULT_SYSTEM_PROMPT = [
  'ПРАВИЛА ОФОРМЛЕНИЯ:',
  '1. Используй LaTeX для формул: $inline$ или $$block$$.',
  '2. Используй Markdown для форматирования текста.',
  '3. Для таблиц используй Markdown формат (| col | col |).',
  '4. Если просят построить график, составь Markdown таблицу значений (X | Y) с минимум 10 точками.',
  '5. Для кода используй блоки ```язык ... ```.',
].join('\n');

export function isGoogleModel(model: string): boolean {
  return model.startsWith('gemini');
}

export function isImageCapableModel(model: string): boolean {
  return model.includes('image');
}

export function getModelShortName(model: string): string {
  if (model.includes('/')) {
    return model.split('/').pop()?.replace(':free', '') || model;
  }
  return model;
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map(msg => {
    const parts: Record<string, unknown>[] = [];
    if (msg.images && msg.images.length > 0) {
      for (const img of msg.images) {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
    parts.push({ text: msg.content || ' ' });
    return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
  });
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string) {
  const result: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ];
  for (const msg of messages) {
    result.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }
  return result;
}

function isRetryableError(errorMsg: string): boolean {
  return /429|500|503|overloaded|quota|rate.?limit|capacity|unavailable/i.test(errorMsg);
}

export async function callGeminiStreaming(
  messages: ChatMessage[],
  model: string,
  keys: string[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (keys.length === 0) {
    throw new Error('No Google API keys configured. Go to Settings → API Keys to add one.');
  }

  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  const errors: string[] = [];

  addLog({ timestamp: Date.now(), level: 'info', message: `→ Gemini [${model}] — ${shuffledKeys.length} key(s)` });

  for (let i = 0; i < shuffledKeys.length; i++) {
    const key = shuffledKeys[i];
    const keyHint = key.slice(-6);

    if (signal?.aborted) throw new Error('Request aborted');

    try {
      const contents = toGeminiContents(messages);
      const body: Record<string, unknown> = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 1.0, maxOutputTokens: 65536 },
      };

      if (isImageCapableModel(model)) {
        (body.generationConfig as Record<string, unknown>).responseModalities = ['TEXT', 'IMAGE'];
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`;
      addLog({ timestamp: Date.now(), level: 'info', message: `Key ...${keyHint} (${i + 1}/${shuffledKeys.length})` });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      onResetContent();

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      const images: string[] = [];
      let buffer = '';
      let gotContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              const errMsg = data.error.message || JSON.stringify(data.error);
              throw new Error(`Stream error ${data.error.code || ''}: ${errMsg.slice(0, 200)}`);
            }

            const candidates = data.candidates || [];
            if (candidates.length === 0) {
              if (data.promptFeedback?.blockReason) {
                throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
              }
              continue;
            }

            const parts = candidates[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                fullText += part.text;
                onChunk(part.text);
                gotContent = true;
              }
              if (part.inlineData) {
                images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                gotContent = true;
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && (
              parseErr.message.startsWith('Stream error') ||
              parseErr.message.startsWith('Prompt blocked')
            )) {
              if (gotContent) {
                addLog({ timestamp: Date.now(), level: 'warn', message: 'Stream interrupted with partial content' });
                return { text: fullText, images };
              }
              throw parseErr;
            }
          }
        }
      }

      if (!gotContent && !fullText && images.length === 0) {
        throw new Error('Empty response');
      }

      addLog({ timestamp: Date.now(), level: 'info', message: `← OK via ...${keyHint} (${fullText.length} chars${images.length ? `, ${images.length} imgs` : ''})` });
      return { text: fullText, images };

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('abort')) throw e;

      errors.push(`...${keyHint}: ${errMsg.slice(0, 100)}`);
      addLog({ timestamp: Date.now(), level: 'warn', message: `Key ...${keyHint} failed: ${errMsg.slice(0, 80)}` });

      if (!isRetryableError(errMsg)) throw new Error(errMsg);
      continue;
    }
  }

  addLog({ timestamp: Date.now(), level: 'error', message: `All ${shuffledKeys.length} keys exhausted` });
  throw new Error(`All ${shuffledKeys.length} keys failed. Add more keys or try later.`);
}

export async function callOpenRouter(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  systemPrompt: string,
  onChunk: (text: string) => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (!apiKey) {
    throw new Error('No OpenRouter API key. Go to Settings → API Keys to add one.');
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `→ OpenRouter [${getModelShortName(model)}]` });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'GeminiChat',
    },
    body: JSON.stringify({ model, messages: toOpenAIMessages(messages, systemPrompt), stream: true }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = data.choices?.[0]?.delta?.content;
          if (chunk) { fullText += chunk; onChunk(chunk); }
        } catch { /* skip */ }
      }
    }
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `← OpenRouter OK (${fullText.length} chars)` });
  return { text: fullText, images: [] };
}

export async function generateResponse(
  messages: ChatMessage[],
  model: string,
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (isGoogleModel(model)) {
    return callGeminiStreaming(messages, model, config.googleKeys, config.systemPrompt, onChunk, onResetContent, addLog, signal);
  } else {
    return callOpenRouter(messages, model, config.openrouterKey, config.systemPrompt, onChunk, addLog, signal);
  }
}
