# A.R.E.S. Command (Autonomous Relay & Exploration System)

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini%202.5%20Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)

A full-stack, fault-tolerant telemetry dashboard designed to ingest, buffer, and analyze high-frequency satellite data using a dual-tier database architecture and Generative AI.

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features & Architecture](#-key-features--architecture)
- [Tech Stack](#-tech-stack)
- [Local Installation](#-local-installation)
- [System Architecture Flow](#-system-architecture-flow)
- [API Documentation](#-api-documentation)

---

## 🚀 Project Overview

Standard web applications rely on direct CRUD operations, which fail under the stress of high-frequency data streams (like live satellite telemetry). **A.R.E.S.** solves this by implementing an enterprise-grade ingestion pipeline. Instead of locking a relational database with rapid inserts, telemetry is captured instantly in an in-memory Redis cache and later flushed to PostgreSQL via batched writes.

Furthermore, the system integrates a custom fault-tolerant polling engine and the Google Gemini API to translate raw orbital mechanics into human-readable diagnostic briefs.

---

## ⚡ Key Features & Architecture

* **High-Frequency Ingestion Pipeline:** Utilizes **Redis** as an in-memory buffer to capture high-speed telemetry streams, bypassing standard relational database bottlenecks.
* **Batched Database Writes:** Implements a manual flush mechanism to move cached Redis data into **PostgreSQL** via optimized bulk mappings.
* **Fault-Tolerant Network Polling:** Integrates with the live International Space Station (ISS) API. Includes a custom 15-second circuit-breaker and a simulated payload fail-safe to guarantee dashboard uptime even if the external satellite network collapses.
* **AI Flight Director:** Leverages the **Gemini 2.5 Flash API** to dynamically analyze raw telemetry (altitude, velocity, coordinates) and generate live, actionable diagnostic reports for command staff.
* **Secure Commander Access:** Protected routes using OAuth2 and JWT (JSON Web Tokens) to ensure only authorized personnel can trigger batched writes or AI analysis.
* **Containerized Infrastructure:** The entire database and caching layer is virtualized using **Docker Compose**, ensuring zero-configuration deployment.

---

## 🛠️ Tech Stack

**Frontend Subsystem:**
* React.js (Vite Build System)
* Tailwind CSS (UI/UX Styling)
* Axios (HTTP Client)
* React Query (State & Cache Management)

**Backend Subsystem:**
* Python & FastAPI
* SQLAlchemy (ORM) & Pydantic (Data Validation)
* Google GenAI SDK (`gemini-2.5-flash`)
* PyJWT (Authentication)

**Database & Infrastructure:**
* PostgreSQL (Relational Data)
* Redis (High-Speed Cache)
* Docker Desktop (Container Orchestration)

---

## ⚙️ Local Installation

### Prerequisites
Before you begin, ensure you have the following installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop)
* [Node.js & npm](https://nodejs.org/)
* [Python 3.10+](https://www.python.org/downloads/)

### 1. Clone & Environment Setup
Clone the repository and set up your environment variables.
In the `backend` directory, create a `.env` file:
```env
ADMIN_USERNAME=commander
ADMIN_PASSWORD=deepspace
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Boot the Infrastructure (Docker)
Ensure Docker Desktop is running, then spin up the PostgreSQL and Redis containers:
```bash
docker compose up -d
```

### 3. Ignite the API (Backend)
Navigate to the backend directory, activate your virtual environment, and start the FastAPI server:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Launch the Dashboard (Frontend)
Open a new terminal, navigate to the frontend directory, and start the React app:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 🔄 System Architecture Flow

1. **Ping:** User clicks "Ping Ship". Frontend fetches live ISS data and pushes it to the `POST /telemetry/stream` route.
2. **Buffer:** FastAPI receives the JSON payload and pushes it into the Redis memory list `telemetry_buffer` (Time Complexity: O(1)).
3. **Flush:** User clicks "Flush to Postgres". FastAPI reads the Redis queue, clears it, and executes a `bulk_insert_mappings` command to PostgreSQL.
4. **Analyze:** User clicks "Generate Status Brief". FastAPI pulls the latest coordinates, injects them into a highly specific LLM prompt, and returns the Gemini AI response to the UI.

---

## 📡 Core API Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/login` | Returns JWT Bearer token | No |
| `GET`  | `/live/iss/telemetry` | Fetches live or simulated ISS coordinates | No |
| `POST` | `/telemetry/stream` | Pushes telemetry JSON to Redis buffer | Yes |
| `POST` | `/telemetry/flush` | Batched write from Redis to PostgreSQL | Yes |
| `POST` | `/live/iss/analyze` | Generates AI diagnostic report via Gemini | Yes |
| `GET`  | `/missions` | Retrieves all registered missions | No |
| `POST` | `/missions` | Initializes a new mission | Yes |

---
*Built as a demonstration of high-throughput system design and API fail-safes.*
---
## Contact
**Pradnesh R.**
* Email: pradnesh.r1@gmail.com
* LinkedIn: https://www.linkedin.com/in/pradnesh-r/
