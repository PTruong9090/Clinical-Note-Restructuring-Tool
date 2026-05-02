export const emptyStructuredResult = {
  chiefComplaint: "",
  hpiSummary: "",
  keyFindings: [],
  suspectedConditions: [],
  dispositionRecommendation: "Unknown",
  uncertainties: [],
  revisedHpi: "",
  evidence: []
};

export function normalizeStructuredResult(result = {}) {
  return {
    ...emptyStructuredResult,
    ...result,
    keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
    suspectedConditions: Array.isArray(result.suspectedConditions) ? result.suspectedConditions : [],
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
