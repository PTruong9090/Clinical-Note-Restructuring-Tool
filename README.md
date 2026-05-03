# Clinical Note Restructuring Tool

A full-stack clinical note restructuring tool that turns unstructured emergency department and H&P notes into a structured clinical summary, a deterministic admission-support checklist, and a clean Revised HPI. The project was built for a clinical documentation take-home assignment focused on DKA/euglycemic DKA admission reasoning.

The main design choice was to separate clinical reasoning from clinical writing. The backend first extracts source-supported facts and runs an MCG-style deterministic admission checklist. The LLM then uses those facts and checklist results to write the Revised HPI, but it does not decide the admission criteria by itself.

## Deployed Application

Deployed application: clinic.phuctruong.dev .

Deployment targets:

- Frontend: Cloudflare Pages
- Backend: Render
- Database: Render Postgres

When deployed, set the frontend `VITE_API_BASE_URL` to the backend URL and set backend `CORS_ORIGIN` to the frontend URL.

## Architecture Overview

The application has three layers:

1. React frontend
2. Express API backend
3. PostgreSQL database through Sequelize

Generation flow:

```text
User pastes ER note and H&P note
  -> frontend calls POST /api/generate
  -> backend combines notes
  -> rulesExtractor extracts facts and evidence snippets
  -> admissionCriteria applies deterministic MCG-style admission checklist
  -> generationService optionally sends facts/checklist/source notes to the LLM
  -> backend returns structured output, Revised HPI, evidence, and generation mode
  -> frontend lets the user edit the result
  -> user can save generated and edited versions as a case
```

Persistence flow:

```text
User edits generated output
  -> frontend calls POST /api/cases
  -> backend saves original notes, generated output, edited output, and hasUserEdits
  -> saved cases can be listed, opened, edited, and deleted
```

Important backend files:

- `server/src/app.js` mounts middleware and API routes.
- `server/src/routes/generateRoutes.js` exposes `POST /api/generate`.
- `server/src/controllers/generateController.js` receives ER/H&P text and calls the generation service.
- `server/src/services/rulesExtractor.js` extracts facts, findings, conditions, uncertainties, and source evidence.
- `server/src/services/admissionCriteria.js` evaluates the deterministic MCG-style admission checklist.
- `server/src/services/generationService.js` orchestrates rules-only generation or rules plus LLM generation.
- `server/src/schemas/clinicalOutputSchema.js` defines the exact structured JSON schema expected from the LLM.
- `server/src/controllers/caseController.js` saves and updates generated/edited cases.

Important frontend files:

- `client/src/api/client.js` wraps API calls.
- `client/src/views/GenerateView.jsx` contains the note input and generation workflow.
- `client/src/components/StructuredEditor.jsx` lets users edit structured output and Revised HPI.
- `client/src/components/AdmissionCriteriaList.jsx` displays supported and unsupported admission criteria.
- `client/src/components/EvidenceList.jsx` displays source evidence snippets.
- `client/src/utils/clinicalOutput.js` normalizes structured results so the UI handles missing fields safely.

## Tech Stack Choices and Why

Frontend:

- React: component-based UI for editing notes, structured fields, evidence, and saved cases.
- Vite: fast local development and simple production builds.
- Tailwind CSS: quick, consistent styling without building a full design system.
- Lucide React: lightweight icon set for simple UI actions.
- Vitest and React Testing Library: frontend workflow testing.

Backend:

- Node.js and Express: straightforward API server for a take-home MVP.
- Sequelize: database model and migration workflow without writing raw SQL for every operation.
- PostgreSQL: reliable relational database with native JSONB support for structured clinical outputs.
- Zod: strict runtime schema for the clinical output shape.
- OpenAI SDK and Google GenAI SDK: provider-neutral LLM support. The app can use either OpenAI or Gemini.
- Supertest and Vitest: API and extraction tests.

Clinical generation:

