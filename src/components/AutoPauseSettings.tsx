import type { AutoPauseTriggers } from '../types/match.ts';
import { useGame } from '../store/gameStore.ts';
import { engine } from '../store/engineBridge.ts';
import { notificationsSupported, requestNotificationPermission } from '../lib/alerts.ts';
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
        <Toggle
          label="Browser notifications"
          hint={notificationsSupported() ? 'Only while the tab is in the background' : 'Not supported in this browser'}
          checked={settings.notifications}
          onChange={v => void setNotifications(v)}
        />
      </div>
    </div>
  );
}
