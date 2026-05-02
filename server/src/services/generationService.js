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
        "You generate clinical documentation support text from source notes. Use only facts supported by the source note or the extracted rule findings. Do not invent dates, diagnoses, treatments, labs, or symptoms. If information is missing or uncertain, state that in uncertainties. The Revised HPI must be a concise admission-supporting narrative and must logically support the disposition recommendation."
    },
    {
      role: "user",
      content: [
        "Return the exact structured schema requested.",
        "Write in clear clinical prose.",
        "Use the evidence array for the major facts used in the summary and Revised HPI.",
        "If the notes support DKA admission, emphasize objective metabolic derangement, treatment escalation, and monitoring/ICU needs.",
        "",
        "Rule-extracted facts:",
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

    return {
      combinedNote: extracted.combinedNote,
      structuredResult: parsed,
      revisedHpi: parsed.revisedHpi,
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
