import { fromMultiline, toMultiline } from "../utils/clinicalOutput.js";
import { Field } from "./Field.jsx";

const dispositions = ["Admit", "Observe", "Discharge", "Unknown"];

export function StructuredEditor({ value, revisedHpi, onChange, onRevisedHpiChange }) {
  function updateField(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Chief Complaint">
          <input
            className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={value.chiefComplaint}
            onChange={(event) => updateField("chiefComplaint", event.target.value)}
          />
        </Field>
        <Field label="Disposition Recommendation">
          <select
            className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={value.dispositionRecommendation}
            onChange={(event) => updateField("dispositionRecommendation", event.target.value)}
          >
            {dispositions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="HPI Summary">
        <textarea
          className="focus-ring min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
          value={value.hpiSummary}
          onChange={(event) => updateField("hpiSummary", event.target.value)}
        />
      </Field>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Key Findings" helper="One finding per line.">
          <textarea
            className="focus-ring min-h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
            value={toMultiline(value.keyFindings)}
            onChange={(event) => updateField("keyFindings", fromMultiline(event.target.value))}
          />
        </Field>
        <Field label="Suspected Conditions" helper="One condition per line.">
          <textarea
            className="focus-ring min-h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
            value={toMultiline(value.suspectedConditions)}
            onChange={(event) => updateField("suspectedConditions", fromMultiline(event.target.value))}
          />
        </Field>
        <Field label="Uncertainties / Missing Information" helper="One uncertainty per line.">
          <textarea
            className="focus-ring min-h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
            value={toMultiline(value.uncertainties)}
            onChange={(event) => updateField("uncertainties", fromMultiline(event.target.value))}
          />
        </Field>
      </div>

      <Field label="Revised HPI">
        <textarea
          className="focus-ring min-h-48 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
          value={revisedHpi}
          onChange={(event) => onRevisedHpiChange(event.target.value)}
        />
      </Field>
    </div>
  );
}