- Deterministic extraction rules: predictable, testable clinical fact extraction before the LLM runs.
- Deterministic admission checklist: separates admission reasoning from prose generation.
- Schema-constrained LLM output: keeps responses stable and easier to display/edit.
- Rules fallback mode: the app still works when `USE_LLM=false` or no API key is available.

## How The Clinical Note Is Structured

The generated clinical output uses this schema:

```js
{
  chiefComplaint: string,
  hpiSummary: string,
  keyFindings: string[],
  suspectedConditions: string[],
  dispositionRecommendation: "Admit" | "Observe" | "Discharge" | "Unknown",
  admissionCriteria: {
    guideline: string,
    dispositionRecommendation: "Admit" | "Observe" | "Discharge" | "Unknown",
    rationale: string,
    supportedCriteria: AdmissionCriterion[],
    unsupportedCriteria: AdmissionCriterion[]
  },
  uncertainties: string[],
  revisedHpi: string,
  evidence: Evidence[]
}
```

`rulesExtractor.js` extracts facts from the ER note and H&P note, including:

- Chief complaint
- Demographics
- Symptoms such as nausea, vomiting, altered mental status, weakness, Kussmaul breathing, and poor oral intake
- Labs such as glucose, pH, bicarbonate/HCO3/CO2, creatinine, and sodium
- Ketones/acetone
- Diabetes medication exposure such as Jardiance
- Treatments such as IV fluids, bicarbonate, insulin infusion, antibiotics, ICU admission, and frequent lab/glucose monitoring
- Missing or uncertain information such as allergies, PMH, or limited history

The extractor returns two useful forms of data:

- `keyFindings`: cleaned clinical facts, such as `pH 7.2` or `insulin infusion`.
- `evidence`: source snippets that prove where those facts came from.

## MCG-Style Admission Checklist

`admissionCriteria.js` is the deterministic checklist layer. It does not write the HPI. It checks whether the extracted facts support admission for DKA/euglycemic DKA.

Current checklist criteria include:

- DKA or euglycemic DKA evidence
- Ketones or acetone documented
- Metabolic acidosis by pH or bicarbonate/CO2 abnormality
- Severe pH or bicarbonate/CO2 abnormality
- Altered mental status or impaired mentation
- Inability to tolerate oral intake or persistent vomiting
- Need for IV fluid resuscitation
- Need for insulin infusion
- ICU-level care or frequent glucose/electrolyte monitoring
- AKI, dehydration, or volume depletion support

Disposition logic:

```text
DKA/euglycemic DKA evidence + admission-supporting severity/treatment/monitoring criterion
  -> Admit

DKA/euglycemic DKA evidence without strong admission-supporting criterion
  -> Observe

No DKA/euglycemic DKA evidence
  -> Unknown
```

The LLM receives this checklist as grounding evidence, but the backend preserves the deterministic checklist and disposition after the LLM responds.

## How The Revised HPI Is Generated

`generationService.js` controls Revised HPI generation.

The system supports two modes:

1. Rules-only fallback
2. Rules plus LLM refinement

Rules-only fallback:

- Runs when `USE_LLM=false`, no LLM API key is configured, the app is in test mode, or the LLM request fails.
- Uses extracted findings and the deterministic admission checklist to create a basic Revised HPI.
- Keeps the demo usable without API cost.

Rules plus LLM:

- Runs the same deterministic extraction and admission checklist first.
- Sends the source notes, extracted facts, evidence, and admission checklist to the LLM.
- Requires the LLM to return the exact Zod schema.
- Instructs the LLM to use only source-supported facts.
- Uses Case A Revised HPI as the writing target: concise clinical prose, objective DKA evidence, treatment escalation, and a final admission-support sentence.
- Restores deterministic `admissionCriteria` and `dispositionRecommendation` after the LLM responds, so the model writes prose but does not own the checklist decision.

The intended Revised HPI structure is:

