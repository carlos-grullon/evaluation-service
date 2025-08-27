
# Evaluation Service

<p align="center">
  <a href="#"><img alt="Node" src="https://img.shields.io/badge/Node-20.x-339933?logo=node.js&logoColor=white"></a>
  <a href="#"><img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-DB1140?logo=nestjs&logoColor=white"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white"></a>
  <a href="#"><img alt="BullMQ" src="https://img.shields.io/badge/BullMQ-Queue-EF4444?logo=redis&logoColor=white"></a>
  <a href="#"><img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white"></a>
  <a href="#"><img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white"></a>
  <a href="#"><img alt="AWS S3" src="https://img.shields.io/badge/AWS-S3-232F3E?logo=amazonaws&logoColor=FF9900"></a>
  <a href="#"><img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white"></a>
</p>

NestJS-based API for asynchronous text and audio evaluations. Jobs are queued with BullMQ/Redis, processed by a worker, and results are persisted in MongoDB. Audio inputs are validated against AWS S3. The service exposes health checks and protects evaluation routes with an API key.

## Features

- Text and audio evaluation endpoints (`/evaluate/text`, `/evaluate/audio`).
- Asynchronous processing with BullMQ (`evaluation` queue) and a dedicated worker.
- MongoDB persistence for inputs, status, scores, and feedback (`evaluations` collection).
- S3 URL validation (HTTPS, optional bucket allowlist, optional HEAD check).
- Health endpoint: GET /health (Mongo/Redis status)
- API key protection for evaluation routes (header x-api-key or Authorization: ApiKey <key>)
- Environment-driven config, including separate MONGODB_DB_NAME

## API Endpoints

- POST `/evaluate/text`
  - Body: `{ "text": string, "language?": string }`
  - Response: `{ id, jobId }`
- POST `/evaluate/audio`
  - Body: `{ "s3Url": string, "referenceText?": string, "language?": string }`
  - Response: `{ id, jobId }`
- GET `/results/:id`
  - Response: `{ id, state, result?, failedReason?, document }`

## Health

- GET `/health` returns `{ status, mongo, redis, time }`.
- `status` is `ok`, `degraded`, or `down` depending on Mongo/Redis.

## Security

- Set `API_KEY` in environment.
- Send either header `x-api-key: <API_KEY>` or `Authorization: ApiKey <API_KEY>` on `/evaluate/*` and `/results/*`.
- `/health` is public by default.

## Configuration

- Core: `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME`, `REDIS_HOST`, `REDIS_PORT`.
- AWS: `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- Options: `AUDIO_S3_HEAD_VALIDATE` (`true|false`).

## Running locally

1) Ensure Redis and MongoDB are running (defaults `127.0.0.1:6379` and `localhost:27017`).
2) Copy `.env.example` to `.env` and set values.
3) Install dependencies: `npm i`.
4) Start API + worker: `npm run dev`.

### Example requests

Create text evaluation:
```bash
curl -X POST http://localhost:3000/evaluate/text \
  -H "Content-Type: application/json" \
  -H "x-api-key: <YOUR_API_KEY>" \
  -d '{"text":"Hello world","language":"en"}'
```

Create audio evaluation:
```bash
curl -X POST http://localhost:3000/evaluate/audio \
  -H "Content-Type: application/json" \
  -H "x-api-key: <YOUR_API_KEY>" \
  -d '{"s3Url":"https://<bucket>.s3.<region>.amazonaws.com/path/audio.wav","language":"en"}'
```

Check results:
```bash
curl -H "x-api-key: <YOUR_API_KEY>" http://localhost:3000/results/<jobId>
```

## Tech stack

- NestJS, BullMQ, Redis, MongoDB/Mongoose
- AWS SDK v3 (S3)
- TypeScript

## Architecture

```mermaid
flowchart LR
  Client[(Client)] -->|HTTP| API[API (NestJS)]
  API -->|enqueue| Q[(Redis Queue)]
  Q --> Worker[Worker]
  Worker -->|persist| Mongo[(MongoDB)]
  API -->|read| Mongo
  subgraph S3[AWS S3]
    Obj[(Audio Object)]
  end
  API -. validate URL/HEAD .-> S3
```

## Docker

- Build images and start stack (API, Worker, MongoDB, Redis):
  ```bash
  docker compose up --build -d
  ```
- Environment: copy `.env.example` to `.env`. Compose passes it to API/Worker. Defaults inside compose set `REDIS_HOST=redis` and `MONGODB_URI=mongodb://mongo:27017`.
- Access API: http://localhost:3000
- Logs:
  ```bash
  docker compose logs -f api
  docker compose logs -f worker
  ```
- Stop:
  ```bash
  docker compose down
  ```