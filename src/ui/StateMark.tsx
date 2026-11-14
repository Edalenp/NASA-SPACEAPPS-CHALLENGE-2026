import { statusLabel, stateShape, type Status } from '../engine/status';

/** Every state carries a shape and a word, never colour alone. */

export function StateMark({ status, label = true }: { status: Status; label?: boolean }) {
  return (
    <span className={`state-mark is-${status}`}>
      <span aria-hidden="true">{stateShape[status]}</span>
      {label ? statusLabel[status] : <span className="sr-only">{statusLabel[status]}</span>}
    </span>
  );
}

export function StateChip({ status }: { status: Status }) {
  return (
    <span className={`state-chip is-${status}`}>
      <span aria-hidden="true">{stateShape[status]}</span> {statusLabel[status]}
    </span>
  );
}
