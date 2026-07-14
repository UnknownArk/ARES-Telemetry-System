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
1. `MissionArchive.jsx` sends a public `GET /missions` request to the backend.
2. The backend queries the PostgreSQL database via SQLAlchemy to fetch missions and their associated crew members.
3. Data is returned in JSON format, and the frontend dynamically displays the mission cards.

## 3. Data Flow: Live Telemetry & Redis Buffer

The system must handle high-frequency live telemetry without overwhelming the primary database.
1. The frontend (`LiveTracking.jsx`) polls `GET /live/iss/telemetry` every 5 seconds.
2. The backend fetches raw coordinates from the public **Where The ISS At** API.
3. Simultaneously, any telemetry streamed via `POST /telemetry/stream` (e.g., from a simulation script) is caught by the backend.
4. Instead of writing directly to PostgreSQL, the backend writes to **Redis** (the buffer).
5. An administrator manually flushes the Redis buffer in batches to PostgreSQL via `POST /telemetry/flush`. This prevents write-locking and DB saturation during high-throughput events.

## 4. Authentication Flow

A.R.E.S. uses stateless JWT (JSON Web Tokens) for security.
1. User submits credentials to `POST /login`.
2. Backend verifies credentials against environment variables (or DB in a larger deployment).
3. A JWT token is generated (signed with `SECRET_KEY`) and returned to the client.
4. The client stores the JWT in `localStorage` and attaches it as a Bearer token in the `Authorization` header for all protected requests (e.g., viewing archives, flushing telemetry).

## 5. AI Cache & Rate-Limit Flow

The `POST /live/iss/analyze` endpoint uses Google's Gemini AI to analyze live coordinates and provide a flight director diagnostic. To prevent API abuse and reduce latency:
1. **Rate Limiting**: The backend checks the client's IP address against Redis. It enforces a strict limit (e.g., 3 requests per minute). If exceeded, a `429 Too Many Requests` is returned immediately.
2. **Caching**: If within the rate limit, the backend checks Redis for an existing, unexpired report. If found, the cached report is returned in `O(1)` time.
3. **AI Generation**: If no cache exists, the backend queries the Gemini API. The response is then saved to Redis with a 15-minute expiration time (`TTL`).
4. **UI Integration**: The frontend checks the `cached` boolean flag in the response payload and displays a visual `CACHED` badge when applicable.
