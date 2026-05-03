import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { getCase, updateCase } from "../api/client.js";
import { AdmissionCriteriaList } from "../components/AdmissionCriteriaList.jsx";
import { Button } from "../components/Button.jsx";
import { EvidenceList } from "../components/EvidenceList.jsx";
import { StructuredEditor } from "../components/StructuredEditor.jsx";
import { normalizeStructuredResult } from "../utils/clinicalOutput.js";

export function CaseDetailView({ caseId, onBack }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [editedStructured, setEditedStructured] = useState(null);
  const [editedHpi, setEditedHpi] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const record = await getCase(caseId);
        setCaseRecord(record);
        setEditedStructured(normalizeStructuredResult(record.editedStructuredResult));
        setEditedHpi(record.editedRevisedHpi || "");
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [caseId]);

  async function handleSave() {
    setStatus("Saving...");
    setError("");
    try {
      const updated = await updateCase(caseId, {
        editedStructuredResult: editedStructured,
        editedRevisedHpi: editedHpi
      });
      setCaseRecord(updated);
      setStatus("Updates saved.");
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  if (error && !caseRecord) {
    return (
      <section className="rounded-md bg-white p-5 shadow-panel">
        <Button type="button" icon={ArrowLeft} variant="secondary" onClick={onBack}>
          Back
        </Button>
        <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!caseRecord || !editedStructured) {
    return <section className="rounded-md bg-white p-5 shadow-panel text-sm text-slate-500">Loading case...</section>;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button type="button" icon={ArrowLeft} variant="secondary" onClick={onBack}>
              Back
            </Button>
            <div>
              <h2 className="text-lg font-bold text-ahmc-navy">{caseRecord.title}</h2>
              <p className="text-sm text-slate-500">{caseRecord.hasUserEdits ? "Contains user edits." : "Machine-generated content only."}</p>
            </div>
          </div>
          <Button type="button" icon={Save} onClick={handleSave}>
            Save Updates
          </Button>
        </div>
        {status ? <p className="mt-3 text-sm font-medium text-ahmc-teal">{status}</p> : null}
        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white p-5 shadow-panel">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Original ER Note</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {caseRecord.erNote || "No ER note saved."}
          </pre>
        </div>
        <div className="rounded-md bg-white p-5 shadow-panel">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Original H&P Note</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {caseRecord.hpNote || "No H&P note saved."}
          </pre>
        </div>
      </section>

      <section className="rounded-md bg-white p-5 shadow-panel">
        <h3 className="mb-4 text-lg font-bold text-ahmc-navy">Editable Structured Result</h3>
        <StructuredEditor
          value={editedStructured}
          revisedHpi={editedHpi}
          onChange={setEditedStructured}
          onRevisedHpiChange={setEditedHpi}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white p-5 shadow-panel">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Admission Criteria Checklist</h3>
          <AdmissionCriteriaList admissionCriteria={editedStructured.admissionCriteria} />
        </div>
        <div className="rounded-md bg-white p-5 shadow-panel">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Machine-Generated Revised HPI</h3>
          <p className="text-sm leading-6 text-slate-700">{caseRecord.generatedRevisedHpi}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white p-5 shadow-panel">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Evidence Snippets</h3>
          <EvidenceList evidence={editedStructured.evidence} />
        </div>
      </section>
    </div>
  );
}
