import { describe, expect, it } from "vitest";
import { extractClinicalFacts } from "./rulesExtractor.js";

describe("extractClinicalFacts", () => {
  it("extracts Case A euglycemic DKA admission support", () => {
    const erNote = "Chief Complaint: Diabetes issue. 47-year-old male on Jardiance metformin with nausea and vomiting. Kussmaul breathing. ApH 7.200. AHCO3 7.4. CO2 <7. KETONE: 60. POC GLUCOSE 98. Started on insulin drip. Critical care time is 35 minutes.";
    const hpNote = "47M recently diagnosed diabetes. In the ED noted to be in euglycemic DKA, bicarb less than 7, pH 7.2, glucose 93. ICU admission, BMP q4h, fingerstick q1h while on insulin.";

    const result = extractClinicalFacts({ erNote, hpNote }).structured;

    expect(result.chiefComplaint).toMatch(/Diabetes issue/i);
    expect(result.suspectedConditions).toContain("Euglycemic diabetic ketoacidosis");
    expect(result.dispositionRecommendation).toBe("Admit");
    expect(result.keyFindings.join(" ")).toMatch(/insulin infusion|ICU admission/i);
    expect(result.admissionCriteria.dispositionRecommendation).toBe("Admit");
    expect(result.admissionCriteria.supportedCriteria.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "dka_or_euglycemic_dka",
        "ketones_or_acetone",
        "metabolic_acidosis",
        "insulin_infusion",
        "icu_or_frequent_monitoring"
      ])
    );
  });

  it("extracts Case B severe DKA admission support", () => {
    const erNote = "34 yof hx of T1DM here with AMS in the setting of elevated blood glucose. Acetone large. CO2 7. GLU 793. Creatinine 1.6. Insulin drip. Admit to ICU/CVU. Critical care totaled 120 minutes.";
    const hpNote = "34F PMH IDDM presented via EMS from home for altered mental status. 3 days nausea and vomiting, weakness. serum glucose of 800, large acetone, ABG with pH of 7.28, bicarb 7, sodium of 129, creatinine of 1.6. Patient admitted for DKA.";

    const result = extractClinicalFacts({ erNote, hpNote }).structured;

    expect(result.suspectedConditions).toContain("Diabetic ketoacidosis");
    expect(result.dispositionRecommendation).toBe("Admit");
    expect(result.keyFindings.join(" ")).toMatch(/altered mental status/i);
    expect(result.keyFindings.join(" ")).toMatch(/large serum or urine ketones/i);
    expect(result.admissionCriteria.supportedCriteria.map((item) => item.id)).toEqual(
      expect.arrayContaining(["altered_mental_status", "severe_bicarbonate_or_ph", "insulin_infusion"])
    );
  });

  it("handles H&P-only Case A phrasing in the free rules fallback", () => {
    const hpNote =
      "A 47-year-old man with recently diagnosed diabetes started metformin and Jardiance on Friday morning and became increasingly restless and unable to sleep over the day. Yesterday morning he was unable to tolerate oral intake and had one episode of vomiting. This morning he had several episodes of vomiting with ongoing nausea and came to the emergency department for evaluation. In the emergency department he was noted to have euglycemic diabetic ketoacidosis with bicarbonate less than 7, potential of hydrogen value 7.2, and glucose 93, and admission was requested for euglycemic diabetic ketoacidosis likely in the setting of new Jardiance use.";

    const result = extractClinicalFacts({ erNote: "", hpNote }).structured;

    expect(result.suspectedConditions).toContain("Euglycemic diabetic ketoacidosis");
    expect(result.dispositionRecommendation).toBe("Admit");
    expect(result.keyFindings).toContain("Bicarbonate <7");
    expect(result.keyFindings).toContain("pH 7.2");
    expect(result.keyFindings).toContain("Glucose 93");
    expect(result.keyFindings).toContain("recent Jardiance use");
    expect(result.uncertainties.join(" ")).not.toMatch(/Past medical history is not clearly documented/i);
    expect(result.revisedHpi).toMatch(/inpatient admission/i);
    expect(result.admissionCriteria.rationale).toMatch(/inpatient admission is supported/i);
    expect(result.admissionCriteria.supportedCriteria.map((item) => item.id)).toEqual(
      expect.arrayContaining(["dka_or_euglycemic_dka", "inability_to_tolerate_po", "severe_bicarbonate_or_ph"])
    );
  });
});
