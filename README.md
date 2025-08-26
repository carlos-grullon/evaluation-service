<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

GENERAL OVERVIEW 

This project is a NestJS application that provides an API for evaluating user performance. It includes features such as user authentication, performance tracking, and reporting. The application is built using TypeScript and is designed to be scalable and maintainable.

Directory Structure

evaluation-service/
├── src/
│   ├── controllers/  # API endpoints
│   ├── services/     # Evaluation logic (text/audio)
│   ├── workers/      # Async queue processing
│   ├── utils/        # Helper functions
│   └── main.ts       # Main application file
├── package.json      # Project dependencies and scripts
├── README.md         # Project documentation
├── tsconfig.json     # TypeScript configuration