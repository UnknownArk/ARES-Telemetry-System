# A.R.E.S. System Architecture

This document outlines the architecture, data flows, and security measures of the A.R.E.S. Telemetry System.

## 1. High-Level Architecture

The A.R.E.S. platform is a containerized web application comprising four main services:

- **Frontend (`ares_frontend`)**: React + Vite SPA, utilizing Tailwind CSS for styling and Three.js (via React Globe) for 3D visualization.
- **Backend (`ares_backend`)**: FastAPI application providing RESTful endpoints, database orchestration, and AI integrations.
- **Database (`ares_postgres`)**: PostgreSQL database storing historical mission logs and crew manifests.
- **Cache (`ares_redis`)**: Redis cache used for rapid telemetry buffering, rate-limiting, and AI report caching.

## 2. Request Flow: Mission Archive

When a user views historical missions on the frontend:
1. The PostgreSQL database is populated via the `backend/import_missions.py` script, which syncs real mission data from the public Launch Library API.
2. `MissionArchive.jsx` sends a public `GET /missions` request with query filters (`search`, `status`, `agency`, `year`) to the backend.
3. The backend queries the PostgreSQL database via SQLAlchemy to fetch the filtered missions.
4. Data is returned in JSON format, and the frontend dynamically displays the mission cards with imagery and metadata.

## 3. Data Flow: Live Telemetry & Redis Buffer

The system must handle high-frequency live telemetry without overwhelming the primary database.
1. The frontend (`LiveTracking.jsx`) polls `GET /live/iss/telemetry` every 5 seconds.
2. The backend fetches raw coordinates from the public **Where The ISS At** API.
3. Simultaneously, any telemetry streamed via `POST /telemetry/stream` (e.g., from a simulation script or the Auto-Fire UI) is caught by the backend.
4. Instead of writing directly to PostgreSQL, the backend pushes payloads into a **Redis List** (`telemetry_buffer`) using `O(1)` list appends.
5. The backend runs an `asyncio.to_thread` **Background Worker** that wakes up every 5 seconds. It safely reads all records from Redis using `lrange`, summarizes them by anomaly labels (Warning/Critical statuses), calculates a primary risk factor, executes an optimized SQLAlchemy insert into PostgreSQL, and then removes the processed records using `ltrim`. This decoupling prevents write-locking and DB saturation during high-throughput events.
6. The background worker immediately broadcasts the Mission Health Summary and live throughput metrics back to the frontend via **WebSockets**, creating a seamless, real-time dashboard without polling overhead.

## 4. Authentication Flow

A.R.E.S. uses stateless JWT (JSON Web Tokens) for security.
1. User submits credentials to `POST /login`.
2. Backend verifies credentials against environment variables (or DB in a larger deployment).
3. A JWT token is generated (signed with `SECRET_KEY`) and returned to the client.
4. The client stores the JWT in `localStorage` and attaches it as a Bearer token in the `Authorization` header for all protected requests (e.g., flushing telemetry, modifying databases).

*(Note: The live telemetry WebSocket broadcast is intentionally left unauthenticated so public dashboard clients can view aggregated health metrics. Only commands that mutate data, like the telemetry ingestion and manual flushes, are protected).*

## 5. AI Cache & Rate-Limit Flow

The `POST /live/iss/analyze` endpoint uses Google's Gemini Flash AI to analyze live coordinates and provide a flight director diagnostic. To prevent API abuse and reduce latency:
1. **Rate Limiting**: The backend checks the client's IP address against Redis. It enforces a strict limit (e.g., 3 requests per minute). If exceeded, a `429 Too Many Requests` is returned immediately.
2. **Caching**: If within the rate limit, the backend checks Redis for an existing, unexpired report. If found, the cached report is returned in `O(1)` time.
3. **AI Generation**: If no cache exists, the backend queries the Gemini API. The response is then saved to Redis with a 15-minute expiration time (`TTL`).
4. **UI Integration**: The frontend checks the `cached` boolean flag in the response payload and displays a visual `CACHED` badge when applicable.

## 5. Deployment Architecture

A.R.E.S. is designed for easy deployment to cloud infrastructure:
1. **AWS EC2:** Deployed on an Ubuntu server (t3.micro/t2.micro) with an allocated Elastic IP.
2. **Docker Compose:** The entire stack is defined in docker-compose.yml, which provisions the network, spins up the Nginx frontend (port 80), FastAPI backend (port 8000), PostgreSQL (port 5432), and Redis (port 6379) containers.
3. **Network Security:** AWS Security Groups are configured to only allow inbound HTTP (80), HTTPS (443), Custom TCP (8000 for the backend API), and SSH (22) traffic from specified sources.
4. **Environment Variables:** Credentials, API keys (Gemini), and the backend URL (VITE_API_URL) are injected via .env files and Docker build arguments at runtime.

