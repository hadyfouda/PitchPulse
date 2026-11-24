import type { Tactics } from '../types/tactics.ts';
import { ATTACK_FOCUS, BUILD_UPS, DEF_LINES, FORMATIONS, MENTALITIES, PRESSING } from '../types/tactics.ts';
import { BUILDUP_LABEL, DEFLINE_LABEL, FOCUS_LABEL, MENTALITY_LABEL, PRESSING_LABEL } from '../lib/labels.ts';
import { Field, Segmented } from './ui/controls.tsx';

const MENT_SHORT: Record<string, string> = { VERY_DEFENSIVE: 'V.Def', DEFENSIVE: 'Def', BALANCED: 'Bal', ATTACKING: 'Att', ALL_OUT: 'All-Out' };
const BUILD_SHORT: Record<string, string> = { SHORT: 'Short', BALANCED: 'Balanced', DIRECT: 'Direct', COUNTER: 'Counter' };

/**
 * Edits tactics. In live mode `pending` holds queued-but-not-yet-applied values,
 * which render in amber until the engine applies them on the next tick.
 */
export function TacticsEditor({ tactics, pending = {}, onChange }: {
  tactics: Tactics;
  pending?: Partial<Tactics>;
  onChange: (patch: Partial<Tactics>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Formation">
        <Segmented size="sm" value={tactics.formation} pendingValue={pending.formation}
          options={FORMATIONS.map(f => ({ value: f, label: f }))} onChange={formation => onChange({ formation })} />
      </Field>
      <Field label="Pressing">
        <Segmented size="sm" value={tactics.pressing} pendingValue={pending.pressing}
          options={PRESSING.map(p => ({ value: p, label: PRESSING_LABEL[p] }))} onChange={pressing => onChange({ pressing })} />
      </Field>
      <Field label="Defensive line">
        <Segmented size="sm" value={tactics.defLine} pendingValue={pending.defLine}
          options={DEF_LINES.map(p => ({ value: p, label: DEFLINE_LABEL[p] }))} onChange={defLine => onChange({ defLine })} />
      </Field>
      <Field label="Build-up">
        <Segmented size="sm" value={tactics.buildUp} pendingValue={pending.buildUp}
          options={BUILD_UPS.map(p => ({ value: p, label: BUILD_SHORT[p] ?? p, title: BUILDUP_LABEL[p] }))} onChange={buildUp => onChange({ buildUp })} />
      </Field>
      <Field label="Attack focus">
        <Segmented size="sm" value={tactics.focus} pendingValue={pending.focus}
          options={ATTACK_FOCUS.map(p => ({ value: p, label: FOCUS_LABEL[p] }))} onChange={focus => onChange({ focus })} />
      </Field>
      <Field label="Mentality">
        <Segmented size="sm" value={tactics.mentality} pendingValue={pending.mentality}
          options={MENTALITIES.map(p => ({ value: p, label: MENT_SHORT[p] ?? p, title: MENTALITY_LABEL[p] }))} onChange={mentality => onChange({ mentality })} />
      </Field>
    </div>
  );
}
