/**
 * Background mode for phones.
 *
 * Mobile browsers freeze a web app (and its Web Workers) soon after you switch away or lock the screen, so a live match
 * would stop and its pause notifications would never fire. A page that is playing audio is allowed to keep running,
 * so while a match is live we loop an extremely quiet noise track (about −58 dB, below what a phone speaker makes
 * audible) and register a Media Session: the score shows on the lock screen / notification shade with play-pause
 * buttons that control the match. (The ▶/⏸ state mirrors the match; the track itself never stops.) Everything stops at full-time or when the match is abandoned.
 */
import type { EngineTick } from '../types/match.ts';
import { clockText } from './format.ts';

let audio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;
let lastKey = '';
let handlers: { play: () => void; pause: () => void } | null = null;

function quietLoop(): string {
  const rate = 8000, seconds = 3, n = rate * seconds;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string): void => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  let seed = 12345;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    v.setInt16(44 + i * 2, Math.round(((seed / 0x7fffffff) * 2 - 1) * 40), true); // ±40 of 32767 ≈ −58 dBFS
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export const backgroundMode = {
  get active(): boolean { return !!audio; },

  /** Call from (or right after) a tap — browsers only start audio after a user gesture. */
  start(controls: { play: () => void; pause: () => void }): void {
    handlers = controls;
    if (!audio) {
      audioUrl = audioUrl ?? quietLoop();
      audio = new Audio(audioUrl);
      audio.loop = true;
      audio.setAttribute('playsinline', '');
    }
    void audio.play().catch(() => { /* blocked without a gesture — the match still runs while the app is open */ });
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler('play', () => handlers?.play());
      ms.setActionHandler('pause', () => handlers?.pause());
      try { ms.setActionHandler('stop', null); } catch { /* unsupported action */ }
      ms.playbackState = 'playing';
    }
    lastKey = '';
  },

  /** Keep the lock-screen scoreboard current (only touches it when the score, minute or status changes). */
  update(v: EngineTick): void {
    if (!audio || !('mediaSession' in navigator)) return;
    const status = v.status === 'PAUSED' ? 'Paused' : v.status === 'FINISHED' ? 'Full-time' : 'Live';
    const key = `${v.home.score}-${v.away.score}-${v.minute}-${status}`;
    if (key === lastKey) return;
    lastKey = key;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${v.home.shortName} ${v.home.score}–${v.away.score} ${v.away.shortName}`,
      artist: `${clockText(v)} · ${status}`,
      album: 'PitchPulse',
      artwork: [{ src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
    });
    // The quiet track keeps playing either way; the shown state mirrors the match so ▶ / ⏸ do the right thing
    navigator.mediaSession.playbackState = v.status === 'RUNNING' ? 'playing' : 'paused';
  },

  stop(): void {
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
    handlers = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      for (const a of ['play', 'pause'] as const) { try { navigator.mediaSession.setActionHandler(a, null); } catch { /* ignore */ } }
    }
  }
};
