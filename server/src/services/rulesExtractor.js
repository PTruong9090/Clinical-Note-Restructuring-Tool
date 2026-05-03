import { evaluateAdmissionCriteria } from "./admissionCriteria.js";

const DKA_TERMS = /\b(dka|diabetic ketoacidosis|ketoacidosis|acetone|ketone|ketosis)\b/i;

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function findFirst(text, regex) {
  const match = text.match(regex);
  return match ? normalizeWhitespace(match[1] || match[0]) : "";
}

function pushUnique(list, value) {
  const clean = normalizeWhitespace(value);
  if (clean && !list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

function addEvidence(evidence, fact, source, snippet) {
  const cleanSnippet = normalizeWhitespace(snippet).slice(0, 260);
  if (!cleanSnippet) return;
  evidence.push({ fact, source, snippet: cleanSnippet });
}

function extractNumberNear(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `\\b${escaped}\\b\\s*(?:(less than|greater than|under|over|of|value|is|was|:|=|<|>)\\s*)?<?\\s*(-?\\d+(?:\\.\\d+)?)`,
      "i"
    );
    const match = text.match(regex);
    if (match) {
      const comparator = match[1] || "";
      return {
        label,
        comparator,
        value: Number(match[2]),
        raw: normalizeWhitespace(match[0])
      };
    }
  }
  return null;
}

function formatNumberFinding(displayLabel, finding) {
  const comparator = finding.comparator.toLowerCase();
  const value =
    comparator === "less than" || comparator === "under" || comparator === "<"
      ? `<${finding.value}`
      : comparator === "greater than" || comparator === "over" || comparator === ">"
        ? `>${finding.value}`
        : `${finding.value}`;

  return `${displayLabel} ${value}`;
}

function extractRangeFindings(text, source, findings, evidence) {
  const glucose = extractNumberNear(text, ["poc glucose", "serum glucose", "glucose", "glu"]);
  if (glucose) {
    pushUnique(findings, formatNumberFinding("Glucose", glucose));
    addEvidence(evidence, "glucose", source, glucose.raw);
  }

  const ph = extractNumberNear(text, ["potential of hydrogen", "V pH", "ApH", "pH"]);
  if (ph) {
    pushUnique(findings, formatNumberFinding("pH", ph));
    addEvidence(evidence, "acidosis", source, ph.raw);
  }

  const bicarb = extractNumberNear(text, ["bicarbonate", "bicarb", "AHCO3", "V HCO3", "CO2"]);
  if (bicarb) {
    const label = /co2/i.test(bicarb.label)
      ? "CO2"
      : /hco3/i.test(bicarb.label)
        ? "HCO3"
        : "Bicarbonate";
    pushUnique(findings, formatNumberFinding(label, bicarb));
    addEvidence(evidence, "low bicarbonate or CO2", source, bicarb.raw);
  }

  const creatinine = extractNumberNear(text, ["creatinine", "creatinine."]);
  if (creatinine && creatinine.value >= 1.3) {
    pushUnique(findings, `Creatinine ${creatinine.value}, concerning for AKI in context`);
    addEvidence(evidence, "AKI/dehydration support", source, creatinine.raw);
  }

  const sodium = extractNumberNear(text, ["sodium"]);
  if (sodium && sodium.value < 135) {
    pushUnique(findings, `Sodium ${sodium.value}`);
    addEvidence(evidence, "hyponatremia or pseudohyponatremia", source, sodium.raw);
  }
}

function extractSymptoms(text, findings, evidence, source) {
  const symptomPatterns = [
    ["nausea", /\bnausea\b/i],
    ["vomiting", /\bvomiting|emesis\b/i],
    ["altered mental status", /\bams|altered mental status|not alert|lethargic|mentation\b/i],
    ["weakness", /\bweakness|weak\b/i],
    ["tachypnea or Kussmaul breathing", /\btachypneic|kussmaul|difficulty taking deep breaths\b/i],
    ["tachycardia", /\btachycardia|tachycardic|HR:\s*10[0-9]|heart rate\s*10[0-9]\b/i],
    ["poor oral intake", /\bunable to tolerate|oral intake|p\.?o\.? intake\b/i]
  ];

  for (const [label, regex] of symptomPatterns) {
    const match = text.match(regex);
    if (match) {
      pushUnique(findings, label);
      addEvidence(evidence, label, source, match[0]);
    }
  }
}

