# A.R.E.S. Architecture & Design Decisions

*This document outlines the core engineering trade-offs and architectural decisions made while building the A.R.E.S. Telemetry System.*

## 1. The Core Problem & Data Flow
**The Problem:** Traditional REST APIs that perform direct CRUD (Create, Read, Update, Delete) database operations work well for most apps, but they collapse under high-frequency writes. If a satellite streams hundreds of telemetry metrics per second, doing an `INSERT` statement for every metric causes database lock contention and massive performance degradation.

**The Solution (Data Flow):**
1. **Stream:** Clients stream high-frequency data to a FastAPI endpoint.
2. **Buffer:** Instead of writing to Postgres, FastAPI pushes the data directly into a **Redis List** (`telemetry_buffer`) using an O(1) append operation. 
3. **Flush:** An administrator securely triggers a "flush". FastAPI pulls everything out of Redis and executes an **optimized bulk insert** into Postgres in a single transaction.

*Why this architecture:* It demonstrates a scalable decoupling layer frequently used in production systems to mitigate database locking under extreme write loads.

## 2. Why Redis?
- **Speed & In-Memory:** Redis stores data in RAM, making it incredibly fast for rapid appends (O(1) time complexity for lists).
- **Rate Limiting & Caching:** We also use Redis to cache the expensive AI reports (saving API credits) and to enforce strict IP-based rate limiting on the public endpoints.

## 3. Why Postgres?
- **Durability & Relational Integrity:** While Redis is great for volatile, high-speed data, Postgres provides ACID compliance.
- **Relational Schema:** Our Mission Archive is highly relational. A `Mission` belongs to a `Spacecraft`, which belongs to an `Agency`, and has a crew of `Scientists`. Postgres enforces these foreign keys and handles complex cascade deletes seamlessly.

## 4. Why JWT (JSON Web Tokens)?
- **Stateless Auth:** We use JWT to protect admin-only endpoints (like flushing the buffer or modifying mission data). Because JWTs are stateless, the backend doesn't need to look up a session in the database for every request.
- **Role-Based Access Control:** The token contains claims that verify the user is an authorized commander, keeping public endpoints (like viewing the archive) open while locking down mutations.

## 5. What Do The CI/Tests Check?
- **Pytest:** The backend has a robust test suite that validates:
  - Database queries and advanced filters (Search, Status, Agency, Year).
  - The JWT authentication layer (ensuring protected endpoints return `401 Unauthorized` without a token).
  - Buffer state monitoring and correct parsing of simulated JSON data during flushes.
  - Compilation integrity of helper scripts (like `import_missions.py`).
- *Impact:* This proves the system is not only functionally complete but also operationally resilient against regressions.

## 6. Known Limitations & Roadmap
As the system evolves, the following architectural upgrades are recommended:
1. **Alembic Migrations:** Currently, schema changes require dropping the tables. Adding Alembic would allow for stateful database evolution (useful for CI/CD).
2. **Frontend Code-Splitting:** The 3D React Globe and Three.js bundle is heavy. Lazy loading those components would drastically improve the initial Time-to-Interactive (TTI).
3. **Scalable Stream Processing:** Replacing the simple Redis List with Redis Streams (or Kafka) for consumer-group fanout if we had multiple backend workers processing the telemetry simultaneously.
