/** Browser notifications + a soft two-note chime for auto-pause events. */

let audioCtx: AudioContext | null = null;

export function playChime(): void {
  try {
    audioCtx = audioCtx ?? new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const now = audioCtx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const ctx = audioCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    /* audio unavailable */
  }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** Only notifies while the tab is in the background — in the foreground the banner is enough. */
export function notify(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    const n = new Notification(title, { body, tag: 'pitchpulse', icon: './favicon.svg', silent: true });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}
