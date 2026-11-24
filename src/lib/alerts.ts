/**
 * Notifications + a soft two-note chime.
 *
 * Notifications go through the service worker (`registration.showNotification`): it is the only API Android Chrome
 * and installed iPhone web apps accept, and it lets a tap on the notification bring the app back to the front.
 */

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

/** iPhone/iPad only allow web notifications for apps added to the Home Screen. */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function notificationHint(): string {
  if (!notificationsSupported()) {
    return isIOS() && !isStandalone() ? 'On iPhone: add PitchPulse to your Home Screen first' : 'Not supported in this browser';
  }
  if (Notification.permission === 'denied') return 'Blocked — allow notifications for this site in your phone/browser settings';
  return 'Match pauses, full-time and club news';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export type AlertCategory = 'match' | 'club';

export interface AlertPrefs {
  notifications: boolean;
  notifyMatch: boolean;
  notifyClub: boolean;
  notifyWhenOpen: boolean;
}

/**
 * Show a system notification. By default only while the app is in the background (in the foreground the in-app
 * banner already says it); `notifyWhenOpen` sends them always.
 */
export function notify(prefs: AlertPrefs, category: AlertCategory, title: string, body: string, tag: string = category): void {
  if (!prefs.notifications || !notificationsSupported() || Notification.permission !== 'granted') return;
  if (category === 'match' && !prefs.notifyMatch) return;
  if (category === 'club' && !prefs.notifyClub) return;
  if (!document.hidden && !prefs.notifyWhenOpen) return;

  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body, tag: `pitchpulse-${tag}`, renotify: true, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    vibrate: [120, 60, 120], data: { url: './' }
  };
  const fallback = (): void => {
    try {
      const n = new Notification(title, options);
      n.onclick = () => { window.focus(); n.close(); };
    } catch {
      /* some mobile browsers only allow notifications from a service worker */
    }
  };
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(fallback);
  } else {
    fallback();
  }
}
