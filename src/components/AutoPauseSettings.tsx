import type { AutoPauseTriggers } from '../types/match.ts';
import { useGame } from '../store/gameStore.ts';
import { engine } from '../store/engineBridge.ts';
import { notificationHint, notify, requestNotificationPermission } from '../lib/alerts.ts';
import { Toggle } from './ui/controls.tsx';

const TRIGGERS: Array<{ key: keyof AutoPauseTriggers; label: string; hint: string }> = [
  { key: 'goal', label: 'Goals', hint: 'For or against' },
  { key: 'redCard', label: 'Red cards', hint: 'Either team' },
  { key: 'injury', label: 'Injuries', hint: 'Either team' },
  { key: 'staminaBelow60', label: 'Stamina below 60%', hint: 'Your starting XI' },
  { key: 'halfTime', label: "Half-time (45')", hint: '' },
  { key: 'subWindow65', label: "Sub window (65')", hint: '' }
];

export function AutoPauseSettings({ live = false }: { live?: boolean }) {
  const settings = useGame(s => s.settings);
  const setSettings = useGame(s => s.setSettings);

  const setTrigger = (key: keyof AutoPauseTriggers, v: boolean): void => {
    const autoPause = { ...settings.autoPause, [key]: v };
    setSettings({ autoPause });
    if (live) engine.setAutoPause(autoPause);
  };

  const setNotifications = async (v: boolean): Promise<void> => {
    if (!v) { setSettings({ notifications: false }); return; }
    const ok = await requestNotificationPermission();
    setSettings({ notifications: ok });
  };

  return (
    <div>
      <div className="panel-title mb-1">Auto-pause on</div>
      <div className="divide-y divide-zinc-800/70">
        {TRIGGERS.map(t => (
          <Toggle key={t.key} label={t.label} hint={t.hint || undefined} checked={settings.autoPause[t.key]} onChange={v => setTrigger(t.key, v)} />
        ))}
      </div>
      <div className="panel-title mb-1 mt-3">Alerts</div>
      <div className="divide-y divide-zinc-800/70">
        <Toggle label="Soft chime" checked={settings.sound} onChange={v => setSettings({ sound: v })} />
        <Toggle label="Notifications" hint={notificationHint()} checked={settings.notifications} onChange={v => void setNotifications(v)} />
        {settings.notifications && (
          <>
            <Toggle label="Match pauses & full-time" hint="Goals, cards, injuries, half-time, sub window…" checked={settings.notifyMatch} onChange={v => setSettings({ notifyMatch: v })} />
            <Toggle label="Club news" hint="Simulated results, injuries & bans, decisions, season end" checked={settings.notifyClub} onChange={v => setSettings({ notifyClub: v })} />
            <Toggle label="Also while the app is open" hint="Otherwise only when PitchPulse is in the background" checked={settings.notifyWhenOpen} onChange={v => setSettings({ notifyWhenOpen: v })} />
            <div className="py-2">
              <button className="btn text-xs" onClick={() => notify({ ...settings, notifyWhenOpen: true }, 'club', 'PitchPulse', 'Notifications are working ✓', 'test')}>Send a test notification</button>
            </div>
          </>
        )}
        <Toggle label="Keep match running in background"
          hint="Phones freeze web apps you switch away from. This keeps a live match (and its alerts) going, with the score and ▶/⏸ on your lock screen"
          checked={settings.backgroundMode} onChange={v => setSettings({ backgroundMode: v })} />
      </div>
    </div>
  );
}
