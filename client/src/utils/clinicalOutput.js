export const emptyStructuredResult = {
  chiefComplaint: "",
  hpiSummary: "",
  keyFindings: [],
  suspectedConditions: [],
  dispositionRecommendation: "Unknown",
  admissionCriteria: {
    guideline: "",
    dispositionRecommendation: "Unknown",
    rationale: "",
    supportedCriteria: [],
    unsupportedCriteria: []
  },
  uncertainties: [],
  revisedHpi: "",
  evidence: []
};

export function normalizeStructuredResult(result = {}) {
  const admissionCriteria = result.admissionCriteria || emptyStructuredResult.admissionCriteria;

  return {
    ...emptyStructuredResult,
    ...result,
    keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
    suspectedConditions: Array.isArray(result.suspectedConditions) ? result.suspectedConditions : [],
    admissionCriteria: {
      ...emptyStructuredResult.admissionCriteria,
      ...admissionCriteria,
      supportedCriteria: Array.isArray(admissionCriteria.supportedCriteria) ? admissionCriteria.supportedCriteria : [],
      unsupportedCriteria: Array.isArray(admissionCriteria.unsupportedCriteria) ? admissionCriteria.unsupportedCriteria : []
    },
    uncertainties: Array.isArray(result.uncertainties) ? result.uncertainties : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : []
  };
}

export function toMultiline(list = []) {
  return list.join("\n");
}

export function fromMultiline(value = "") {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasEdits(generated, edited, generatedHpi, editedHpi) {
  return JSON.stringify(generated) !== JSON.stringify(edited) || generatedHpi !== editedHpi;
}
