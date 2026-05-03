import { z } from "zod";

export const EvidenceSchema = z.object({
  fact: z.string(),
  source: z.enum(["ER", "H&P", "Combined", "Rules"]),
  snippet: z.string()
});

export const AdmissionCriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  supported: z.boolean(),
  evidence: z.array(EvidenceSchema)
});

export const AdmissionCriteriaSchema = z.object({
  guideline: z.string(),
  dispositionRecommendation: z.enum(["Admit", "Observe", "Discharge", "Unknown"]),
  rationale: z.string(),
  supportedCriteria: z.array(AdmissionCriterionSchema),
  unsupportedCriteria: z.array(AdmissionCriterionSchema)
});

export const ClinicalOutputSchema = z.object({
  chiefComplaint: z.string(),
  hpiSummary: z.string(),
  keyFindings: z.array(z.string()),
  suspectedConditions: z.array(z.string()),
  dispositionRecommendation: z.enum(["Admit", "Observe", "Discharge", "Unknown"]),
  admissionCriteria: AdmissionCriteriaSchema,
  uncertainties: z.array(z.string()),
  revisedHpi: z.string(),
  evidence: z.array(EvidenceSchema)
});

export const emptyClinicalOutput = {
  chiefComplaint: "Unknown",
  hpiSummary: "Insufficient source information to generate a clinical summary.",
  keyFindings: [],
  suspectedConditions: [],
  dispositionRecommendation: "Unknown",
  admissionCriteria: {
    guideline: "MCG ISC Diabetes admission support checklist",
    dispositionRecommendation: "Unknown",
    rationale: "No admission criteria have been evaluated.",
    supportedCriteria: [],
    unsupportedCriteria: []
  },
  uncertainties: ["Insufficient clinical note content was provided."],
  revisedHpi: "Insufficient source information was provided to generate a revised HPI.",
  evidence: []
};
