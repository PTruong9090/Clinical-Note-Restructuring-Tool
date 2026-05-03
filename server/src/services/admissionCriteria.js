const DISPOSITION = {
  admit: "Admit",
  observe: "Observe",
  unknown: "Unknown"
};

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueEvidence(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.fact}|${item.source}|${item.snippet}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evidenceFromExisting(evidence, factPattern, snippetPattern = factPattern) {
  return evidence.filter((item) => factPattern.test(item.fact) || snippetPattern.test(item.snippet));
}

function evidenceFromNote(combinedNote, fact, regex) {
  const match = combinedNote.match(regex);
  if (!match) return [];

  return [
    {
      fact,
      source: "Combined",
      snippet: normalizeWhitespace(match[0]).slice(0, 260)
    }
  ];
}

function numberFromFinding(findings, labelPattern) {
  for (const finding of findings) {
    if (!labelPattern.test(finding)) continue;
    const match = finding.match(/(<=|>=|<|>)?\s*(-?\d+(?:\.\d+)?)/);
    if (!match) continue;

    return {
      comparator: match[1] || "",
      value: Number(match[2]),
      raw: finding
    };
  }

  return null;
}

function valueAtOrBelow(finding, threshold) {
  if (!finding) return false;
  return finding.value <= threshold || (finding.comparator === "<" && finding.value <= threshold);
}

function criterion({ id, label, supported, evidence }) {
  return {
    id,
    label,
    supported,
    evidence: uniqueEvidence(evidence)
  };
}

function createRationale(supportedCriteria, recommendation) {
  if (!supportedCriteria.length) {
    return "No DKA/euglycemic DKA admission criteria were clearly supported by the provided notes.";
  }

  const labels = supportedCriteria.map((item) => item.label.toLowerCase());

  if (recommendation === DISPOSITION.admit) {
    return `Inpatient admission is supported by ${labels.join(", ")}.`;
  }

  return `DKA/euglycemic DKA evidence is present, but inpatient-level treatment or monitoring criteria are incompletely documented: ${labels.join(", ")}.`;
}

export function evaluateAdmissionCriteria({ combinedNote = "", findings = [], evidence = [], suspectedConditions = [] }) {
  const conditionText = suspectedConditions.join(" ");
  const hasDkaCondition = /\b(euglycemic diabetic ketoacidosis|diabetic ketoacidosis)\b/i.test(conditionText);
  const hasDkaText = /\b(dka|diabetic ketoacidosis|euglycemic dka|ketoacidosis)\b/i.test(combinedNote);
  const pH = numberFromFinding(findings, /^pH\b/i);
  const bicarbonate = numberFromFinding(findings, /^(Bicarbonate|HCO3|CO2)\b/i);

  const criteria = [
    criterion({
      id: "dka_or_euglycemic_dka",
      label: "DKA or euglycemic DKA evidence",
      supported: hasDkaCondition || hasDkaText,
      evidence: [
        ...evidenceFromExisting(evidence, /diabetes history|SGLT2 inhibitor exposure|glucose|ketosis|acidosis/i),
        ...evidenceFromNote(combinedNote, "DKA/euglycemic DKA", /\b(?:euglycemic\s+)?(?:dka|diabetic ketoacidosis|ketoacidosis)\b/i)
      ]
    }),
    criterion({
      id: "ketones_or_acetone",
      label: "Ketones or acetone documented",
      supported: /\b(ketone|ketones|acetone|ketosis)\b/i.test(combinedNote),
      evidence: [
        ...evidenceFromExisting(evidence, /ketosis/i, /ketone|acetone|ketosis/i),
        ...evidenceFromNote(combinedNote, "ketones/acetone", /\b(?:large\s+(?:acetone|ketones?)|acetone\s+large|ketones?|ketone\s*[:=]?\s*\d+)\b/i)
      ]
    }),
    criterion({
      id: "metabolic_acidosis",
      label: "Metabolic acidosis by pH or bicarbonate/CO2 abnormality",
      supported: valueAtOrBelow(pH, 7.3) || valueAtOrBelow(bicarbonate, 18),
      evidence: evidenceFromExisting(evidence, /acidosis|low bicarbonate or CO2/i)
    }),
    criterion({
      id: "severe_bicarbonate_or_ph",
      label: "Severe pH or bicarbonate/CO2 abnormality",
      supported: valueAtOrBelow(pH, 7.2) || valueAtOrBelow(bicarbonate, 10),
      evidence: evidenceFromExisting(evidence, /acidosis|low bicarbonate or CO2/i)
    }),
    criterion({
      id: "altered_mental_status",
      label: "Altered mental status or impaired mentation",
      supported: findings.some((item) => /altered mental status|lethargic/i.test(item)),
      evidence: evidenceFromExisting(evidence, /altered mental status/i)
    }),
    criterion({
      id: "inability_to_tolerate_po",
      label: "Inability to tolerate oral intake or persistent vomiting",
      supported: findings.some((item) => /poor oral intake|vomiting|nausea/i.test(item)),
      evidence: evidenceFromExisting(evidence, /poor oral intake|vomiting|nausea/i)
    }),
    criterion({
      id: "iv_fluid_resuscitation",
      label: "Need for IV fluid resuscitation",
      supported: findings.some((item) => /IV fluids/i.test(item)),
      evidence: evidenceFromExisting(evidence, /IV fluids/i)
    }),
    criterion({
      id: "insulin_infusion",
      label: "Need for insulin infusion",
      supported: findings.some((item) => /insulin infusion/i.test(item)),
      evidence: evidenceFromExisting(evidence, /insulin infusion/i)
    }),
    criterion({
      id: "icu_or_frequent_monitoring",
      label: "ICU-level care or frequent glucose/electrolyte monitoring",
      supported: findings.some((item) => /ICU admission|frequent glucose\/lab monitoring/i.test(item)),
      evidence: evidenceFromExisting(evidence, /ICU admission|frequent glucose\/lab monitoring/i)
    }),
    criterion({
      id: "aki_or_dehydration",
      label: "AKI, dehydration, or volume depletion support",
      supported: findings.some((item) => /creatinine|vomiting|IV fluids/i.test(item)) || /dehydration|volume depletion/i.test(conditionText),
      evidence: evidenceFromExisting(evidence, /AKI\/dehydration support|vomiting|IV fluids/i)
    })
  ];

  const supportedCriteria = criteria.filter((item) => item.supported);
  const unsupportedCriteria = criteria.filter((item) => !item.supported);
  const hasDkaEvidence = criteria.find((item) => item.id === "dka_or_euglycemic_dka")?.supported;
  const hasAdmissionSupport = supportedCriteria.some((item) =>
    /metabolic_acidosis|severe_bicarbonate_or_ph|altered_mental_status|inability_to_tolerate_po|iv_fluid_resuscitation|insulin_infusion|icu_or_frequent_monitoring|aki_or_dehydration/.test(
      item.id
    )
  );

  const dispositionRecommendation = hasDkaEvidence
    ? hasAdmissionSupport
      ? DISPOSITION.admit
      : DISPOSITION.observe
    : DISPOSITION.unknown;

  return {
    guideline: "MCG ISC Diabetes admission support checklist",
    dispositionRecommendation,
    rationale: createRationale(supportedCriteria, dispositionRecommendation),
    supportedCriteria,
    unsupportedCriteria
  };
}
