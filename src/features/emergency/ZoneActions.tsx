import { ArrowUpRight } from 'lucide-react';
import type { ActionTrigger, IndicatorType, ZoneEvaluation } from '../../engine';
import { indicators, type IndicatorId } from '../../data/indicators';
import { indicatorTypes } from '../../data/indicator-contract';
import { stateShape } from '../../engine/status';
import './zone-actions.css';

const idByType = Object.fromEntries(
  Object.entries(indicatorTypes).map(([id, type]) => [type, id]),
) as Partial<Record<IndicatorType, IndicatorId>>;

const triggerLabel: Record<ActionTrigger, string> = {
  news2: 'NEWS2 points',
  clinical: 'Clinical limit',
  baseline: 'Personal range',
};

/**
 * RF-18: the engine's cited actions for one body zone. Store-independent: the host passes the
 * zone evaluation. Every abnormal zone carries at least one action; a normal zone shows none.
 */
export function ZoneActions({ zone }: { zone: ZoneEvaluation }) {
  if (zone.state === 'normal' || zone.actions.length === 0) return null;
  return (
    <section className="zone-actions" aria-label="What to do now">
      <span className="micro">What to do now · {zone.actions.length} {zone.actions.length === 1 ? 'action' : 'actions'}</span>
      <ol>
        {zone.actions.map((action, index) => {
          const id = action.indicator ? idByType[action.indicator] : undefined;
          const state = action.state === 'alert' ? 'alert' : 'watch';
          return (
            <li key={`${action.indicator ?? 'zone'}-${index}`} className={`is-${state}`}>
              <span className="zone-action-mark" aria-hidden="true">{stateShape[state]}</span>
              <div>
                <span className="zone-action-for">
                  {id ? indicators[id].name : action.sourceTitle.includes('NEWS2') ? 'NEWS2 observation' : 'This system'}
                  {action.trigger && <b>{triggerLabel[action.trigger]}</b>}
                </span>
                <p>{action.text}</p>
                <a href={action.sourceUrl} target="_blank" rel="noreferrer">
                  {action.sourceTitle} <ArrowUpRight size={10} aria-hidden="true" />
                </a>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="zone-actions-scope">
        Draft for medical review: a prompt to review, not a NASA procedure or a diagnosis.
        “Onboard medical officer” stands in for the sources’ “provider”; it is not a NASA-assigned role.
      </p>
    </section>
  );
}
