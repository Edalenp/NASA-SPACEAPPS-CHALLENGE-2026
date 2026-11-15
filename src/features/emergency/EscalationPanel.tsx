import { BellRing } from 'lucide-react';
import type { ContactRole, EscalationPlan } from '../../engine/escalation';
import type { EmergencyAssessment } from './assessment';
import { contactNames } from './assessment';
import type { ContactReceipt } from './workflow';
import { formatDelay } from '../../data/mission';
import { News2Limits } from './News2Limits';

const labels = { low: 'Low risk', singleRed: 'Single red parameter', medium: 'Medium risk', high: 'High risk' } as const;

/** Pure presentation. The caller supplies the engine result and its exact deadlines. */
export function EscalationPanel({ assessment, plan, receipts = [], now, onConfirm }: {
  assessment: EmergencyAssessment;
  plan: EscalationPlan | null;
  receipts?: ContactReceipt[];
  now: number;
  onConfirm?: (role: ContactRole) => void;
}) {
  const classification = assessment.result?.classification;
  const tone = classification === 'high' || classification === 'singleRed' ? 'alert' : classification === 'medium' ? 'watch' : 'plain';
  const contacts = plan?.steps ?? [];
  return (
    <section className={`emergency-escalation is-${tone}`} aria-label="Engine escalation plan">
      <div className="emergency-assessment-line">
        <b>NEWS2 {assessment.result?.isComplete ? assessment.result.total : 'incomplete'}</b>
        <span>{classification ? labels[classification] : 'No complete classification'}</span>
        <span>{assessment.evidence.some(row => row.source === 'simulator') ? 'Includes simulated readings' : assessment.evidence.some(row => row.source === 'manual') ? 'Recorded reading snapshot' : 'No usable recorded readings'}</span>
      </div>
      <details>
        <summary>Engine follow-up: {contacts.length ? contacts.map(step => contactNames[step.contactRole]).join(' → ') : 'no scheduled contacts returned'}</summary>
        <p>These are the engine’s scheduled follow-ups. Continue emergency care and request onboard help now; do not wait for these times. Onboard times never include the Earth delay.</p>
        <p>{assessment.environment.name} · {formatDelay(assessment.environment.communicationDelayMinutes)} one way · {formatDelay(assessment.environment.communicationDelayMinutes * 2)} round trip (scenario).</p>
        {contacts.length ? <ol className="emergency-contact-list">{contacts.map((step, index) => {
          const receipt = receipts.find(item => item.assessmentId === assessment.id && item.contactRole === step.contactRole);
          return <li key={`${index}-${step.contactRole}`}>
            <div><b>{contactNames[step.contactRole]}</b><span>{step.channel === 'earth' ? 'Send by' : 'Contact aboard by'}: <time dateTime={step.dueAt}>{new Date(step.dueAt).toLocaleString('en-GB')}</time></span>
              {step.earliestReplyAt && <span>Earliest reply from Earth: <time dateTime={step.earliestReplyAt}>{new Date(step.earliestReplyAt).toLocaleString('en-GB')}</time></span>}
              <span>{receipt ? <>Notification recorded <time dateTime={receipt.confirmedAt}>{new Date(receipt.confirmedAt).toLocaleTimeString('en-GB')}</time></> : Date.parse(step.dueAt) <= now ? 'Planned time passed · no notification recorded' : 'No notification recorded'}</span>
            </div>
            {onConfirm && !receipt && <button type="button" className="emergency-secondary" onClick={() => onConfirm(step.contactRole)}><BellRing size={18} aria-hidden="true" /> Record notification: {contactNames[step.contactRole]}</button>}
          </li>;
        })}</ol> : <p>The engine has not supplied a follow-up schedule for this result. The emergency instructions still apply.</p>}
        <p>Assessment captured <time dateTime={assessment.capturedAt}>{new Date(assessment.capturedAt).toLocaleString('en-GB')}</time>. Recording a notification does not send a message.</p>
        <News2Limits />
      </details>
    </section>
  );
}

export function ReadingSnapshot({ assessment }: { assessment: EmergencyAssessment }) {
  return <dl className="emergency-readings">{assessment.evidence.map(row => <div key={row.id}>
    <dt>{row.label}</dt><dd><strong>{row.value ?? (row.source === 'invalid' ? 'Invalid reading' : 'Not recorded')} {row.value === null ? '' : row.unit}</strong>
      <span>{row.source === 'manual' && row.recordedAt ? <>Recorded <time dateTime={row.recordedAt}>{new Date(row.recordedAt).toLocaleString('en-GB')}</time></> : row.source === 'simulator' ? <>Simulated{row.recordedAt ? <> · simulation timestamp <time dateTime={row.recordedAt}>{row.recordedAt.replace('T', ' ')} UTC</time></> : ' · no simulation timestamp'}</> : 'Unavailable for evaluation'}</span>
    </dd>
  </div>)}</dl>;
}