function extractTreatments(text, findings, evidence, source) {
  const treatmentPatterns = [
    ["insulin infusion", /\binsulin (drip|gtt|infusion)|started on insulin/i],
    ["IV fluids", /\bnormal saline|NS\b|LR bolus|IV fluids?|fluid resuscitation|\d+\s*L\s*(LR|normal saline|NS)/i],
    ["bicarbonate therapy", /\b(given|received|administered).{0,30}(bicarb|bicarbonate)|(bicarb|bicarbonate).{0,30}(given|administered)/i],
    ["empiric antibiotics", /\bceftriaxone|rocephin|antibiotics?\b/i],
    ["frequent glucose/lab monitoring", /\bfingerstick q1h|BMP q4h|serial laboratory|electrolyte monitoring/i],
    ["ICU admission", /\bICU|CVU|critical care\b/i],
    ["admission requested or planned", /\badmission requested|admitted|admit(?:ted)?\b/i]
  ];

  for (const [label, regex] of treatmentPatterns) {
    const match = text.match(regex);
    if (match) {
      pushUnique(findings, label);
      addEvidence(evidence, label, source, match[0]);
    }
  }
}

function extractUncertainties(combined) {
  const uncertainties = [];
  if (/\bfurther history limited|unknown|limited by mentation|unable to complete\b/i.test(combined)) {
    pushUnique(uncertainties, "History, social history, medication details, or ROS may be limited or unknown in the source note.");
  }
  if (!/\ballerg/i.test(combined)) {
    pushUnique(uncertainties, "Allergy information is not clearly documented.");
  }
  if (!/\bpast medical history|pmh|medical problems|history of|diagnosed diabetes|diabetes|htn|hypertension/i.test(combined)) {
    pushUnique(uncertainties, "Past medical history is not clearly documented.");
  }
  return uncertainties;
}

function inferConditions(combined) {
  const conditions = [];
  if (/\beuglycemic dka\b|euglycemic diabetic ketoacidosis/i.test(combined)) {
    pushUnique(conditions, "Euglycemic diabetic ketoacidosis");
  } else if (DKA_TERMS.test(combined)) {
    pushUnique(conditions, "Diabetic ketoacidosis");
  }
  if (/\baki|acute kidney injury|creatinine\s*[:=]?\s*1\.[3-9]/i.test(combined)) {
    pushUnique(conditions, "Acute kidney injury");
  }
  if (/\bdehydration|volume depletion|vomiting/i.test(combined)) {
    pushUnique(conditions, "Dehydration or volume depletion");
  }
  if (/\bgastroenteritis/i.test(combined)) {
    pushUnique(conditions, "Possible gastroenteritis");
  }
  return conditions.length ? conditions : ["Unknown"];
}

function createFallbackRevisedHpi({ demographics, findings, conditions, disposition, evidence }) {
  const patient = demographics || "The patient";
  const primaryCondition = conditions[0] && conditions[0] !== "Unknown" ? conditions[0] : "a suspected acute metabolic condition";
  const symptomText = findings
    .filter((item) => /nausea|vomiting|altered mental status|weakness|tachy|breathing|oral intake/i.test(item))
    .slice(0, 5)
    .join(", ");
  const objectiveText = findings
    .filter((item) => /glucose|pH|CO2|HCO3|bicarb|bicarbonate|acetone|ketone|creatinine|sodium/i.test(item))
    .slice(0, 7)
    .join(", ");
  const treatmentText = findings
    .filter((item) => /insulin|fluids|bicarbonate therapy|antibiotics|monitoring|ICU|admission/i.test(item))
    .slice(0, 6)
    .join(", ");

  const sentences = [
    `${patient} presented for evaluation with ${symptomText || "symptoms documented in the source notes"}.`,
    `The available documentation supported ${primaryCondition}${objectiveText ? ` with objective findings including ${objectiveText}` : ""}.`,
    treatmentText
      ? `Emergency and admitting clinicians escalated care with ${treatmentText}.`
      : "The source note did not clearly document emergency treatment escalation.",
    disposition === "Admit"
      ? "Taken together, the documented metabolic derangement, need for ongoing treatment and monitoring, and ICU or inpatient-level care indicators supported inpatient admission rather than discharge or short observation."
      : "The available documentation did not contain enough admission-supporting detail to make a definitive disposition recommendation."
  ];

  if (!evidence.length) {
    sentences.unshift("This machine-generated HPI is limited because few source facts were extractable.");
  }

  return sentences.join(" ");
}

