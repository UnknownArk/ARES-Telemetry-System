# Space Command Dashboard

A full-stack mission control center built to track spacecraft, manage flight crews, and stream live, simulated telemetry data. This project demonstrates a complete end-to-end architecture, from structuring a secure relational database to building a Python REST API and designing a React interface for real-time state management.

## Tech Stack
* **Frontend:** React.js, Vite, Axios
* **Backend:** Python, FastAPI, Uvicorn
* **Database:** MySQL

## Core Features
* **Live Telemetry Stream:** Simulates real-time sensor readings (Fuel, Velocity, Oxygen), calculates danger levels on the backend, and streams them to a React interface.
* **Mission Control:** Full CRUD functionality to launch new missions, update active targets, and delete aborted flights.
* **Crew Manifest:** Assign scientists and specialists to specific missions, demonstrating complex parent-child database relationships.
* **Data Integrity:** Engineered with strict MySQL relational constraints and robust backend error handling to ensure database stability.

---

## System Architecture & Data Flow

### 1. Database Entity-Relationship Diagram (ERD)
The database enforces strict relational integrity. Both telemetry logs and scientists are tied to active missions via Foreign Key constraints.

```mermaid
erDiagram
    MISSIONS {
        int id PK
        varchar name
        varchar target_destination
        date launch_date
    }
    TELEMETRY_LOGS {
        int id PK
        int mission_id FK
        varchar parameter_name
        float parameter_value
        varchar status_level
        datetime timestamp
    }
    SCIENTISTS {
        int id PK
        int mission_id FK
        varchar full_name
        varchar specialty
        varchar clearance_level
    }
    
    MISSIONS ||--o{ TELEMETRY_LOGS : "generates"
    MISSIONS ||--o{ SCIENTISTS : "employs"
```

### 2. Live Telemetry Data Flow
This sequence demonstrates how the application handles real-time sensor simulation and state updates across different network ports.

```mermaid
sequenceDiagram
    participant User
    participant React as React Frontend
    participant API as FastAPI Backend
    participant DB as MySQL Database

    User->>React: Clicks "Ping Ship"
    React->>API: POST /missions/{id}/telemetry/simulate
    Note over API: Engine generates random sensor data<br/>and calculates danger status.
    API->>DB: INSERT INTO telemetry_logs
    DB-->>API: Row Created
    API-->>React: 200 OK (Simulation Complete)
    
    React->>API: GET /missions/{id}/telemetry
    API->>DB: SELECT TOP 10 Logs (ORDER BY DESC)
    DB-->>API: Raw SQL Data
    API-->>React: JSON Array
    React-->>User: UI updates dark-mode panel instantly
```

---

## Local Setup Instructions

### 1. Database Configuration
1. Ensure MySQL is installed and running locally.
2. Create a new database named `space_exploration`.
3. Execute the SQL commands to create the `missions`, `telemetry_logs`, and `scientists` tables.
4. Update `database.py` with your local MySQL username and password.

### 2. Backend Initialization
1. Open a terminal in the backend directory.
2. Install dependencies: 
   ```bash
   pip install fastapi uvicorn mysql-connector-python pydantic
   ```
3. Start the server: 
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Initialization
1. Open a new terminal in the frontend directory.
2. Install dependencies: 
   ```bash
   npm install
   ```
3. Run the development server: 
   ```bash
   npm run dev
   ```
4. Open the provided localhost URL in your browser.

---
## Contact
**Pradnesh R.**
* Email: pradnesh.r1@gmail.com
* LinkedIn: https://www.linkedin.com/pradnesh-r/