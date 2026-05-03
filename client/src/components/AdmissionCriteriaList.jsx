function CriteriaGroup({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <div className="grid gap-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ahmc-navy">{item.label}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ahmc-teal">
                {item.supported ? "Supported" : "Not found"}
              </span>
            </div>
            {item.evidence?.length ? (
              <ul className="mt-2 grid gap-1">
                {item.evidence.map((evidence, index) => (
                  <li key={`${item.id}-${index}`} className="text-sm leading-6 text-slate-600">
                    <span className="font-semibold">{evidence.source}:</span> {evidence.snippet}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdmissionCriteriaList({ admissionCriteria }) {
  if (!admissionCriteria) {
    return <p className="text-sm text-slate-500">No admission criteria checklist was returned.</p>;
  }

  const supported = admissionCriteria.supportedCriteria || [];
  const unsupported = admissionCriteria.unsupportedCriteria || [];

  if (!supported.length && !unsupported.length) {
    return <p className="text-sm text-slate-500">No admission criteria checklist was returned.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ahmc-navy">{admissionCriteria.guideline}</p>
          {admissionCriteria.rationale ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">{admissionCriteria.rationale}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-ahmc-teal/10 px-3 py-1 text-xs font-bold text-ahmc-teal">
          {admissionCriteria.dispositionRecommendation || "Unknown"}
        </span>
      </div>
      <CriteriaGroup title="Supported Criteria" items={supported} />
      <CriteriaGroup title="Criteria Not Found" items={unsupported} />
    </div>
  );
}