1. Patient age/sex, relevant diabetes history or medication exposure, and symptom timeline.
2. ED presentation abnormalities such as tachycardia, altered mental status, Kussmaul breathing, weakness, or inability to tolerate PO.
3. Objective metabolic evidence such as ketones, pH, bicarbonate/HCO3, CO2, glucose, creatinine, or sodium.
4. Documented diagnosis and suspected trigger, only if present in the notes.
5. ED treatment escalation such as IV fluids, bicarbonate, insulin infusion, antibiotics, reassessments, consults, critical care, or ICU plan.
6. Admission reasoning based on supported admission criteria, explaining why inpatient care is supported rather than discharge or observation.

## Handling Uncertainty and Missing Information

The app handles uncertainty in three ways:

1. Source-grounded evidence

   Extracted facts are paired with evidence snippets whenever possible. This makes it easier to see why a criterion was marked as supported.

2. Explicit uncertainty fields

   `rulesExtractor.js` adds uncertainty messages when important information is not clearly documented, such as allergies, past medical history, or limited history due to mentation.

3. Conservative prompting

   The LLM prompt says not to invent dates, diagnoses, treatments, labs, symptoms, or missing history. If something is missing or uncertain, the model should state that in `uncertainties` rather than filling in details.

The Case A example is used only as a structure and style guide. The prompt explicitly tells the LLM not to copy Case A facts unless those facts appear in the current notes or extracted evidence.

## API Endpoints

- `GET /health` - Health check.
- `POST /api/generate` - Generate structured output and Revised HPI from ER/H&P notes.
- `POST /api/cases` - Save a generated or edited case.
- `GET /api/cases` - List saved cases.
- `GET /api/cases/:id` - Retrieve one saved case.
- `PATCH /api/cases/:id` - Update edited structured output/Revised HPI.
- `DELETE /api/cases/:id` - Delete a saved case.

## How To Run Locally

Requirements:

- Node.js 20 or newer
- npm
- Docker, if using the included local PostgreSQL setup

1. Install dependencies from the repository root:

```bash
npm install
```

2. Create environment files:

```bash
copy .env.example server\.env
copy .env.example client\.env
```

On macOS/Linux:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

3. Start local PostgreSQL:

```bash
docker compose up -d postgres
```

4. In `server/.env`, use a local database URL:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/clinical_notes
CORS_ORIGIN=http://localhost:5173
USE_LLM=false
```

5. In `client/.env`, point the frontend at the backend:

```env
VITE_API_BASE_URL=http://localhost:4000
```

6. Run the database migration:

```bash
npm run migrate --workspace server
```

7. Start the backend:

```bash
npm run dev:server
```

8. Start the frontend in another terminal:

```bash
npm run dev:client
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

To enable LLM generation, set these in `server/.env`:

```env
USE_LLM=true
LLM_PROVIDER=openai
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-5.4-mini
```

or:

```env
USE_LLM=true
LLM_PROVIDER=gemini
LLM_API_KEY=your_api_key
LLM_MODEL=gemini-2.5-flash
```

Run tests:

```bash
npm test
```

Build checks:

```bash
npm run build:server
npm run build
```

## AI Tools Used And How

AI tools were used as a development assistant, not as the sole source of clinical logic.

I used AI assistance to:

- Scaffold and refine the React/Vite frontend structure.
- Draft Express routes, controllers, and service boundaries.
- Create the schema-constrained LLM generation flow.
- Convert the Case A Revised HPI into a reusable prompt pattern.
- Add tests around Case A and Case B DKA/euglycemic DKA extraction behavior.
- Refine the README and project explanation.

I manually directed and reviewed:

- The clinical information that should be extracted from ER and H&P notes.
- The MCG-style deterministic admission checklist.
- The distinction between deterministic admission reasoning and LLM-written prose.
- The Case A sentence-by-sentence Revised HPI pattern.
- The saved-case workflow for generated versus edited outputs.

