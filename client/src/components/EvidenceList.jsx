export function EvidenceList({ evidence = [] }) {
  if (!evidence.length) {
    return <p className="text-sm text-slate-500">No evidence snippets were returned.</p>;
  }

  return (
    <div className="grid gap-3">
      {evidence.map((item, index) => (
        <div key={`${item.fact}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ahmc-navy">{item.fact}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ahmc-teal">
              {item.source}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.snippet}</p>
        </div>
      ))}
    </div>
  );
}