export function combineNotes({ erNote = "", hpNote = "" }) {
  return [`[ER NOTE]\n${erNote.trim()}`, `[H&P NOTE]\n${hpNote.trim()}`]
    .filter((section) => section.replace(/\[[^\]]+\]/, "").trim())
    .join("\n\n");
}

export function extractClinicalFacts({ erNote = "", hpNote = "" }) {
  const combined = combineNotes({ erNote, hpNote });
  const evidence = [];
  const findings = [];

  const chiefComplaint =
    findFirst(combined, /chief complaint\s*:?\s*([^\n]+)/i) ||
    findFirst(combined, /CHIEF COMPLAINT\s*:?\s*([^\n]+)/i) ||
    "Unknown";

  const demographics =
    findFirst(combined, /\b(\d{1,3}\s*(?:-year-old|year old)?\s*(?:male|female|man|woman|yof|yom))\b/i) ||
    findFirst(combined, /\b(\d{1,3}[MF])\b/i);

  extractSymptoms(erNote, findings, evidence, "ER");
  extractSymptoms(hpNote, findings, evidence, "H&P");
  extractRangeFindings(erNote, "ER", findings, evidence);
  extractRangeFindings(hpNote, "H&P", findings, evidence);
  extractTreatments(erNote, findings, evidence, "ER");
  extractTreatments(hpNote, findings, evidence, "H&P");

  if (/\bjardiance\b/i.test(combined)) {
    pushUnique(findings, "recent Jardiance use");
    addEvidence(evidence, "SGLT2 inhibitor exposure", "Combined", combined.match(/.{0,80}\bJardiance\b.{0,80}/i)?.[0] || "Jardiance");
  }

  if (/\brecently diagnosed diabetes|new onset diabetes|newly diagnosed diabetes/i.test(combined)) {
    pushUnique(findings, "recently diagnosed diabetes");
    addEvidence(evidence, "diabetes history", "Combined", combined.match(/.{0,80}\b(?:recently diagnosed diabetes|new onset diabetes|newly diagnosed diabetes)\b.{0,80}/i)?.[0] || "recently diagnosed diabetes");
  }

  if (/\blarge\s+(?:acetone|ketones?)|acetone\s+large|ketone\s*[:=]?\s*60/i.test(combined)) {
    pushUnique(findings, "large serum or urine ketones/acetone");
    addEvidence(evidence, "ketosis", "Combined", combined.match(/\blarge\s+(?:acetone|ketones?)|acetone\s+large|ketone\s*[:=]?\s*60/i)?.[0] || "ketones/acetone documented");
  }

  const conditions = inferConditions(combined);
  const uncertainties = extractUncertainties(combined);
  const admissionCriteria = evaluateAdmissionCriteria({
    combinedNote: combined,
    findings,
    evidence,
    suspectedConditions: conditions
  });
  const dispositionRecommendation = admissionCriteria.dispositionRecommendation;

  const hpiSummary = demographics
    ? `${demographics} with ${conditions.join(", ")} based on source documentation.`
    : `${conditions.join(", ")} based on source documentation.`;

  const structured = {
    chiefComplaint,
    hpiSummary,
    keyFindings: findings,
    suspectedConditions: conditions,
    dispositionRecommendation,
    admissionCriteria,
    uncertainties,
    revisedHpi: createFallbackRevisedHpi({
      demographics,
      findings,
      conditions,
      disposition: dispositionRecommendation,
      evidence
    }),
    evidence
  };

  return {
    combinedNote: combined,
    demographics,
    structured
  };
}
