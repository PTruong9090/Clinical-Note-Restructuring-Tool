import { Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { generateClinicalNote, saveCase } from "../api/client.js";
import { AdmissionCriteriaList } from "../components/AdmissionCriteriaList.jsx";
import { Button } from "../components/Button.jsx";
import { EvidenceList } from "../components/EvidenceList.jsx";
import { Field } from "../components/Field.jsx";
import { StructuredEditor } from "../components/StructuredEditor.jsx";
import { hasEdits, normalizeStructuredResult } from "../utils/clinicalOutput.js";

export function GenerateView({ onSaved }) {
  const [erNote, setErNote] = useState("");
  const [hpNote, setHpNote] = useState("");
  const [generated, setGenerated] = useState(null);
  const [editedStructured, setEditedStructured] = useState(null);
  const [editedHpi, setEditedHpi] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const edited = useMemo(() => {
    if (!generated || !editedStructured) return false;
    return hasEdits(generated.structuredResult, editedStructured, generated.revisedHpi, editedHpi);
  }, [generated, editedStructured, editedHpi]);

  async function handleGenerate(event) {
    event.preventDefault();
    setError("");
    setStatus("Generating...");

    try {
      const result = await generateClinicalNote({ erNote, hpNote });
      const structured = normalizeStructuredResult(result.structuredResult);
      setGenerated({ ...result, structuredResult: structured });
      setEditedStructured(structured);
      setEditedHpi(result.revisedHpi || structured.revisedHpi || "");
      setStatus(result.generationMode === "llm" ? "Generated with rules + LLM." : "Generated with rules fallback.");
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  async function handleSave() {
    if (!generated || !editedStructured) return;
    setError("");
    setStatus("Saving...");

    try {
      const saved = await saveCase({
        erNote,
        hpNote,
        combinedNote: generated.combinedNote,
        generatedStructuredResult: generated.structuredResult,
        editedStructuredResult: editedStructured,
        generatedRevisedHpi: generated.revisedHpi,
        editedRevisedHpi: editedHpi
      });
      setStatus("Case saved.");
      onSaved(saved.id);
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md bg-white p-5 shadow-panel">
        <form onSubmit={handleGenerate} className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="ER Note">
              <textarea
                className="focus-ring min-h-72 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6"
                value={erNote}
                onChange={(event) => setErNote(event.target.value)}
                placeholder="Paste ER note text here..."
              />
            </Field>
            <Field label="H&P Note">
              <textarea
                className="focus-ring min-h-72 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6"
                value={hpNote}
                onChange={(event) => setHpNote(event.target.value)}
                placeholder="Paste H&P note text here..."
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" icon={Sparkles} disabled={!erNote.trim() && !hpNote.trim()}>
              Generate
            </Button>
            {status ? <span className="text-sm font-medium text-ahmc-teal">{status}</span> : null}
            {error ? <span className="text-sm font-medium text-red-700">{error}</span> : null}
          </div>
        </form>
      </section>

      {generated && editedStructured ? (
        <section className="rounded-md bg-white p-5 shadow-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ahmc-navy">Structured Result</h2>
              <p className="text-sm text-slate-500">
                {edited ? "User edits detected." : "Showing machine-generated content."}
              </p>
            </div>
            <Button type="button" icon={Save} onClick={handleSave}>
              Save Case
            </Button>
          </div>
          <StructuredEditor
            value={editedStructured}
            revisedHpi={editedHpi}
            onChange={setEditedStructured}
            onRevisedHpiChange={setEditedHpi}
          />
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Admission Criteria Checklist</h3>
            <AdmissionCriteriaList admissionCriteria={editedStructured.admissionCriteria} />
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Evidence Snippets</h3>
            <EvidenceList evidence={editedStructured.evidence} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
