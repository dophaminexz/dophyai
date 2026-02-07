import { useState, useRef, useEffect, useCallback, type FormEvent, type ChangeEvent, type KeyboardEvent, type TouchEvent as ReactTouchEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import {
  generateResponse,
  DEFAULT_GOOGLE_MODELS,
  DEFAULT_OPENROUTER_MODELS,
  DEFAULT_GOOGLE_KEYS,
  DEFAULT_OPENROUTER_KEY,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_THEME,
  AUTO_MODES,
  isAutoMode,
  isGoogleModel,
  isImageCapableModel,
  getModelShortName,
  getModelDotColor,
  type ThemeMode,
  type ThemeConfig,
  type ChatMessage,
  type ChatSession,
  type AppConfig,
  type LogEntry,
} from './api';

// =============================================================================
// SVG Icons — all custom, no emoji
// =============================================================================
const I = ({ d, className = 'w-5 h-5', fill }: { d: string; className?: string; fill?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
function IconSend({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>;
}
function IconSettings({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
}
function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return <I d="M12 5v14M5 12h14" className={className} />;
}
function IconX({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}
function IconCopy({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
}
function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return <I d="M20 6 9 17 4 12" className={className} />;
}
function IconMenu({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;
}
function IconImage({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
}
function IconUser({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconStop({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
}
function IconNewChat({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" /></svg>;
}
function IconKey({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" /></svg>;
}
function IconTerminal({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></svg>;
}
function IconPrompt({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /></svg>;
}
function IconChip({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" /></svg>;
}
function IconGoogle({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 11h8.533c.044.385.067.78.067 1.184 0 2.734-.98 5.036-2.678 6.6-1.485 1.371-3.518 2.175-5.942 2.175A8.976 8.976 0 0 1 3 12a8.976 8.976 0 0 1 8.98-8.959c2.424 0 4.458.882 6.012 2.315l-2.58 2.58C14.2 6.773 13.2 6.36 12 6.36c-3.1 0-5.62 2.64-5.62 5.64s2.52 5.64 5.62 5.64c2.94 0 4.52-1.68 4.88-3.64H12V11z" /></svg>;
}
function IconDeepSeek({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" /></svg>;
}
function IconChat({ className = 'w-4 h-4' }: { className?: string }) {
  return <I d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" className={className} />;
}
function IconChevron({ className = 'w-4 h-4' }: { className?: string }) {
  return <I d="m6 9 6 6 6-6" className={className} />;
}
function IconEdit({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <I d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" className={className} />;
}
function IconClock({ className = 'w-3 h-3' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IconMsgCount({ className = 'w-3 h-3' }: { className?: string }) {
  return <I d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" className={className} />;
}
function IconDownload({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
}
function IconUpload({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
}
function IconDatabase({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" /></svg>;
}
function IconSun({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
}
function IconMoon({ className = 'w-5 h-5' }: { className?: string }) {
  return <I d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" className={className} />;
}
function IconWarning({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
}
function IconSwipe({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" /><path d="M10 19v-3.96 3.15" /><path d="M7 19h5" /><path d="m16 12 3 3-3 3" /><path d="M19 15H13" /></svg>;
}
function IconZap({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>;
}
function IconCrown({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7z" /><path d="M5 16h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z" /></svg>;
}
function IconShuffle({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H20" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M20 18h-2.4c-1.3 0-2.5-.6-3.3-1.7l-.6-.8" /><path d="m18 14 4 4-4 4" /></svg>;
}
function IconWand({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></svg>;
}

// DophyAI Logo — tries /logo.png, /icon.png, then SVG fallback with logo colors
function DophyLogo({ className = 'w-8 h-8' }: { className?: string }) {
  const [fallback, setFallback] = useState(0);
  const paths = ['/logo.png', '/icon.png'];

  if (fallback < paths.length) {
    return <img src={paths[fallback]} alt="D" className={`${className} rounded-lg object-contain`} onError={() => setFallback(f => f + 1)} />;
  }
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#fdf4e4" />
      <text x="20" y="28" textAnchor="middle" fontFamily="Inter, system-ui" fontSize="22" fontWeight="700" fill="#44433f">D</text>
    </svg>
  );
}

function DophyLogoBig() {
  const [fallback, setFallback] = useState(0);
  const paths = ['/logo.png', '/icon.png'];

  if (fallback < paths.length) {
    return <img src={paths[fallback]} alt="DophyAI" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain" onError={() => setFallback(f => f + 1)} />;
  }
  return (
    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl" style={{ background: '#fdf4e4' }}>
      <svg viewBox="0 0 40 40" className="w-9 h-9">
        <text x="20" y="28" textAnchor="middle" fontFamily="Inter, system-ui" fontSize="24" fontWeight="800" fill="#44433f">D</text>
      </svg>
    </div>
  );
}

// =============================================================================
// Theme Helpers
// =============================================================================

function applyThemeToDOM(theme: ThemeConfig) {
  document.documentElement.setAttribute('data-mode', theme.mode);
  const metaEls = document.querySelectorAll('meta[name="theme-color"]');
  metaEls.forEach(m => m.remove());
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = theme.mode === 'dark' ? '#1a1916' : '#fdf4e4';
  document.head.appendChild(meta);
}

// =============================================================================
// Constants & Persistence
// =============================================================================
const LS_CONFIG = 'dophy-config-v4';
const LS_SESSIONS = 'dophy-sessions';
const LS_ACTIVE = 'dophy-active';
const LS_MODEL = 'dophy-model';

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        googleKeys: Array.isArray(p.googleKeys) ? p.googleKeys : [...DEFAULT_GOOGLE_KEYS],
        openrouterKey: typeof p.openrouterKey === 'string' ? p.openrouterKey : DEFAULT_OPENROUTER_KEY,
        systemPrompt: typeof p.systemPrompt === 'string' ? p.systemPrompt : DEFAULT_SYSTEM_PROMPT,
        googleModels: Array.isArray(p.googleModels) ? p.googleModels : [...DEFAULT_GOOGLE_MODELS],
        openrouterModels: Array.isArray(p.openrouterModels) ? p.openrouterModels : [...DEFAULT_OPENROUTER_MODELS],
        theme: (p.theme && p.theme.mode) ? { mode: p.theme.mode } : { ...DEFAULT_THEME },
      };
    }
  } catch { /* ignore */ }
  return {
    googleKeys: [...DEFAULT_GOOGLE_KEYS],
    openrouterKey: DEFAULT_OPENROUTER_KEY,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    googleModels: [...DEFAULT_GOOGLE_MODELS],
    openrouterModels: [...DEFAULT_OPENROUTER_MODELS],
    theme: { ...DEFAULT_THEME },
  };
}

function saveConfig(c: AppConfig) { localStorage.setItem(LS_CONFIG, JSON.stringify(c)); }
function loadSessions(): ChatSession[] { try { const r = localStorage.getItem(LS_SESSIONS); if (r) return JSON.parse(r); } catch {} return []; }
function saveSessions(s: ChatSession[]) { localStorage.setItem(LS_SESSIONS, JSON.stringify(s)); }
function loadActiveId(): string | null { return localStorage.getItem(LS_ACTIVE); }
function saveActiveId(id: string | null) { if (id) localStorage.setItem(LS_ACTIVE, id); else localStorage.removeItem(LS_ACTIVE); }
function loadModel(): string { return localStorage.getItem(LS_MODEL) || 'auto-gemini-flash'; }
function saveModel(m: string) { localStorage.setItem(LS_MODEL, m); }

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function generateTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  return first.content.slice(0, 50) + (first.content.length > 50 ? '...' : '');
}

function relTime(ts: number): string {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getDateGroup(ts: number): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= todayStart) return 'Today';
  if (ts >= todayStart - 86400000) return 'Yesterday';
  if (ts >= todayStart - 7 * 86400000) return 'Previous 7 Days';
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getFullYear() === now.getFullYear() ? months[d.getMonth()] : `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function groupSessions(sessions: ChatSession[]) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const map = new Map<string, ChatSession[]>();
  for (const s of sorted) {
    const label = getDateGroup(s.updatedAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  }
  return Array.from(map, ([label, items]) => ({ label, sessions: items }));
}

// =============================================================================
// Swipe Hook
// =============================================================================
function useSwipe(onSwipeRight: () => void, onSwipeLeft: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number } | null>(null);

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchMove = useCallback((e: ReactTouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    const dx = touchEnd.current.x - touchStart.current.x;
    if (dx > 80 && touchStart.current.x < 40) onSwipeRight();
    if (dx < -80) onSwipeLeft();
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeRight, onSwipeLeft]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// =============================================================================
// Markdown Renderer
// =============================================================================
function MarkdownContent({ content }: { content: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = useCallback((e: React.MouseEvent<HTMLButtonElement>, codeId: string) => {
    const container = e.currentTarget.closest('.group\\/code');
    const preEl = container?.querySelector('pre');
    navigator.clipboard.writeText(preEl?.textContent || '').then(() => {
      setCopiedId(codeId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        pre({ children, ...props }) {
          const codeId = uid();
          return (
            <div className="group/code relative my-3">
              <button onClick={(e) => handleCopyCode(e, codeId)} className="absolute right-2 top-2 rounded-md bg-[var(--c-surface-h)] p-1.5 opacity-0 transition-opacity hover:bg-[var(--c-border-h)] group-hover/code:opacity-100 active:scale-95 touch-manipulation" title="Copy code">
                {copiedId === codeId ? <IconCheck className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5 text-[var(--c-text2)]" />}
              </button>
              <pre {...props} className="overflow-x-auto rounded-xl bg-[var(--c-code-bg)] p-3 sm:p-4 text-sm leading-relaxed border border-[var(--c-code-border)]">{children}</pre>
            </div>
          );
        },
        code({ children, className, ...props }) {
          if (!className) return <code {...props} className="rounded-md bg-[var(--c-accent-bg)] px-1.5 py-0.5 text-[0.875em] text-[var(--c-accent-t)] font-mono">{children}</code>;
          return <code {...props} className={className}>{children}</code>;
        },
        table({ children, ...props }) {
          return <div className="my-3 overflow-x-auto rounded-xl border border-[var(--c-border)]"><table {...props} className="w-full text-sm">{children}</table></div>;
        },
        thead({ children, ...props }) {
          return <thead {...props} className="bg-[var(--c-surface)] text-left text-xs uppercase tracking-wider text-[var(--c-text2)]">{children}</thead>;
        },
        th({ children, ...props }) { return <th {...props} className="px-3 py-2 sm:px-4 sm:py-2.5 font-semibold">{children}</th>; },
        td({ children, ...props }) { return <td {...props} className="border-t border-[var(--c-border)] px-3 py-1.5 sm:px-4 sm:py-2">{children}</td>; },
        a({ children, href, ...props }) {
          return <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--c-accent-t)] underline decoration-[var(--c-accent-bg)] hover:decoration-[var(--c-accent-t)] transition-colors">{children}</a>;
        },
        blockquote({ children, ...props }) {
          return <blockquote {...props} className="my-3 border-l-3 border-[var(--c-accent)] pl-4 italic text-[var(--c-text2)]">{children}</blockquote>;
        },
        ul({ children, ...props }) { return <ul {...props} className="my-2 list-disc pl-6 space-y-1">{children}</ul>; },
        ol({ children, ...props }) { return <ol {...props} className="my-2 list-decimal pl-6 space-y-1">{children}</ol>; },
        h1({ children, ...props }) { return <h1 {...props} className="mt-4 mb-2 text-xl font-bold text-[var(--c-text)]">{children}</h1>; },
        h2({ children, ...props }) { return <h2 {...props} className="mt-3 mb-2 text-lg font-semibold text-[var(--c-text)]">{children}</h2>; },
        h3({ children, ...props }) { return <h3 {...props} className="mt-3 mb-1.5 text-base font-semibold text-[var(--c-text)]">{children}</h3>; },
        p({ children, ...props }) { return <p {...props} className="my-1.5 leading-relaxed">{children}</p>; },
        hr(props) { return <hr {...props} className="my-4 border-[var(--c-border)]" />; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// =============================================================================
// Settings Panel
// =============================================================================
type SettingsTab = 'keys' | 'models' | 'theme' | 'prompt' | 'data' | 'logs';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  logs: LogEntry[];
  clearLogs: () => void;
  sessions: ChatSession[];
  setSessions: (s: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
}

function SettingsPanel({ open, onClose, config, setConfig, logs, clearLogs, sessions, setSessions, setActiveSessionId }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>('keys');
  const [newKey, setNewKey] = useState('');
  const [newGoogleModel, setNewGoogleModel] = useState('');
  const [newOrModel, setNewOrModel] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tab === 'logs' && logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logs, tab]);

  const update = useCallback((patch: Partial<AppConfig>) => {
    const u = { ...config, ...patch };
    setConfig(u);
    saveConfig(u);
  }, [config, setConfig]);

  const addGoogleKey = () => { const k = newKey.trim(); if (k && !config.googleKeys.includes(k)) { update({ googleKeys: [...config.googleKeys, k] }); setNewKey(''); } };
  const removeGoogleKey = (i: number) => update({ googleKeys: config.googleKeys.filter((_, j) => j !== i) });

  const addGoogleModel = () => { const m = newGoogleModel.trim(); if (m && !config.googleModels.includes(m)) { update({ googleModels: [...config.googleModels, m] }); setNewGoogleModel(''); } };
  const removeGoogleModel = (i: number) => update({ googleModels: config.googleModels.filter((_, j) => j !== i) });
  const addOrModel = () => { const m = newOrModel.trim(); if (m && !config.openrouterModels.includes(m)) { update({ openrouterModels: [...config.openrouterModels, m] }); setNewOrModel(''); } };
  const removeOrModel = (i: number) => update({ openrouterModels: config.openrouterModels.filter((_, j) => j !== i) });

  const updateTheme = (mode: ThemeMode) => { const t: ThemeConfig = { mode }; update({ theme: t }); applyThemeToDOM(t); };

  const exportData = useCallback((type: 'all' | 'chats' | 'keys') => {
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: 4, app: 'DophyAI' };
    if (type === 'all' || type === 'chats') data.sessions = sessions;
    if (type === 'all' || type === 'keys') data.config = { googleKeys: config.googleKeys, openrouterKey: config.openrouterKey, systemPrompt: config.systemPrompt, googleModels: config.googleModels, openrouterModels: config.openrouterModels, theme: config.theme };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `dophy-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    setImportStatus(`Exported ${type}`); setTimeout(() => setImportStatus(null), 3000);
  }, [sessions, config]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const imported: string[] = [];
        if (data.sessions && Array.isArray(data.sessions)) {
          const ids = new Set(sessions.map(s => s.id));
          const newS = data.sessions.filter((s: ChatSession) => !ids.has(s.id));
          if (newS.length > 0) { const m = [...sessions, ...newS]; setSessions(m); saveSessions(m); imported.push(`${newS.length} chats`); }
        }
        if (data.config) {
          const nc = { ...config };
          if (Array.isArray(data.config.googleKeys)) { const nk = data.config.googleKeys.filter((k: string) => !config.googleKeys.includes(k)); if (nk.length) { nc.googleKeys = [...config.googleKeys, ...nk]; imported.push(`${nk.length} API keys`); } }
          if (typeof data.config.openrouterKey === 'string' && data.config.openrouterKey) { nc.openrouterKey = data.config.openrouterKey; imported.push('OR key'); }
          if (typeof data.config.systemPrompt === 'string') { nc.systemPrompt = data.config.systemPrompt; imported.push('prompt'); }
          if (Array.isArray(data.config.googleModels)) { const nm = data.config.googleModels.filter((m: string) => !config.googleModels.includes(m)); if (nm.length) { nc.googleModels = [...config.googleModels, ...nm]; imported.push(`${nm.length} Google models`); } }
          if (Array.isArray(data.config.openrouterModels)) { const nm = data.config.openrouterModels.filter((m: string) => !config.openrouterModels.includes(m)); if (nm.length) { nc.openrouterModels = [...config.openrouterModels, ...nm]; imported.push(`${nm.length} OR models`); } }
          if (data.config.theme && data.config.theme.mode) { nc.theme = { mode: data.config.theme.mode }; applyThemeToDOM(nc.theme); imported.push('theme'); }
          setConfig(nc); saveConfig(nc);
        }
        setImportStatus(imported.length ? `Imported: ${imported.join(', ')}` : 'No new data');
      } catch (err) { setImportStatus(`Error: ${err instanceof Error ? err.message : 'Invalid file'}`); }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  }, [sessions, config, setConfig, setSessions]);

  const tabs: { id: SettingsTab; icon: React.ReactNode; label: string }[] = [
    { id: 'keys', icon: <IconKey className="w-4 h-4" />, label: 'API' },
    { id: 'models', icon: <IconChip className="w-4 h-4" />, label: 'Models' },
    { id: 'theme', icon: <IconSun className="w-4 h-4" />, label: 'Theme' },
    { id: 'prompt', icon: <IconPrompt className="w-4 h-4" />, label: 'Prompt' },
    { id: 'data', icon: <IconDatabase className="w-4 h-4" />, label: 'Data' },
    { id: 'logs', icon: <IconTerminal className="w-4 h-4" />, label: 'Logs' },
  ];

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 flex w-full sm:w-[28rem] sm:max-w-lg flex-col bg-[var(--c-bg)] border-l border-[var(--c-border)] shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 sm:px-6 py-3 sm:py-4 settings-safe-top">
          <div className="flex items-center gap-2.5">
            <IconSettings className="w-5 h-5 text-[var(--c-text2)]" />
            <h2 className="text-base sm:text-lg font-semibold text-[var(--c-text)]">Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--c-text3)] transition-colors hover:bg-[var(--c-surface-h)] hover:text-[var(--c-text)] active:scale-95 touch-manipulation"><IconX /></button>
        </div>

        <div className="flex overflow-x-auto border-b border-[var(--c-border)] px-2 sm:px-4 hide-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 sm:py-3 text-xs font-medium transition-colors touch-manipulation ${tab === t.id ? 'border-[var(--c-accent)] text-[var(--c-accent-t)]' : 'border-transparent text-[var(--c-text3)] hover:text-[var(--c-text2)]'}`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 settings-safe-bottom">
          {/* ====== API Keys ====== */}
          {tab === 'keys' && (
            <div className="space-y-6">
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
                  <IconGoogle className="w-4 h-4 text-blue-400" /> Google Gemini Keys
                  <span className="ml-auto rounded-full bg-[var(--c-accent-bg)] px-2 py-0.5 text-xs text-[var(--c-accent-t)]">{config.googleKeys.length}</span>
                </label>
                {config.googleKeys.length === 0 && (
                  <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
                    <IconWarning className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>No API keys. Get one free at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">aistudio.google.com</a></span>
                  </div>
                )}
                <div className="space-y-1.5">
                  {config.googleKeys.map((key, i) => (
                    <div key={i} className="group flex items-center gap-2 rounded-lg bg-[var(--c-surface)] px-3 py-2.5">
                      <code className="flex-1 truncate text-xs text-[var(--c-text2)] font-mono">{key.slice(0, 10)}...{key.slice(-4)}</code>
                      <button onClick={() => removeGoogleKey(i)} className="rounded p-1.5 text-[var(--c-text3)] transition-all hover:bg-red-500/20 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 touch-manipulation"><IconTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoogleKey()} placeholder="AIzaSy..." className="flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-input-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none focus:border-[var(--c-accent-border)] font-mono" />
                  <button onClick={addGoogleKey} className="flex items-center gap-1.5 rounded-lg bg-[var(--c-accent)] px-3 py-2.5 text-sm font-medium text-white hover:opacity-90 active:scale-95 touch-manipulation"><IconPlus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>
              <div className="border-t border-[var(--c-border)]" />
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><IconDeepSeek className="w-4 h-4 text-emerald-400" /> OpenRouter Key</label>
                <input type="text" value={config.openrouterKey} onChange={e => update({ openrouterKey: e.target.value })} placeholder="sk-or-..." className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-input-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none focus:border-[var(--c-accent-border)] font-mono" />
              </div>
            </div>
          )}

          {/* ====== Models ====== */}
          {tab === 'models' && (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><IconGoogle className="w-4 h-4 text-blue-400" /> Google <span className="rounded-full bg-[var(--c-accent-bg)] px-2 py-0.5 text-xs text-[var(--c-accent-t)]">{config.googleModels.length}</span></label>
                  <button onClick={() => update({ googleModels: [...DEFAULT_GOOGLE_MODELS] })} className="rounded-lg border border-[var(--c-border)] px-2.5 py-1 text-[10px] text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation">Reset</button>
                </div>
                <div className="space-y-1">
                  {config.googleModels.map((m, i) => (
                    <div key={i} className="group flex items-center gap-2 rounded-lg bg-[var(--c-surface)] px-3 py-2.5">
                      <span className="flex-1 truncate text-sm text-[var(--c-text)]">{m}</span>
                      {isImageCapableModel(m) && <span className="rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-bold text-violet-400">IMG</span>}
                      <button onClick={() => removeGoogleModel(i)} className="rounded p-1.5 text-[var(--c-text3)] transition-all hover:bg-red-500/20 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 touch-manipulation"><IconTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input type="text" value={newGoogleModel} onChange={e => setNewGoogleModel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoogleModel()} placeholder="gemini-..." className="flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-input-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none focus:border-[var(--c-accent-border)]" />
                  <button onClick={addGoogleModel} className="flex items-center gap-1.5 rounded-lg bg-[var(--c-accent)] px-3 py-2.5 text-sm font-medium text-white hover:opacity-90 active:scale-95 touch-manipulation"><IconPlus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="border-t border-[var(--c-border)]" />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><IconDeepSeek className="w-4 h-4 text-emerald-400" /> OpenRouter <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">{config.openrouterModels.length}</span></label>
                  <button onClick={() => update({ openrouterModels: [...DEFAULT_OPENROUTER_MODELS] })} className="rounded-lg border border-[var(--c-border)] px-2.5 py-1 text-[10px] text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation">Reset</button>
                </div>
                <div className="space-y-1">
                  {config.openrouterModels.map((m, i) => (
                    <div key={i} className="group flex items-center gap-2 rounded-lg bg-[var(--c-surface)] px-3 py-2.5">
                      <span className="flex-1 truncate text-sm text-[var(--c-text)]">{getModelShortName(m)}</span>
                      <button onClick={() => removeOrModel(i)} className="rounded p-1.5 text-[var(--c-text3)] transition-all hover:bg-red-500/20 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 touch-manipulation"><IconTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input type="text" value={newOrModel} onChange={e => setNewOrModel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOrModel()} placeholder="provider/model:free" className="flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-input-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none focus:border-[var(--c-accent-border)] font-mono" />
                  <button onClick={addOrModel} className="flex items-center gap-1.5 rounded-lg bg-[var(--c-accent)] px-3 py-2.5 text-sm font-medium text-white hover:opacity-90 active:scale-95 touch-manipulation"><IconPlus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          )}

          {/* ====== Theme ====== */}
          {tab === 'theme' && (
            <div className="space-y-6">
              <div>
                <label className="mb-4 block text-sm font-semibold text-[var(--c-text)]">Appearance</label>
                <div className="grid grid-cols-2 gap-3">
                  {([['dark', 'Dark', <IconMoon key="m" className="w-5 h-5" />], ['light', 'Light', <IconSun key="s" className="w-5 h-5" />]] as [ThemeMode, string, React.ReactNode][]).map(([mode, label, icon]) => (
                    <button key={mode} onClick={() => updateTheme(mode)} className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-5 text-sm font-medium transition-all active:scale-[0.97] touch-manipulation ${config.theme.mode === mode ? 'border-[var(--c-accent)] bg-[var(--c-accent-bg)] text-[var(--c-accent-t)]' : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text2)] hover:border-[var(--c-border-h)]'}`}>
                      {icon}
                      <span>{label}</span>
                      {config.theme.mode === mode && <IconCheck className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-[var(--c-border)]" />
              <div className="rounded-xl bg-[var(--c-surface)] p-4 space-y-3">
                <p className="text-xs font-medium text-[var(--c-text2)]">Color palette</p>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg" style={{ background: '#44433f' }} />
                  <div className="h-8 w-8 rounded-lg border border-[var(--c-border)]" style={{ background: '#fdf4e4' }} />
                  <div className="h-8 w-8 rounded-lg" style={{ background: '#c4a265' }} />
                  <span className="text-xs text-[var(--c-text3)] ml-2">DophyAI Warm</span>
                </div>
                <p className="text-[10px] text-[var(--c-text4)]">Palette derived from logo colors — brown, cream & gold</p>
              </div>
            </div>
          )}

          {/* ====== Prompt ====== */}
          {tab === 'prompt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--c-text)]">System Instructions</label>
                <button onClick={() => update({ systemPrompt: DEFAULT_SYSTEM_PROMPT })} className="rounded-lg border border-[var(--c-border)] px-3 py-1.5 text-xs text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation">Reset</button>
              </div>
              <textarea value={config.systemPrompt} onChange={e => update({ systemPrompt: e.target.value })} rows={16} className="w-full rounded-xl border border-[var(--c-border)] bg-[var(--c-input-bg)] p-3 sm:p-4 text-sm leading-relaxed text-[var(--c-text)] outline-none focus:border-[var(--c-accent-border)] resize-none font-mono" />
              <p className="text-xs text-[var(--c-text3)]">Sent with every request to define AI behavior.</p>
            </div>
          )}

          {/* ====== Data ====== */}
          {tab === 'data' && (
            <div className="space-y-6">
              <input ref={importFileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              {importStatus && <div className={`rounded-xl px-4 py-3 text-sm font-medium ${importStatus.includes('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>{importStatus}</div>}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><IconDownload className="w-4 h-4 text-[var(--c-accent-t)]" /> Export</h3>
                <div className="space-y-2">
                  <button onClick={() => exportData('all')} className="flex w-full items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-text2)] transition-all hover:border-[var(--c-accent-border)] hover:bg-[var(--c-accent-bg)] active:scale-[0.98] touch-manipulation">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--c-accent-bg)] shrink-0"><IconDownload className="w-4 h-4 text-[var(--c-accent-t)]" /></div>
                    <div className="text-left min-w-0"><p className="font-medium text-[var(--c-text)]">Full Backup</p><p className="text-xs text-[var(--c-text3)] truncate">{sessions.length} chats · {config.googleKeys.length} keys · {config.googleModels.length + config.openrouterModels.length} models</p></div>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => exportData('chats')} className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2.5 text-xs font-medium text-[var(--c-text3)] hover:bg-[var(--c-surface-h)] hover:text-[var(--c-text2)] active:scale-[0.98] touch-manipulation"><IconChat className="w-3.5 h-3.5" /> Chats only</button>
                    <button onClick={() => exportData('keys')} className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2.5 text-xs font-medium text-[var(--c-text3)] hover:bg-[var(--c-surface-h)] hover:text-[var(--c-text2)] active:scale-[0.98] touch-manipulation"><IconKey className="w-3.5 h-3.5" /> Config only</button>
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--c-border)]" />
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><IconUpload className="w-4 h-4 text-emerald-400" /> Import</h3>
                <button onClick={() => importFileRef.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-6 text-sm text-[var(--c-text3)] transition-all hover:border-[var(--c-accent-border)] hover:bg-[var(--c-accent-bg)] active:scale-[0.98] touch-manipulation">
                  <IconUpload className="w-5 h-5" /><div className="text-left"><p className="font-medium text-[var(--c-text2)]">Choose JSON file</p><p className="text-xs">Merges data without duplicates</p></div>
                </button>
              </div>
              <div className="border-t border-[var(--c-border)]" />
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400"><IconTrash className="w-4 h-4" /> Danger Zone</h3>
                <div className="space-y-2">
                  <button onClick={() => { if (confirm('Delete ALL chats?')) { setSessions([]); saveSessions([]); setActiveSessionId(null); saveActiveId(null); setImportStatus('All chats deleted'); setTimeout(() => setImportStatus(null), 3000); } }} className="flex w-full items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400 hover:border-red-500/30 hover:bg-red-500/10 active:scale-[0.98] touch-manipulation"><IconTrash className="w-4 h-4" />Delete all chats <span className="ml-auto text-xs opacity-60">{sessions.length}</span></button>
                  <button onClick={() => { if (confirm('Reset ALL settings?')) { const def: AppConfig = { googleKeys: [], openrouterKey: '', systemPrompt: DEFAULT_SYSTEM_PROMPT, googleModels: [...DEFAULT_GOOGLE_MODELS], openrouterModels: [...DEFAULT_OPENROUTER_MODELS], theme: { ...DEFAULT_THEME } }; setConfig(def); saveConfig(def); applyThemeToDOM(def.theme); setImportStatus('Settings reset'); setTimeout(() => setImportStatus(null), 3000); } }} className="flex w-full items-center gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-sm text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-[0.98] touch-manipulation"><IconSettings className="w-4 h-4" />Reset all settings</button>
                </div>
              </div>
            </div>
          )}

          {/* ====== Logs ====== */}
          {tab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--c-text)]">API Logs</span>
                <button onClick={clearLogs} className="rounded-lg border border-[var(--c-border)] px-3 py-1.5 text-xs text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation">Clear</button>
              </div>
              <div className="space-y-1 rounded-xl bg-[var(--c-bg2)] p-3 font-mono text-xs max-h-[calc(100vh-220px)] overflow-y-auto">
                {logs.length === 0 && <p className="text-[var(--c-text4)] py-8 text-center">No logs yet.</p>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="shrink-0 text-[var(--c-text4)]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`break-all ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-[var(--c-text2)]'}`}>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Auto Mode Button in sidebar
// =============================================================================
const AUTO_ITEMS = [
  { key: 'auto-gemini-flash', icon: IconZap, color: 'amber', bg: 'bg-amber-500/15', activeText: 'text-amber-300', iconActive: 'text-amber-400', iconInactive: 'text-[var(--c-text3)]', activeBg: 'bg-amber-500/10', activeBorder: 'border-amber-500/20' },
  { key: 'auto-gemini-pro', icon: IconCrown, color: 'violet', bg: 'bg-violet-500/15', activeText: 'text-violet-300', iconActive: 'text-violet-400', iconInactive: 'text-[var(--c-text3)]', activeBg: 'bg-violet-500/10', activeBorder: 'border-violet-500/20' },
  { key: 'auto-openrouter', icon: IconShuffle, color: 'emerald', bg: 'bg-emerald-500/15', activeText: 'text-emerald-300', iconActive: 'text-emerald-400', iconInactive: 'text-[var(--c-text3)]', activeBg: 'bg-emerald-500/10', activeBorder: 'border-emerald-500/20' },
];

// =============================================================================
// Sidebar
// =============================================================================
interface SidebarProps {
  open: boolean; onClose: () => void;
  selectedModel: string; onSelectModel: (m: string) => void;
  config: AppConfig;
  sessions: ChatSession[]; activeSessionId: string | null;
  onSelectSession: (id: string) => void; onNewChat: () => void;
  onDeleteSession: (id: string) => void; onRenameSession: (id: string, t: string) => void;
  onClearAllSessions: () => void;
}

function Sidebar({ open, onClose, selectedModel, onSelectModel, config, sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession, onRenameSession, onClearAllSessions }: SidebarProps) {
  const [autoOpen, setAutoOpen] = useState(true);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingId && editRef.current) { editRef.current.focus(); editRef.current.select(); } }, [editingId]);
  const confirmRename = () => { if (editingId && editTitle.trim()) onRenameSession(editingId, editTitle.trim()); setEditingId(null); };

  const grouped = groupSessions(sessions);

  return (
    <>
      <div className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed left-0 top-0 z-30 flex h-full w-[85vw] max-w-[300px] flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] transition-transform duration-300 ease-out lg:relative lg:w-72 lg:max-w-none lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header with logo */}
        <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 sm:px-5 py-3 sm:py-4 sidebar-safe-top">
          <DophyLogo className="w-8 h-8 shrink-0" />
          <span className="text-base font-semibold text-[var(--c-text)] tracking-tight">DophyAI</span>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] lg:hidden active:scale-95 touch-manipulation"><IconX className="w-4 h-4" /></button>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-3 pb-1">
          <button onClick={() => { onNewChat(); onClose(); }} className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--c-text2)] transition-all hover:border-[var(--c-accent-border)] hover:bg-[var(--c-accent-bg)] hover:text-[var(--c-text)] active:scale-[0.97] touch-manipulation">
            <IconPlus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 sidebar-safe-bottom">
          {/* ============ AUTOMATIC Section ============ */}
          <div className="mb-1">
            <button onClick={() => setAutoOpen(!autoOpen)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text3)] hover:text-[var(--c-text2)] touch-manipulation">
              <IconWand className="w-3.5 h-3.5" /> Automatic
              <IconChevron className={`w-3 h-3 ml-auto transition-transform duration-200 ${autoOpen ? '' : '-rotate-90'}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${autoOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="mt-1 space-y-1 pb-2">
                {AUTO_ITEMS.map(item => {
                  const Ic = item.icon;
                  const active = selectedModel === item.key;
                  const mode = AUTO_MODES[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => { onSelectModel(item.key); onClose(); }}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all touch-manipulation ${
                        active
                          ? `${item.activeBg} border ${item.activeBorder}`
                          : 'border border-transparent hover:bg-[var(--c-surface)] active:bg-[var(--c-surface-h)]'
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${active ? item.bg : 'bg-[var(--c-surface)]'}`}>
                        <Ic className={`w-3.5 h-3.5 ${active ? item.iconActive : item.iconInactive}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-medium leading-tight ${active ? item.activeText : 'text-[var(--c-text)]'}`}>{mode.label}</p>
                        <p className="text-[10px] text-[var(--c-text4)] leading-tight mt-0.5">{mode.description}</p>
                      </div>
                      {active && <div className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${item.iconActive.replace('text-', 'bg-')}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mx-2 border-t border-[var(--c-border)]" />

          {/* ============ Individual Models Section ============ */}
          <div className="mb-1 mt-1">
            <button onClick={() => setModelsOpen(!modelsOpen)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text3)] hover:text-[var(--c-text2)] touch-manipulation">
              <IconChip className="w-3.5 h-3.5" /> Models
              <IconChevron className={`w-3 h-3 ml-auto transition-transform duration-200 ${modelsOpen ? '' : '-rotate-90'}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${modelsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="mt-1 space-y-0.5 pb-1">
                {config.googleModels.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 flex items-center gap-2 px-2"><IconGoogle className="w-3 h-3 text-blue-400" /><span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-text4)]">Gemini</span></div>
                    {config.googleModels.map(m => {
                      const active = selectedModel === m;
                      return (
                        <button key={m} onClick={() => { onSelectModel(m); onClose(); }} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all touch-manipulation ${active ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent-t)]' : 'text-[var(--c-text2)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] active:bg-[var(--c-surface-h)]'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-text4)]'}`} />
                          <span className="flex-1 truncate font-medium">{m}</span>
                          {isImageCapableModel(m) && <span className="shrink-0 rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-bold text-violet-400">IMG</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {config.openrouterModels.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 px-2"><IconDeepSeek className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-text4)]">OpenRouter</span></div>
                    {config.openrouterModels.map(m => {
                      const active = selectedModel === m;
                      return (
                        <button key={m} onClick={() => { onSelectModel(m); onClose(); }} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all touch-manipulation ${active ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent-t)]' : 'text-[var(--c-text2)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] active:bg-[var(--c-surface-h)]'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-text4)]'}`} />
                          <span className="flex-1 truncate font-medium">{getModelShortName(m)}</span>
                          <span className="shrink-0 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-bold text-emerald-400">FREE</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {config.googleModels.length === 0 && config.openrouterModels.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-[var(--c-text3)]">No models. Add in Settings.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mx-2 my-1 border-t border-[var(--c-border)]" />

          {/* ============ Chats Section ============ */}
          <div className="flex items-center gap-2 px-2 py-2">
            <IconChat className="w-3.5 h-3.5 text-[var(--c-text3)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text3)]">Chats</span>
            {sessions.length > 0 && <span className="rounded-full bg-[var(--c-surface)] px-1.5 py-0.5 text-[10px] text-[var(--c-text4)]">{sessions.length}</span>}
            {sessions.length > 0 && <button onClick={onClearAllSessions} className="ml-auto rounded p-1.5 text-[var(--c-text4)] hover:bg-red-500/10 hover:text-red-400 active:scale-95 touch-manipulation" title="Clear all"><IconTrash className="w-3.5 h-3.5" /></button>}
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]"><IconChat className="w-5 h-5 text-[var(--c-text4)]" /></div>
              <p className="text-xs text-[var(--c-text3)]">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {grouped.map(g => (
                <div key={g.label}>
                  <div className="flex items-center gap-2 px-2 pt-1 pb-1.5"><IconClock className="w-2.5 h-2.5 text-[var(--c-text4)]" /><span className="text-[10px] font-medium text-[var(--c-text3)]">{g.label}</span></div>
                  <div className="space-y-0.5">
                    {g.sessions.map(s => {
                      const isActive = s.id === activeSessionId;
                      const isEditing = editingId === s.id;
                      return (
                        <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all touch-manipulation ${isActive ? 'bg-[var(--c-surface-active)] text-[var(--c-text)]' : 'text-[var(--c-text2)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] active:bg-[var(--c-surface-h)]'}`} onClick={() => { if (!isEditing) { onSelectSession(s.id); onClose(); } }}>
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-[var(--c-accent-bg)]' : 'bg-[var(--c-surface)]'}`}>
                            <IconChat className={`w-3 h-3 ${isActive ? 'text-[var(--c-accent-t)]' : 'text-[var(--c-text4)]'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input ref={editRef} value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingId(null); }} onBlur={confirmRename} className="w-full bg-transparent text-[13px] font-medium text-[var(--c-text)] outline-none border-b border-[var(--c-accent)]" onClick={e => e.stopPropagation()} />
                            ) : (
                              <p className="truncate text-[13px] font-medium leading-tight">{s.title}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-[10px] text-[var(--c-text4)]"><IconMsgCount className="w-2.5 h-2.5" />{s.messages.length}</span>
                              <span className="text-[10px] text-[var(--c-text4)]">{relTime(s.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }} className="rounded-md p-1.5 text-[var(--c-text4)] hover:bg-[var(--c-surface-h)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation" title="Rename"><IconEdit /></button>
                            <button onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }} className="rounded-md p-1.5 text-[var(--c-text4)] hover:bg-red-500/15 hover:text-red-400 active:scale-95 touch-manipulation" title="Delete"><IconTrash className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--c-border)] px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${getModelDotColor(selectedModel)}`} />
            <p className="text-[11px] text-[var(--c-text3)] font-medium truncate">{getModelShortName(selectedModel)}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// Message Bubble
// =============================================================================
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const handleCopy = () => { navigator.clipboard.writeText(message.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  return (
    <div className="group flex gap-2.5 sm:gap-3 px-3 py-2 sm:px-6 sm:py-3">
      <div className={`mt-1 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center ${isUser ? 'rounded-full bg-[var(--c-surface-active)]' : ''}`}>
        {isUser ? <IconUser className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--c-text2)]" /> : <DophyLogo className="w-6 h-6 sm:w-7 sm:h-7" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 sm:mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--c-text2)]">{isUser ? 'You' : (message.model ? getModelShortName(message.model) : 'DophyAI')}</span>
          <span className="text-[10px] text-[var(--c-text4)]">{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        {message.images && message.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.images.map((img, i) => <img key={i} src={img} alt="" className="h-20 sm:h-32 rounded-lg border border-[var(--c-border)] object-cover" />)}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--c-text)]">{message.content}</p>
        ) : (
          <div className="rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="prose-custom text-sm leading-relaxed text-[var(--c-text2)]">
              {message.isStreaming && !message.content ? (
                <div className="flex items-center gap-2 text-[var(--c-text3)] py-1">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--c-accent)]" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              ) : <MarkdownContent content={message.content} />}
            </div>
            {message.responseImages && message.responseImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.responseImages.map((img, i) => <a key={i} href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt="" className="max-h-60 sm:max-h-80 rounded-xl border border-[var(--c-border)] object-contain" /></a>)}
              </div>
            )}
          </div>
        )}
        {!isUser && message.content && !message.isStreaming && (
          <button onClick={handleCopy} className="mt-1 sm:mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--c-text4)] transition-all hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 touch-manipulation">
            {copied ? <><IconCheck className="w-3 h-3 text-emerald-400" />Copied</> : <><IconCopy className="w-3 h-3" />Copy</>}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main App
// =============================================================================
export function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(loadActiveId);
  const [selectedModel, setSelectedModel] = useState<string>(loadModel);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];
  const hasKeys = config.googleKeys.length > 0 || !!config.openrouterKey;

  const swipeHandlers = useSwipe(
    () => { if (!settingsOpen) setSidebarOpen(true); },
    () => { if (sidebarOpen) setSidebarOpen(false); }
  );

  useEffect(() => { applyThemeToDOM(config.theme); }, [config.theme]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { const t = setTimeout(() => saveSessions(sessions), 300); return () => clearTimeout(t); }, [sessions]);
  useEffect(() => { saveActiveId(activeSessionId); }, [activeSessionId]);

  useEffect(() => {
    const preventBounce = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('.overflow-y-auto, .overflow-x-auto, textarea')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventBounce, { passive: false });
    return () => document.removeEventListener('touchmove', preventBounce);
  }, []);

  const addLog = useCallback((e: LogEntry) => { setLogs(p => [...p.slice(-200), e]); }, []);
  const handleModelSelect = useCallback((m: string) => { setSelectedModel(m); saveModel(m); }, []);

  const handleNewChat = useCallback(() => {
    const s: ChatSession = { id: uid(), title: 'New Chat', messages: [], model: selectedModel, createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(p => [s, ...p]); setActiveSessionId(s.id); setAttachedImages([]);
  }, [selectedModel]);

  const handleSelectSession = useCallback((id: string) => { setActiveSessionId(id); setAttachedImages([]); }, []);
  const handleDeleteSession = useCallback((id: string) => { setSessions(p => p.filter(s => s.id !== id)); if (activeSessionId === id) setActiveSessionId(null); }, [activeSessionId]);
  const handleRenameSession = useCallback((id: string, title: string) => { setSessions(p => p.map(s => s.id === id ? { ...s, title } : s)); }, []);
  const handleClearAllSessions = useCallback(() => { if (confirm('Delete all chats?')) { setSessions([]); setActiveSessionId(null); } }, []);

  const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(f => { const r = new FileReader(); r.onload = ev => { setAttachedImages(p => [...p, ev.target?.result as string]); }; r.readAsDataURL(f); });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleStop = useCallback(() => { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } }, []);

  const handleSend = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text && attachedImages.length === 0) return;
    if (isLoading) return;

    const needsGoogle = isGoogleModel(selectedModel);
    const needsOR = !needsGoogle;

    if (needsGoogle && config.googleKeys.length === 0) {
      addLog({ timestamp: Date.now(), level: 'error', message: 'No Google API keys configured. Open Settings.' });
      setSettingsOpen(true);
      return;
    }
    if (needsOR && !config.openrouterKey) {
      addLog({ timestamp: Date.now(), level: 'error', message: 'No OpenRouter key configured. Open Settings.' });
      setSettingsOpen(true);
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      const ns: ChatSession = { id: uid(), title: 'New Chat', messages: [], model: selectedModel, createdAt: Date.now(), updatedAt: Date.now() };
      setSessions(p => [ns, ...p]); sessionId = ns.id; setActiveSessionId(sessionId);
    }

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text || 'Describe this image', images: attachedImages.length > 0 ? [...attachedImages] : undefined, timestamp: Date.now() };
    const assistMsg: ChatMessage = { id: uid(), role: 'assistant', content: '', model: selectedModel, timestamp: Date.now(), isStreaming: true };
    const sid = sessionId;

    setSessions(p => p.map(s => {
      if (s.id === sid) { const m = [...s.messages, userMsg, assistMsg]; return { ...s, messages: m, updatedAt: Date.now(), title: s.title === 'New Chat' ? generateTitle(m) : s.title }; }
      return s;
    }));

    setInput(''); setAttachedImages([]); setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const ac = new AbortController(); abortRef.current = ac;

    try {
      const cur = sessions.find(s => s.id === sid);
      const hist = [...(cur?.messages || []), userMsg].slice(-20);

      const result = await generateResponse(hist, selectedModel, config,
        (chunk) => { setSessions(p => p.map(s => { if (s.id === sid) { const m = [...s.messages]; const l = m[m.length - 1]; if (l?.role === 'assistant') m[m.length - 1] = { ...l, content: l.content + chunk }; return { ...s, messages: m }; } return s; })); },
        () => { setSessions(p => p.map(s => { if (s.id === sid) { const m = [...s.messages]; const l = m[m.length - 1]; if (l?.role === 'assistant') m[m.length - 1] = { ...l, content: '' }; return { ...s, messages: m }; } return s; })); },
        addLog, ac.signal
      );

      setSessions(p => p.map(s => { if (s.id === sid) { const m = [...s.messages]; const l = m[m.length - 1]; if (l?.role === 'assistant') m[m.length - 1] = { ...l, content: result.text || l.content, responseImages: result.images.length > 0 ? result.images : undefined, isStreaming: false }; return { ...s, messages: m, updatedAt: Date.now() }; } return s; }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (!msg.includes('abort')) addLog({ timestamp: Date.now(), level: 'error', message: msg });
      setSessions(p => p.map(s => { if (s.id === sid) { const m = [...s.messages]; const l = m[m.length - 1]; if (l?.role === 'assistant') m[m.length - 1] = { ...l, content: l.content || `Error: ${msg}`, isStreaming: false }; return { ...s, messages: m }; } return s; }));
    } finally {
      setIsLoading(false); abortRef.current = null;
    }
  }, [input, attachedImages, isLoading, activeSessionId, sessions, selectedModel, config, addLog]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);
  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }, []);

  const dotColor = getModelDotColor(selectedModel);

  return (
    <div className="flex h-[100dvh] bg-[var(--c-bg)] text-[var(--c-text)] font-[Inter,system-ui,sans-serif] overflow-hidden" {...swipeHandlers}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} selectedModel={selectedModel} onSelectModel={handleModelSelect} config={config} sessions={sessions} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} onNewChat={handleNewChat} onDeleteSession={handleDeleteSession} onRenameSession={handleRenameSession} onClearAllSessions={handleClearAllSessions} />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2 sm:gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg)] px-3 sm:px-6 py-2.5 sm:py-3 header-safe-top">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] lg:hidden active:scale-95 touch-manipulation"><IconMenu /></button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-sm font-medium text-[var(--c-text2)] truncate">{getModelShortName(selectedModel)}</span>
            {isAutoMode(selectedModel) && <span className="hidden sm:inline rounded-md bg-[var(--c-accent-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--c-accent-t)] shrink-0">AUTO</span>}
            {isImageCapableModel(selectedModel) && <span className="hidden sm:inline rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400 shrink-0">IMG</span>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handleNewChat} className="rounded-lg p-2 text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] active:scale-95 touch-manipulation" title="New chat"><IconNewChat className="w-[18px] h-[18px] sm:w-5 sm:h-5" /></button>
            <button onClick={() => setSettingsOpen(true)} className="rounded-lg p-2 text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)] active:scale-95 touch-manipulation" title="Settings"><IconSettings className="w-[18px] h-[18px] sm:w-5 sm:h-5" /></button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8">
              {!hasKeys && (
                <div className="mb-4 sm:mb-6 w-full max-w-md rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <IconWarning className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-400 mb-1">Setup Required</p>
                      <p className="text-xs text-[var(--c-text2)] mb-3">Add at least one API key to start chatting.</p>
                      <button onClick={() => setSettingsOpen(true)} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 active:scale-95 touch-manipulation">Open Settings</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-4 sm:mb-6">
                <DophyLogoBig />
              </div>
              <h1 className="mb-2 text-xl sm:text-2xl font-semibold text-[var(--c-text)]">DophyAI</h1>
              <p className="mb-6 sm:mb-8 max-w-md text-center text-xs sm:text-sm text-[var(--c-text3)]">Your AI assistant — Google Gemini & DeepSeek</p>
              <div className="mb-4 flex items-center gap-2 text-[10px] text-[var(--c-text4)] lg:hidden">
                <IconSwipe className="w-4 h-4" />
                <span>Swipe from left edge for sidebar</span>
              </div>
              <div className="grid w-full max-w-lg gap-2 grid-cols-1 sm:grid-cols-2">
                {[
                  { text: 'Explain quantum computing', icon: <IconChip className="w-4 h-4" /> },
                  { text: 'Write a Python sort algorithm', icon: <IconTerminal className="w-4 h-4" /> },
                  { text: 'Solve: $\\int x^2 dx$', icon: <IconWand className="w-4 h-4" /> },
                  { text: 'Compare React vs Vue', icon: <IconPrompt className="w-4 h-4" /> },
                ].map((ex, i) => (
                  <button key={i} onClick={() => { setInput(ex.text); inputRef.current?.focus(); }} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3.5 py-3 text-left text-sm text-[var(--c-text2)] transition-all hover:border-[var(--c-border-h)] hover:bg-[var(--c-surface-h)] hover:text-[var(--c-text)] active:scale-[0.98] touch-manipulation">
                    <span className="text-[var(--c-text3)] shrink-0">{ex.icon}</span><span className="truncate">{ex.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg)] input-safe-bottom">
          <div className="mx-auto max-w-3xl px-2 sm:px-4 py-2 sm:py-3">
            {attachedImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedImages.map((img, i) => (
                  <div key={i} className="group relative">
                    <img src={img} alt="" className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg border border-[var(--c-border)] object-cover" />
                    <button onClick={() => setAttachedImages(p => p.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white active:scale-90 touch-manipulation"><IconX className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-1.5 sm:gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-xl p-2.5 text-[var(--c-text3)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text2)] active:scale-95 touch-manipulation" title="Upload image"><IconImage className="w-5 h-5" /></button>
              <div className="relative flex-1">
                <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Message DophyAI..." rows={1} className="w-full resize-none rounded-xl border border-[var(--c-border)] bg-[var(--c-input-bg)] px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none transition-all focus:border-[var(--c-accent-border)] focus:ring-1 focus:ring-[var(--c-accent-glow)]" style={{ maxHeight: '160px' }} />
              </div>
              {isLoading ? (
                <button type="button" onClick={handleStop} className="shrink-0 rounded-xl bg-red-500/20 p-2.5 text-red-400 hover:bg-red-500/30 active:scale-95 touch-manipulation" title="Stop"><IconStop /></button>
              ) : (
                <button type="submit" disabled={!input.trim() && attachedImages.length === 0} className="shrink-0 rounded-xl bg-[var(--c-accent)] p-2.5 text-white transition-all hover:opacity-90 disabled:opacity-30 active:scale-95 touch-manipulation" title="Send"><IconSend /></button>
              )}
            </form>
            <p className="mt-1.5 text-center text-[10px] sm:text-[11px] text-[var(--c-text4)]">
              <span className="hidden sm:inline">{getModelShortName(selectedModel)} · </span>
              Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} config={config} setConfig={setConfig} logs={logs} clearLogs={() => setLogs([])} sessions={sessions} setSessions={setSessions} setActiveSessionId={setActiveSessionId} />
    </div>
  );
}
