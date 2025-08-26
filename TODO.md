# TODO Roadmap: Automatic Evaluation System (Text + Voice)

Objective: Build a microservice that evaluates plain text and audio submissions, returns structured feedback and scores, and integrates with Classnet. Inputs (audio/text) are already uploaded to S3 by Classnet.

---

## Phase 1 — Architecture & Setup

- [ ] General
  - [x] Create .env and .env.example with: PORT, REDIS_HOST, REDIS_PORT, MONGODB_URI, AWS creds/bucket, OPENAI_API_KEY, AZURE_SPEECH_KEY/REGION, DEEPGRAM/ASSEMBLYAI keys, LANGUAGETOOL_KEY (if any), COPYLEAKS creds (optional)
  - [x] Add ConfigModule (Nest) to validate env vars
  - [ ] Add Docker Compose (Redis, MongoDB) and Dockerfiles for API and worker
  - [ ] CI (GitHub Actions): build, test, lint, docker build

- [ ] Repo structure (monorepo optional)
  - [ ] evaluation-service (NestJS)
    - [ ] queue/ (BullMQ providers)
    - [ ] evaluation/ (feature: text/audio)
    - [ ] storage/ (S3 client + helpers)
    - [ ] persistence/ (Mongo models/schemas + repository)
    - [ ] integrations/ (OpenAI, LanguageTool, Azure Speech, Deepgram/AssemblyAI, Copyleaks)
    - [ ] common/ (filters, interceptors, utilities)

- [ ] Queue & Worker
  - [ ] Finalize QueueModule with connection factory and QueueService (BullMQ)
  - [ ] Create workers:
    - [ ] textEvaluation.worker.ts
    - [ ] audioEvaluation.worker.ts
  - [ ] Shared types for job payloads/results

- [x] API Endpoints (initial)
  - [x] POST /evaluate/text { text, meta } → returns jobId
  - [x] POST /evaluate/audio { s3Url, meta } → returns jobId
  - [x] GET /results/:id → returns evaluation result/state

- [x] Validation & Docs
  - [x] DTOs with class-validator + global ValidationPipe
  - [x] Swagger at /docs (dev only)

- [ ] Storage (S3)
  - [ ] S3 client (AWS SDK v3)
  - [ ] Validate access to S3 bucket and pre-signed GET URLs

- [x] Persistence (MongoDB)
  - [x] MongooseModule setup
  - [x] Schemas: Evaluation (type, input refs, scores, feedback JSON, states, durations, costs)
  - [ ] Repository/services for CRUD

---

## Phase 2 — Core Functionality

- [ ] Text Evaluation Pipeline
  - [ ] LanguageTool: spell/grammar/style quick pass (record issues + corrected text)
  - [ ] OpenAI (GPT-4o) Structured Outputs/JSON
    - [ ] Define rubric schema: grammar, vocabulary, coherence, clarity, task completion, CEFR, overall score
    - [ ] Prompt templates with few-shot examples
    - [ ] Parse and validate JSON output
  - [ ] (Optional) Copyleaks: originality score
  - [ ] Aggregate results: final score, per-criterion scores, suggestions, corrected text
  - [ ] Store result in MongoDB

- [ ] Audio Evaluation Pipeline
  - [ ] ASR
    - [ ] Choose provider (Deepgram or AssemblyAI)
    - [ ] Implement async transcription (webhook or polling)
    - [ ] Input: S3 URL provided by Classnet (no direct upload in this service)
  - [ ] Azure Speech — Pronunciation Assessment
    - [ ] Modes: scripted (reference text) and unscripted
    - [ ] Collect metrics: accuracy, fluency, completeness, (prosody/content if available)
  - [ ] LLM rubric for speaking (content/structure/fluency coherence) merged with Azure metrics
  - [ ] Store result in MongoDB

- [ ] Orchestration
  - [ ] Job payload contracts and versioning
  - [ ] Backoff/retries, removeOnComplete/Fail policies
  - [ ] Timeouts and circuit breakers (axios/retry policies)

- [ ] Webhooks/Events
  - [ ] Webhook to Classnet on evaluation completed (configurable URL + secret)
  - [ ] Push status updates (optional)

- [ ] Security
  - [ ] API key or JWT for endpoints
  - [ ] Input size limits and mime checks
  - [ ] Protect Swagger in non-dev

---

## Phase 3 — UX & Portfolio

- [ ] Demo Frontend (Next.js)
  - [ ] Pages: Upload Text, Upload Audio, Results
  - [ ] Charts (Recharts) and rich feedback UI
  - [ ] Export to PDF
  - [ ] Env-configurable API base URL

- [ ] Documentation & DX
  - [ ] README: architecture diagram, example JSON outputs, curl examples
  - [ ] Sequence diagrams: Client → API → Queue → Workers → DB → Webhook
  - [ ] 2-min demo video script and recording

- [ ] Observability
  - [ ] Logger with correlation ids
  - [ ] Health endpoints (API/Worker + Redis/Mongo checks)
  - [ ] Metrics (job throughput, latency, cost per evaluation)

---

## Detailed Tasks (Backlog)

- [ ] ConfigModule: zod/joi validation for env
- [ ] API Gateway stubs (if separate service)
- [ ] Multipart upload support for /evaluate/audio (N/A: uploads are handled by Classnet)
- [ ] S3 signed URL validation and fallback download
- [ ] Normalize text (unicode, emojis) before evaluation
- [ ] Prompt versioning and A/B prompts
- [ ] Cache of LanguageTool to reduce cost/latency
- [ ] Rate limiting & request id middleware
- [ ] Dead-letter queue (DLQ) strategy
- [ ] Idempotency keys for submissions
- [ ] Pagination/filtering endpoints for results listing
- [ ] RBAC for internal tools (admin endpoints to reprocess)

---

## Environment Variables (draft)

- PORT=3000
- REDIS_HOST=127.0.0.1
- REDIS_PORT=6379
- MONGODB_URI=mongodb://localhost:27017/evaluation
- AWS_REGION=us-east-1
- AWS_S3_BUCKET=classnet-uploads
- OPENAI_API_KEY=...
- LANGUAGETOOL_API_KEY=... (optional)
- AZURE_SPEECH_KEY=...
- AZURE_SPEECH_REGION=...
- DEEPGRAM_API_KEY=... (or ASSEMBLYAI_API_KEY=...)
- COPYLEAKS_EMAIL=... (optional)
- COPYLEAKS_API_KEY=... (optional)
- CLASSNET_WEBHOOK_URL=... (optional)

---

## Milestones & Estimates

- Phase 1: 4–5 days
- Phase 2: 7–10 days
- Phase 3: 4–5 days

---

## Definition of Done (per evaluation)

- Input validated and stored (pointer to S3 if audio)
- Job processed with retries and backoff
- Structured JSON feedback stored in MongoDB
- Webhook/event emitted to Classnet (if configured)
- Endpoint returns status and result deterministically
