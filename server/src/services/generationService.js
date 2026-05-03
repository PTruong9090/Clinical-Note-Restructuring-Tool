import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { env } from "../config/env.js";
import { ClinicalOutputSchema } from "../schemas/clinicalOutputSchema.js";
import { extractClinicalFacts } from "./rulesExtractor.js";

function trimNote(note = "") {
  return note.toString().trim();
}

function createPrompt({ combinedNote, rulesOutput }) {
  return [
    {
      role: "system",
      content:
        "You generate clinical documentation support text from source notes. Use only facts supported by the source note, extracted rule findings, or deterministic admission checklist. Do not invent dates, diagnoses, treatments, labs, or symptoms. If information is missing or uncertain, state that in uncertainties. The Revised HPI must be a concise admission-supporting narrative and must logically support the disposition recommendation."
    },
    {
      role: "user",
      content: [
        "Return the exact structured schema requested.",
        "Write in clear clinical prose.",
        "Use the evidence array for the major facts used in the summary and Revised HPI.",
        "The admissionCriteria object is a deterministic MCG-style checklist. Treat it as grounding evidence; do not change its criteria or use unsupported criteria.",
        "If admissionCriteria supports DKA/euglycemic DKA admission, emphasize the supported objective metabolic derangement, treatment escalation, PO intolerance, altered mentation, and monitoring/ICU needs that are present in the notes.",

        "Example original HPI:",
        "A 47-year-old man with recently diagnosed diabetes started metformin and Jardiance, developed nausea, vomiting, inability to tolerate oral intake, difficulty sleeping, and came to the emergency department. He was found to have euglycemic DKA with low bicarbonate, pH 7.2, normal glucose, and admission was requested.",
        "",
        "Example clean revised HPI:",
        "A 47-year-old man with a recent diagnosis of diabetes who had started metformin and Jardiance presented to the emergency department after one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths. In the emergency department, he was described as tachycardic and exhibiting Kussmaul breathing. Laboratory evaluation demonstrated large serum and urine ketones with severe metabolic acidosis, including arterial pH 7.20, bicarbonate 7.4 millimoles per liter, and serum carbon dioxide less than 7 millimoles per liter, while serum glucose remained in the normal range. Emergency physicians documented euglycemic diabetic ketoacidosis in the setting of recent Jardiance use. In the emergency department he received bicarbonate, three liters of normal saline, and was started on an insulin infusion after repeated reassessments. Taken together, the documented severe acidosis with ketosis, escalation of emergency department treatment to continuous intravenous therapy, critical care involvement, and planned intensive care unit-level management supported the decision for inpatient admission rather than discharge or observation.",
        "",
        "Sentence structure to imitate:",
        "Sentence 1: Patient age/sex, relevant diabetes history or medication exposure, and symptom timeline.",
        "Sentence 2: ED presentation abnormalities such as tachycardia, Kussmaul breathing, altered mental status, weakness, or inability to tolerate oral intake.",
        "Sentence 3: Objective metabolic evidence such as ketones, pH, bicarbonate/HCO3, CO2, glucose, creatinine, or sodium.",
        "Sentence 4: Documented diagnosis and suspected trigger, only if present in the current notes.",
        "Sentence 5: ED treatment escalation such as IV fluids, bicarbonate, insulin infusion, antibiotics, reassessments, consults, or critical care.",
        "Sentence 6: Admission reasoning using admissionCriteria: severe metabolic derangement, continuous IV therapy, ICU-level care, frequent monitoring, or unsafe discharge/observation.",
        
        "Example Sentence-by-Sentence Comparison",
        "Revised:",
        "A 47-year-old man with a recent diagnosis of diabetes who had started metformin and Jardiance presented to the emergency department after one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths.",
        "Source:",
        "Emergency department history of present illness: “recent diagnosis of diabetes, on Jardiance metformin” and “inability to take deep breaths, sleep well, nausea, and vomiting.”",
        "Reason:",
        "Part 1: Persistent gastrointestinal symptoms and respiratory complaints prompted emergency evaluation and suggest that symptoms were not resolving with home management. Part 2: New gastrointestinal and breathing complaints prompting emergency evaluation correspond to inpatient-level care when objective testing identifies severe metabolic derangement requiring continued monitoring and treatment.",

        "Important example-use rules:",
        "Use the example only for writing structure, clinical sequencing, and admission-supporting reasoning style.",
        "Do not copy Case A facts such as Jardiance, pH 7.20, bicarbonate 7.4, CO2 <7, three liters of saline, insulin infusion, critical care, or ICU unless those facts appear in the current source notes or extracted evidence.",
        "Do not output the sentence-by-sentence comparison. Output only the requested structured schema.",
        "",
        JSON.stringify(rulesOutput, null, 2),
        "",
        "Source notes:",
        combinedNote
      ].join("\n")
    }
  ];
}

