import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteCase, listCases } from "../api/client.js";
import { Button } from "../components/Button.jsx";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function SavedCasesView({ onOpen }) {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCases() {
    setLoading(true);
    setError("");
    try {
      setCases(await listCases());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setError("");
    try {
      await deleteCase(item.id);
      setCases((currentCases) => currentCases.filter((caseItem) => caseItem.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="rounded-md bg-white p-5 shadow-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ahmc-navy">Saved Cases</h2>
          <p className="text-sm text-slate-500">Open a saved case to review original and edited content.</p>
        </div>
        <Button type="button" icon={RefreshCw} variant="secondary" onClick={loadCases} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error ? <p className="mb-4 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="grid gap-3">
        {cases.map((item) => {
          const structured = item.editedStructuredResult || item.generatedStructuredResult || {};
          const condition = structured.suspectedConditions?.[0] || "Unknown condition";
          return (
            <article
              key={item.id}
              className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 transition hover:border-ahmc-teal hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <FileText className="mt-1 h-5 w-5 text-ahmc-teal" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-ahmc-navy">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{condition}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ahmc-mist px-3 py-1 text-xs font-bold text-ahmc-navy">
                    {structured.dispositionRecommendation || "Unknown"}
                  </span>
                  {item.hasUserEdits ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Edited
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => onOpen(item.id)}>
                  Open
                </Button>
                <button
                  type="button"
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-red-700 transition hover:bg-red-50"
                  onClick={() => handleDelete(item)}
                  aria-label={`Delete ${item.title}`}
                  title="Delete case"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">Updated {formatDate(item.updatedAt)}</p>
            </article>
          );
        })}
        {!cases.length && !loading ? <p className="text-sm text-slate-500">No saved cases yet.</p> : null}
      </div>
    </section>
  );
}
