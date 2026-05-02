import { z } from "zod";

export const EvidenceSchema = z.object({
  fact: z.string(),
  source: z.enum(["ER", "H&P", "Combined", "Rules"]),
  snippet: z.string()
});

export const ClinicalOutputSchema = z.object({
  chiefComplaint: z.string(),
  hpiSummary: z.string(),
  keyFindings: z.array(z.string()),
  suspectedConditions: z.array(z.string()),
  dispositionRecommendation: z.enum(["Admit", "Observe", "Discharge", "Unknown"]),
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
  uncertainties: ["Insufficient clinical note content was provided."],
  revisedHpi: "Insufficient source information was provided to generate a revised HPI.",
  evidence: []
};
