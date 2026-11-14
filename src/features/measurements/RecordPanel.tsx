import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../../data/indicators";
import { guides } from "../../data/guides";
import { useMission } from "../../store/mission";
import { inputRules, validateReading } from "./adapter";

export function RecordPanel() {
  const recordFor = useMission((s) => s.recordFor);
  const readings = useMission((s) => s.readings);
  const record = useMission((s) => s.record);
  const open = useMission((s) => s.open);
  const busy = useMission((s) => s.busy);
  const hydrated = useMission((s) => s.hydrated);
  const storageError = useMission((s) => s.storageError);
  const [id, setId] = useState<IndicatorId>(recordFor);
  const [error, setError] = useState("");
  const ind = indicators[id];
  const rules = inputRules(id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("value");
    if (raw === null || String(raw).trim() === "") {
      setError("Enter a reading before saving.");
      return;
    }
    const value = ind.kind === "number" ? Number(raw) : (raw as ReadingValue);
    const validation = validateReading(id, value);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      await record(id, value);
      open(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save. Please retry.",
      );
    }
  }
  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="dialog-copy">
        Record what you measured. Stored on this device, with a UTC timestamp.
      </p>
      <label htmlFor="indicator" className="micro">
        Reading
      </label>
      <select
        id="indicator"
        value={id}
        disabled={busy}
        onChange={(e) => {
          setId(e.target.value as IndicatorId);
          setError("");
        }}
      >
        {(Object.keys(indicators) as IndicatorId[]).map((k) => (
          <option key={k} value={k}>
            {indicators[k].name} / {indicators[k].unit || "observation"}
          </option>
        ))}
      </select>
      <label htmlFor="value" className="micro">
        Value {ind.unit && `/ ${ind.unit}`}
      </label>
      {ind.kind === "number" ? (
        <input
          key={id}
          id="value"
          name="value"
          type="number"
          inputMode="decimal"
          step={rules?.step ?? ind.step}
          min={rules?.min ?? ind.min}
          max={rules?.max ?? ind.max}
          defaultValue={readings[id] ?? ""}
          disabled={busy}
          aria-invalid={!!error}
          aria-describedby="value-help record-error"
          autoFocus
        />
      ) : (
        <select
          key={id}
          id="value"
          name="value"
          defaultValue=""
          disabled={busy}
          aria-invalid={!!error}
          aria-describedby="value-help record-error"
        >
          <option value="" disabled>
            Choose an observation
          </option>
          {ind.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <small id="value-help">
        {ind.kind === "number"
          ? `Accepted ${rules?.min ?? ind.min}–${rules?.max ?? ind.max} ${ind.unit}. ${rules?.decimals === 0 ? "Whole numbers only." : ""}`
          : "Choose what you observe now."}
      </small>
      <p id="record-error" role="alert" className="form-error">
        {error || storageError}
      </p>
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-solid btn-lg"
          disabled={busy || !hydrated}
        >
          {busy ? "Saving…" : "Save reading"}{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        {guides[id] && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => open("guides", { guide: id })}
          >
            How to measure
          </button>
        )}
      </div>
    </form>
  );
}