function hasUsefulInput(erNote, hpNote) {
  return trimNote(erNote).length > 10 || trimNote(hpNote).length > 10;
}

async function generateWithOpenAi({ combinedNote, rulesOutput }) {
  const openai = new OpenAI({ apiKey: env.llmApiKey });
  const response = await openai.responses.parse({
    model: env.llmModel,
    input: createPrompt({
      combinedNote,
      rulesOutput
    }),
    text: {
      format: zodTextFormat(ClinicalOutputSchema, "clinical_note_output")
    }
  });

  return response.output_parsed;
}

async function generateWithGemini({ combinedNote, rulesOutput }) {
  const ai = new GoogleGenAI({ apiKey: env.llmApiKey });
  const prompt = createPrompt({ combinedNote, rulesOutput })
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");

  const response = await ai.models.generateContent({
    model: env.llmModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(ClinicalOutputSchema)
    }
  });

  return ClinicalOutputSchema.parse(JSON.parse(response.text));
}

async function generateWithConfiguredLlm({ combinedNote, rulesOutput }) {
  if (env.llmProvider === "gemini") {
    return generateWithGemini({ combinedNote, rulesOutput });
  }

  if (env.llmProvider === "openai") {
    return generateWithOpenAi({ combinedNote, rulesOutput });
  }

  throw new Error(`Unsupported LLM provider "${env.llmProvider}".`);
}

export async function generateClinicalOutput({ erNote = "", hpNote = "" }) {
  if (!hasUsefulInput(erNote, hpNote)) {
    const extracted = extractClinicalFacts({ erNote, hpNote });
    return {
      combinedNote: extracted.combinedNote,
      structuredResult: extracted.structured,
      revisedHpi: extracted.structured.revisedHpi,
      generationMode: "rules"
    };
  }

  const extracted = extractClinicalFacts({ erNote, hpNote });

  if (!env.useLlm || !env.llmApiKey || env.nodeEnv === "test") {
    return {
      combinedNote: extracted.combinedNote,
      structuredResult: extracted.structured,
      revisedHpi: extracted.structured.revisedHpi,
      generationMode: "rules"
    };
  }

  try {
    const parsed = await generateWithConfiguredLlm({
      combinedNote: extracted.combinedNote,
      rulesOutput: extracted.structured
    });
    const structuredResult = {
      ...parsed,
      admissionCriteria: extracted.structured.admissionCriteria,
      dispositionRecommendation: extracted.structured.admissionCriteria.dispositionRecommendation
    };

    return {
      combinedNote: extracted.combinedNote,
      structuredResult,
      revisedHpi: structuredResult.revisedHpi,
      generationMode: "llm"
    };
  } catch (error) {
    console.error("LLM generation failed, using rules fallback:", error.message);
    return {
      combinedNote: extracted.combinedNote,
      structuredResult: {
        ...extracted.structured,
        uncertainties: [
          ...extracted.structured.uncertainties,
          "LLM generation failed, so the rules-only fallback was used."
        ]
      },
      revisedHpi: extracted.structured.revisedHpi,
      generationMode: "rules-fallback"
    };
  }
}
