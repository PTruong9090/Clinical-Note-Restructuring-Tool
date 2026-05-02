# Clinical Note Restructuring Tool

Take-home MVP that turns unstructured ER and H&P notes into a structured clinical summary and a machine-generated Revised HPI. The app combines deterministic DKA-focused extraction rules with an optional LLM refinement pass, then lets users edit and save cases.

## Architecture

- Frontend: React, Vite, Tailwind CSS.
- Backend: Express, Sequelize, PostgreSQL.
- AI: Provider-neutral LLM configuration with a schema-constrained generation layer. Current adapters support Gemini and OpenAI.
- Deploy target: Cloudflare Pages for the frontend, Render for the backend, Supabase Postgres for the database.

The backend owns all generation and persistence. The frontend calls `/api/generate`, lets the user edit the generated fields, then saves both generated and edited content to the database.

## Clinical Structuring

The rules layer extracts source-supported facts before the LLM runs: demographics, chief complaint, symptoms, abnormal vitals, DKA labs, treatments, ICU/critical care markers, diagnoses, disposition, and missing history. DKA admission support is based on documented evidence such as ketosis, pH <= 7.30, bicarbonate/CO2 <= 18, severe hyperglycemia, altered mental status, AKI/dehydration, insulin infusion, IV fluids, ICU admission, and critical care time.

The LLM receives the original notes plus extracted facts and must return the fixed schema. It is instructed to avoid unsupported facts, mark unknowns explicitly, and write a Revised HPI that logically supports the recommended disposition. If no LLM key is configured, or `USE_LLM=false` is set, the app uses the rules-only fallback so the demo still works without API cost.

For a free live demo, set this in `server/.env`:

```env
USE_LLM=false
```

That keeps the hybrid design intact: the rules layer still extracts facts and generates a complete fallback output, while the LLM refinement layer can be re-enabled later by setting `USE_LLM=true` and providing `LLM_API_KEY`.

LLM-related environment variables:

```env
LLM_PROVIDER=gemini
LLM_API_KEY=
LLM_MODEL=gemini-2.5-flash
USE_LLM=false
```

Use `LLM_PROVIDER=gemini` with a Gemini API key, or `LLM_PROVIDER=openai` with an OpenAI API key. The code still accepts the older `OPENAI_API_KEY`, `OPENAI_MODEL`, and `USE_OPENAI` names as backward-compatible aliases for the OpenAI adapter.

## API

- `POST /api/generate` - Generate structured output and Revised HPI from ER/H&P notes.
- `POST /api/cases` - Save a generated or edited case.
- `GET /api/cases` - List saved cases.
- `GET /api/cases/:id` - Retrieve one saved case.
- `PATCH /api/cases/:id` - Update edited structured output/Revised HPI.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

3. Start PostgreSQL and set `DATABASE_URL` in `server/.env`. A local Docker option is included:

```bash
docker compose up -d postgres
```

4. Run migrations:

```bash
npm run migrate --workspace server
```

5. Start the backend and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Backend defaults to `http://localhost:4000`; frontend defaults to `http://localhost:5173`.

## Deployment

Backend on Render:

- Build command: `npm install`
- Start command: `npm run migrate --workspace server && npm run start --workspace server`
- Environment: `DATABASE_URL`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `USE_LLM`, `CORS_ORIGIN`

Frontend on Cloudflare Pages:

- Build command: `npm install && npm run build`
- Build output: `client/dist`
- Environment: `VITE_API_BASE_URL`

Database on Supabase:

- Use the pooled or direct PostgreSQL connection string as `DATABASE_URL`.
- Run the server migration command once during deployment.

## AI Usage Disclosure

AI assistance was used to scaffold the React UI, Express/Sequelize API structure, and the prompt/schema for clinical note generation. The clinical rules, persistence flow, editing behavior, and test cases were manually reviewed and shaped around the provided AHMC assignment, Case A example, and Case B evaluation notes. Correctness is verified with unit tests for extraction, API tests with mocked generation, frontend tests for the main workflow, and manual comparison against the Case A Revised HPI pattern.

Prompt
'''

'''

## Future Improvements

- Add authentication and per-user case ownership.
- Add richer source citations with highlighted note spans.
- Add document upload and OCR/parser support for `.docx` and PDF inputs.
- Add eval fixtures for more conditions beyond DKA.
- Add audit history for every edit.
