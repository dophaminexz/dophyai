// =============================================================================
// API Layer — Google Gemini + OpenRouter (with auto-modes and key rotation)
// =============================================================================

export type ThemeMode = 'dark' | 'light';

export interface ThemeConfig { mode: ThemeMode; }

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

// =============================================================================
// Auto Mode Definitions
// =============================================================================

export interface AutoModeConfig {
  label: string;
  description: string;
  provider: 'google' | 'openrouter';
  models: string[];
}

export const AUTO_MODES: Record<string, AutoModeConfig> = {
  'auto-gemini-flash': {
    label: 'Gemini Fast',
    description: 'Flash models · auto-fallback',
    provider: 'google',
    models: [
      'gemini-flash-latest',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ],
  },
  'auto-gemini-pro': {
    label: 'Gemini Pro',
    description: 'Pro models · best quality',
    provider: 'google',
    models: [
      'gemini-3-pro-preview',
      'gemini-2.5-pro',
    ],
  },
  'auto-openrouter': {
    label: 'OpenRouter',
    description: 'Random free model',
    provider: 'openrouter',
    models: [],
  },
};

export function isAutoMode(model: string): boolean {
  return model in AUTO_MODES;
}

// =============================================================================
// Default Models (no -image variants)
// =============================================================================

export const DEFAULT_GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
];

export const DEFAULT_OPENROUTER_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'tngtech/deepseek-r1t2-chimera:free',
];

export const DEFAULT_GOOGLE_KEYS: string[] = [];
export const DEFAULT_OPENROUTER_KEY = '';
export const DEFAULT_THEME: ThemeConfig = { mode: 'dark' };

export const DEFAULT_SYSTEM_PROMPT = `ПРАВИЛА ОФОРМЛЕНИЯ:
1. Используй LaTeX для формул: $inline$ или $$block$$.
2. Используй Markdown для форматирования текста.
3. Для таблиц используй Markdown формат (| col | col |).
4. Если просят построить график, составь Markdown таблицу значений (X | Y) с минимум 10 точками.
5. Для кода используй блоки \`\`\`язык ... \`\`\`.`;

// =============================================================================
// Utility Functions
// =============================================================================

export function isGoogleModel(model: string): boolean {
  if (isAutoMode(model)) return AUTO_MODES[model].provider === 'google';
  return model.startsWith('gemini');
}

export function isImageCapableModel(model: string): boolean {
  return model.includes('image');
}

export function getModelShortName(model: string): string {
  if (model === 'auto-gemini-flash') return 'Auto: Flash';
  if (model === 'auto-gemini-pro') return 'Auto: Pro';
  if (model === 'auto-openrouter') return 'Auto: OpenRouter';
  if (model.includes('/')) return model.split('/').pop()?.replace(':free', '') || model;
  return model;
}

export function getModelDotColor(model: string): string {
  if (model === 'auto-gemini-flash') return 'bg-amber-400';
  if (model === 'auto-gemini-pro') return 'bg-violet-400';
  if (model === 'auto-openrouter') return 'bg-emerald-400';
  if (isGoogleModel(model)) return 'bg-blue-400';
  return 'bg-emerald-400';
}

// =============================================================================
// Message conversion helpers
// =============================================================================

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
  return /429|500|503|overloaded|quota|rate.?limit|capacity|unavailable|keys? failed|exhausted/i.test(errorMsg);
}

// =============================================================================
// Gemini Streaming (with key rotation)
// =============================================================================

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
    throw new Error('No Google API keys configured. Go to Settings → API Keys.');
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
        throw new Error('Empty response from model');
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

  addLog({ timestamp: Date.now(), level: 'error', message: `All ${shuffledKeys.length} keys exhausted for ${model}` });
  throw new Error(`All ${shuffledKeys.length} keys failed for ${model}.`);
}

// =============================================================================
// OpenRouter Streaming
// =============================================================================

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
    throw new Error('No OpenRouter API key. Go to Settings → API Keys.');
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `→ OpenRouter [${getModelShortName(model)}]` });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DophyAI',
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

// =============================================================================
// Auto Mode — tries models in priority order with fallback
// =============================================================================

async function callAutoMode(
  messages: ChatMessage[],
  autoKey: string,
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  const autoConfig = AUTO_MODES[autoKey];
  if (!autoConfig) throw new Error(`Unknown auto mode: ${autoKey}`);

  let modelsToTry: string[];

  if (autoConfig.provider === 'openrouter') {
    modelsToTry = [...config.openrouterModels].sort(() => Math.random() - 0.5);
    if (modelsToTry.length === 0) {
      throw new Error('No OpenRouter models configured. Add models in Settings → Models.');
    }
  } else {
    modelsToTry = [...autoConfig.models];
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `🔄 Auto [${autoConfig.label}] — ${modelsToTry.length} model(s) to try` });

  const allErrors: string[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    if (signal?.aborted) throw new Error('Request aborted');

    addLog({ timestamp: Date.now(), level: 'info', message: `Auto: trying ${getModelShortName(modelName)} (${i + 1}/${modelsToTry.length})` });

    try {
      onResetContent();

      if (autoConfig.provider === 'google') {
        return await callGeminiStreaming(
          messages, modelName, config.googleKeys, config.systemPrompt,
          onChunk, onResetContent, addLog, signal
        );
      } else {
        return await callOpenRouter(
          messages, modelName, config.openrouterKey, config.systemPrompt,
          onChunk, addLog, signal
        );
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('abort')) throw e;

      allErrors.push(`${getModelShortName(modelName)}: ${errMsg.slice(0, 80)}`);

      if (!isRetryableError(errMsg)) {
        addLog({ timestamp: Date.now(), level: 'error', message: `Auto: ${getModelShortName(modelName)} non-retryable error: ${errMsg.slice(0, 80)}` });
        throw e;
      }

      addLog({ timestamp: Date.now(), level: 'warn', message: `Auto: ${getModelShortName(modelName)} failed, trying next...` });
      continue;
    }
  }

  addLog({ timestamp: Date.now(), level: 'error', message: `Auto: all ${modelsToTry.length} models failed` });
  throw new Error(`Auto mode: all ${modelsToTry.length} models failed. Check API keys or try later.\n\n${allErrors.join('\n')}`);
}

// =============================================================================
// Main Router
// =============================================================================

export async function generateResponse(
  messages: ChatMessage[],
  model: string,
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (isAutoMode(model)) {
    return callAutoMode(messages, model, config, onChunk, onResetContent, addLog, signal);
  }

  if (isGoogleModel(model)) {
    return callGeminiStreaming(messages, model, config.googleKeys, config.systemPrompt, onChunk, onResetContent, addLog, signal);
  } else {
    return callOpenRouter(messages, model, config.openrouterKey, config.systemPrompt, onChunk, addLog, signal);
  }
}
