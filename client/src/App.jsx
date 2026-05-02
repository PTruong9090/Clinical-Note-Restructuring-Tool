import { ClipboardPlus, Database } from "lucide-react";
import { useState } from "react";
import { Button } from "./components/Button.jsx";
import { CaseDetailView } from "./views/CaseDetailView.jsx";
import { GenerateView } from "./views/GenerateView.jsx";
import { SavedCasesView } from "./views/SavedCasesView.jsx";

export default function App() {
  const [view, setView] = useState("generate");
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  function openCase(id) {
    setSelectedCaseId(id);
    setView("detail");
  }

  return (
    <div className="min-h-screen bg-ahmc-mist">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ahmc-teal">AHMC Clinical Documentation</p>
            <h1 className="text-xl font-bold text-ahmc-navy">Clinical Note Restructuring Tool</h1>
          </div>
          <nav className="flex gap-2">
            <Button
              type="button"
              icon={ClipboardPlus}
              variant={view === "generate" ? "primary" : "secondary"}
              onClick={() => setView("generate")}
            >
              Generate
            </Button>
            <Button
              type="button"
              icon={Database}
              variant={view === "saved" ? "primary" : "secondary"}
              onClick={() => setView("saved")}
            >
              Saved Cases
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {view === "generate" ? <GenerateView onSaved={openCase} /> : null}
        {view === "saved" ? <SavedCasesView onOpen={openCase} /> : null}
        {view === "detail" ? <CaseDetailView caseId={selectedCaseId} onBack={() => setView("saved")} /> : null}
      </main>
    </div>
  );
}
