<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

GENERAL OVERVIEW 

This project is a NestJS application that provides an API for evaluating user performance. It includes features such as user authentication, performance tracking, and reporting. The application is built using TypeScript and is designed to be scalable and maintainable.

Directory Structure (current)

evaluation-service/
├── src/
│   ├── app.module.ts            # Root module
│   ├── main.ts                  # App bootstrap
│   ├── evaluation/              # Feature: Evaluations
│   │   ├── evaluation.module.ts
│   │   ├── evaluation.controller.ts   # REST endpoints (POST/GET)
│   │   ├── evaluation.service.ts      # Business logic (enqueue/query)
│   │   └── dto/
│   │       └── create-evaluation.dto.ts
│   ├── queue/                   # BullMQ encapsulation
│   │   ├── queue.module.ts
│   │   └── queue.service.ts
│   ├── workers/                 # Queue workers
│   │   └── evaluationWorker.ts
│   └── utils/                   # Helpers (reserved)
├── package.json                 # Dependencies and scripts
├── README.md                    # Documentation
├── tsconfig.json                # TypeScript configuration

API Endpoints

- POST /evaluations
  - Body: { "text": string }
  - Response: { "jobId": string }
- GET /evaluations/:id
  - Response: { id, state, result?, failedReason? }

Running locally

1) Ensure Redis is running (defaults): REDIS_HOST=127.0.0.1, REDIS_PORT=6379
2) Start API: npm run start:dev
3) Start worker: ts-node -r tsconfig-paths/register src/workers/evaluationWorker.ts
4) Test:
   - Create job:
     curl -X POST http://localhost:3000/evaluations \
       -H "Content-Type: application/json" \
       -d '{"text":"hola worker"}'
   - Check status:
     curl http://localhost:3000/evaluations/<jobId>