The main safety choice was to make the model use source-supported facts and a deterministic checklist instead of letting the LLM independently decide admission support.

## Structured AI Prompt Used To Plan/Generate The Project

This is the structured project prompt I would use to plan and generate the server and frontend with Codex:

```text
Build me a basic full-stack clinical note restructuring tool.

Goal:
I want an app where a user can paste an ER note and an H&P note, then generate a structured clinical summary and a clean Revised HPI. The output should support admission reasoning for DKA/euglycemic DKA using deterministic rules before the LLM writes anything. The LLM should write the Revised HPI, but it should not be the only source of clinical reasoning.

High-level architecture:
- Use a React frontend with Vite.
- Use an Express backend with Node.js.
- Use PostgreSQL for persistence.
- Use Sequelize for models and migrations.
- Use Zod to define the exact clinical output schema.
- Use Vitest for tests.
- Support both OpenAI and Gemini through environment variables.
- Make the app work without an LLM key by using a rules-only fallback.

Frontend requirements:
- Create a main generation screen with two large textareas: ER Note and H&P Note.
- Add a Generate button that calls POST /api/generate.
- After generation, show editable structured fields:
  - Chief complaint
  - HPI summary
  - Key findings
  - Suspected conditions
  - Disposition recommendation
  - Uncertainties
  - Revised HPI
- Show a deterministic admission criteria checklist with supported and unsupported criteria.
- Show evidence snippets from the source notes.
- Add a Save Case button that saves generated and edited content.
- Add saved case views where I can list, open, edit, save updates, and delete cases.
- Keep the UI clean and practical. This is a clinical workflow tool, not a marketing page.

Backend requirements:
- Create an Express app with CORS, JSON parsing, request logging, health check, route mounting, 404 handling, and centralized error handling.
- Create /api/generate route:
  - Input: erNote, hpNote
  - Output: combinedNote, structuredResult, revisedHpi, generationMode
- Create /api/cases routes:
  - POST /api/cases
  - GET /api/cases
  - GET /api/cases/:id
  - PATCH /api/cases/:id
  - DELETE /api/cases/:id
- Save both generated and edited outputs so I can compare machine output with manual revisions.

Database model:
Create a Case model with:
- id UUID
- title
- erNote
- hpNote
- combinedNote
- generatedStructuredResult JSONB
- editedStructuredResult JSONB
- generatedRevisedHpi text
- editedRevisedHpi text
- hasUserEdits boolean
- createdAt and updatedAt

Clinical schema:
The generated structured result should be:
{
  chiefComplaint,
  hpiSummary,
  keyFindings,
  suspectedConditions,
  dispositionRecommendation,
  admissionCriteria,
  uncertainties,
  revisedHpi,
  evidence
}

Evidence objects should include:
- fact
- source: ER, H&P, Combined, or Rules
- snippet

Admission criteria should include:
- guideline
- dispositionRecommendation
- rationale
- supportedCriteria
- unsupportedCriteria

Each criterion should include:
- id
- label
- supported
- evidence

Clinical extraction rules:
Before calling the LLM, build a deterministic rulesExtractor service that combines the ER and H&P notes and extracts source-supported facts:
- chief complaint
- age/sex or demographics
- nausea
- vomiting
- altered mental status
- weakness
- poor oral intake
- tachycardia
- Kussmaul breathing or tachypnea
- glucose
- pH
- bicarbonate/HCO3/CO2
- creatinine
- sodium
- ketones/acetone
- Jardiance or SGLT2 inhibitor exposure
- recently diagnosed diabetes
- insulin drip/insulin infusion
- IV fluids
- bicarbonate therapy
- antibiotics
- ICU admission
- frequent glucose or BMP monitoring
- admission requested/planned

MCG-style deterministic admission checklist:
Create a separate admissionCriteria service. It should not write the HPI. It should only decide which admission criteria are supported by the extracted facts and evidence.

For DKA/euglycemic DKA, admission support should consider:
- DKA or euglycemic DKA evidence
- ketones or acetone
- metabolic acidosis by pH or bicarbonate/CO2
- severe pH or bicarbonate/CO2 abnormality
- altered mental status
- inability to tolerate oral intake or persistent vomiting
- IV fluids
- insulin infusion
- ICU-level care
- frequent glucose/electrolyte monitoring
- AKI/dehydration/volume depletion

Disposition logic:
- If DKA/euglycemic DKA evidence exists and there is admission-supporting severity, treatment, or monitoring evidence, recommend Admit.
- If DKA/euglycemic DKA evidence exists but strong admission-level support is incomplete, recommend Observe.
- If DKA/euglycemic DKA is not supported, recommend Unknown.

LLM generation rules:
The LLM should receive:
- the original combined notes
- rule-extracted facts
- the deterministic admission checklist
- the required output schema

The LLM must:
- use only source-supported facts
- not invent labs, diagnoses, treatments, dates, symptoms, or history
- use admissionCriteria as grounding evidence
- not modify unsupported criteria
- write the Revised HPI in clear clinical prose
- make the HPI logically support the deterministic disposition recommendation
- return the exact schema

Revised HPI structure:
Use the Case A Revised HPI as the style target:
1. Start with age/sex, relevant diabetes history or medication exposure, and symptom timeline.
2. Describe ED presentation abnormalities such as tachycardia, Kussmaul breathing, altered mental status, weakness, or inability to tolerate PO.
3. Summarize objective metabolic evidence: ketones, pH, bicarbonate/HCO3, CO2, glucose, creatinine, or sodium.
4. State the documented diagnosis and suspected trigger only if present in the notes.
5. Describe treatment escalation: IV fluids, bicarbonate, insulin infusion, antibiotics, reassessments, critical care, or ICU plan.
6. End with admission reasoning based only on supported admission criteria.

Case A example-use rule:
Use Case A only for structure, sequencing, and admission-support writing style. Do not copy facts such as Jardiance, pH 7.20, bicarbonate 7.4, CO2 <7, 3L saline, insulin infusion, critical care, or ICU unless those facts appear in the current source notes.

Uncertainty handling:
- Add uncertainty messages when allergies, PMH, or history limitations are missing or unclear.
- If the LLM is unsure, it should add to uncertainties instead of inventing.
- Evidence snippets should make it easy to audit why a fact or criterion was used.

Testing:
- Add unit tests for rulesExtractor using Case A euglycemic DKA and Case B severe DKA.
- Add tests that verify the admission checklist marks supported criteria.
- Add API tests for generation fallback and case CRUD.
- Add frontend workflow test for generating and editing output.

Local development:
- Root package should use npm workspaces for client and server.
- Include scripts:
  - npm run dev:server
  - npm run dev:client
  - npm run migrate --workspace server
  - npm test
  - npm run build
  - npm run build:server
- Include docker-compose.yml for local PostgreSQL.
- Include .env.example with DATABASE_URL, CORS_ORIGIN, USE_LLM, LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, and VITE_API_BASE_URL.

Main design principle:
Keep clinical reasoning deterministic and testable, and use the LLM mainly for rewriting the HPI into clean clinical prose.
```

## If I Had More Time

- Add authentication and per-user case ownership.
- Add richer source citations with highlighted spans directly inside the original notes.
- Add `.docx` and PDF upload support so users do not have to manually paste notes.
- Add more MCG-style criteria beyond DKA/euglycemic DKA.
- Add condition-specific checklists for sepsis, AKI, chest pain, heart failure, and altered mental status.
- Add a side-by-side generated versus edited comparison view for manual fine tuning.
- Store prompt versions and model metadata with each generated case.
- Add an evaluation dashboard for measuring extraction misses and HPI quality across test cases.
- Add rate limiting and request validation for production use.
- Add better deployment automation and CI checks.
