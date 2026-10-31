# MindGuard AI
### AI-Powered Burnout and Overwork Pattern Detection Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Styles-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/ML-Isolation%20Forest-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20%2B%20SQLAlchemy-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Pytest](https://img.shields.io/badge/Testing-Pytest%2014%2F14%20Passed-0A9EDC.svg?logo=pytest&logoColor=white)](https://pytest.org)

---

## 1. Product Vision & Principle

**MindGuard AI** is an enterprise digital wellbeing platform that identifies sustained work patterns potentially associated with overwork and declining productivity. The platform evaluates multi-day behavioral telemetry, detects unusual statistical divergences using machine learning, computes an explainable wellbeing risk indicator, and recommends supportive organizational interventions.

> **Core Product Principle:**  
> *"We don't measure how hard an employee works. We identify when their working patterns may be becoming unhealthy."*

### Key Overwork Patterns Detected
- **Sustained Extended Workdays:** Working 12–14 hours repeatedly across weeks.
- **Late-Night Work Frequency:** Increasing activity past 9 PM disrupting circadian recovery.
- **Break Deprivation:** Significant decline in recorded replenishment breaks.
- **Diminishing Returns:** Rising working hours accompanied by dropping task completion.
- **Weekend Encroachment:** Repeated weekend work eroding weekly recovery buffers.
- **Limited Recovery Intervals:** Sub-11-hour gaps between consecutive daily work sessions.

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React icons.
- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2, Pandas, NumPy.
- **Machine Learning:** Scikit-learn (Isolation Forest unsupervised anomaly detection with 100 estimators).
- **Risk Engine:** Transparent, configurable rule-based scoring engine (0–100 scale).
- **Database:** SQLite with SQLAlchemy ORM (persistent storage for employees, daily records, assessments, alerts, and audit history).
- **Testing:** Pytest with FastAPI TestClient (14 automated test suites covering ML, API, data generator, and risk engine).

---

## 3. Core Features

### Feature 1: Synthetic Employee Data Generator
- Produces realistic synthetic workforce telemetry (100 employees, 30 days of records = 3,000 daily observations).
- Generates work start/end times, daily hours, breaks count, break duration, late-night flags, weekend work, tasks completed, task completion trend, and recovery hours.
- Includes three benchmark demonstration profiles:
  - **Profile A (EMP-001): Healthy Pattern** — 7.5–8.5 hours/day, 3–4 breaks, 0 late nights, stable task completion (+4%).
  - **Profile B (EMP-002): Occasional Overtime** — 9–10 hours/day occasionally, 2–3 breaks, 1–2 late nights/week, stable throughput.
  - **Profile C (EMP-003): Sustained Overwork** — 12–14 hours/day repeatedly, 0–1 break, 5+ late nights/week, weekend shifts, task completion drop (-35%).
- Includes on-demand dataset regeneration via `POST /api/data/generate`.

### Feature 2: Machine Learning Anomaly Detection
- Implements an unsupervised **Scikit-learn Isolation Forest** (`n_estimators=100`, `contamination=0.12`, `random_state=42`).
- Extracts 10 behavioral dimensions per employee window:
  - 7-day and 14-day rolling average hours.
  - Baseline hours ratio.
  - 14-day late-night session count.
  - 14-day weekend workdays count.
  - 7-day average break count and average break duration.
  - Task completion change ratio (recent vs earlier baseline).
  - Consecutive extended workdays (>10h).
  - 7-day average recovery hours between shifts.
- Distinct separation: Isolation Forest flags mathematical outlier patterns; it does not claim to diagnose burnout.

### Feature 3: Explainable Wellbeing Risk Engine
- Transparent scoring rubric combining sustained behavioral factors (0–100 scale):
  - Sustained extended working hours: up to 25 points.
  - Repeated late-night activity: up to 20 points.
  - Declining task completion vs rising hours: up to 25 points.
  - Reduced recorded breaks: up to 15 points.
  - Repeated weekend work: up to 15 points.
  - ML anomaly modifier: up to 5 points (reinforcing evidence only).
- Risk Categories:
  - `0–29`: Low concern
  - `30–59`: Moderate concern
  - `60–79`: Elevated concern
  - `80–100`: High priority for human review
- Returns plain-language HR summaries, supporting observations, and actionable organizational recommendations.

### Feature 4: Overview Dashboard
- Executive KPI summary cards (Total Employees, Requiring Review, Sustained >10h, Avg Daily Hours, Open Alerts, Mean Risk Index).
- Interactive Recharts:
  1. Average Daily Working Hours Over Time (Line Chart).
  2. Wellbeing Risk Distribution (Donut Chart).
  3. Work Hours vs Task Completion Correlation (Dual-Axis Composed Chart).
  4. Late-Night Work Frequency Trends (Bar Chart).
- Filters by Department (Engineering, Product, Design, Sales, etc.) and Date Window (7d, 14d, 30d).

### Feature 5: Employee Insights & Wellbeing Alerts
- Searchable, sortable, filterable table across all 100 simulated employees.
- Deep Employee Profile modal displaying 30-day timeline charts, breakdown of contributing factors, supporting observations, and organizational next steps.
- Wellbeing Alert review queue:
  - Automatic generation for elevated risk (Score &ge; 60).
  - Status management (Open &rarr; Under Review &rarr; Follow-up Scheduled &rarr; Resolved).
  - Reviewer notes logging and follow-up date tracking.
  - Persistent SQLite review audit trail (`AlertReviewHistory`).

### Feature 6: Interactive Simulation Playground (Hackathon Showcase)
- Live interactive sandbox for judges to simulate custom workload patterns.
- Controls:
  - Daily working hours (4.0 to 16.0h).
  - Recorded breaks (0 to 6 breaks/day).
  - Break duration (5 to 45 mins).
  - Late-night sessions (0 to 7 nights/week).
  - Weekend work frequency (0 to 8 days/month).
  - Task completion trend (-50% to +50%).
  - Consecutive extended days (0 to 14 days).
  - Observation window (7 to 30 days).
- Three 1-click presets: *Healthy Working Pattern*, *Increasing Workload*, *Sustained Overwork Pattern*.
- Prominent **"Run AI Analysis"** button calls FastAPI `POST /api/simulation/run` to perform real Isolation Forest inference and risk engine breakdown dynamically.
- Side-by-side comparison table between Healthy Standard Baseline vs Configured Scenario vs Observed Variance.

### Feature 7: Privacy & Responsible AI Safeguards
- Non-surveillance pledge documented in-app:
  - No keystroke monitoring or logging.
  - No desktop screen captures or webcam recording.
  - No inspection of private emails, messages, or chats.
  - No personal web browsing tracking.
  - Non-diagnostic safeguard: does not claim clinical or medical diagnoses.
  - Zero automated disciplinary or punitive employment decisions.
- Configurable risk threshold weights saved directly to the database.

---

## 4. Setup and Installation

### Prerequisites
- Python 3.11+ (Python 3.12 or 3.14 recommended)
- Node.js 18+ and npm

### Step 1: Clone or Navigate to the Project Folder
```bash
cd "c:\Users\hrida\OneDrive\Documents\Hackathon"
```

### Step 2: Backend Setup
```bash
# Verify or install backend dependencies
pip install -r backend/requirements.txt
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 5. Running the Application

### Option A: 1-Click Launchers
- **PowerShell:**
  ```powershell
  .\run_dev.ps1
  ```
- **Windows Command Prompt:**
  ```cmd
  run_dev.bat
  ```

### Option B: Manual Execution in Two Terminals

**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Access URLs
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 6. Running Automated Tests

Run the full Pytest test suite:
```bash
python -m pytest backend/tests -v
```

**Test Coverage (14 of 14 passed):**
- `backend/tests/test_anomaly_detector.py` — Isolation Forest training, fit validation, outlier scoring, and uncalibrated fallback.
- `backend/tests/test_risk_engine.py` — Transparent rule calculation for healthy baseline vs severe sustained overwork scenarios.
- `backend/tests/test_data_generator.py` — 100-employee / 3,000-record generator integrity and demonstration profile invariants.
- `backend/tests/test_api.py` — Health, dashboard summary, employee listing, detailed profile, simulation execution, alert review lifecycle, and audit trail persistence.

---

## 7. Live Demonstration Guide for Judges

1. **Open the Dashboard (`http://localhost:5173`):**
   - Point out the product principle: *"We don't measure how hard an employee works. We identify when their working patterns may be becoming unhealthy."*
   - Observe the top summary cards and responsive Recharts trends.
2. **Demonstrate the Three Benchmark Profiles:**
   - Click **"Profile A: Healthy"** in the top banner: observe ~8h/day, 3 breaks, 0 late nights, Low Concern (Score 0).
   - Click **"Profile B: Overtime"**: observe ~9.5h/day, occasional late night, Low Concern (Score 13).
   - Click **"Profile C: Overwork"**: observe ~13.5h/day, 1 break, 5+ late nights, declining tasks (-35%), Elevated Concern (Score 72.5), and ML Anomaly flag.
3. **Open the Simulation Playground (`Tab: Simulation Playground`):**
   - Select the **"Healthy Working Pattern"** preset and click **"Run AI Analysis"**.
   - Select the **"Sustained Overwork Pattern"** preset and click **"Run AI Analysis"**.
   - Adjust individual sliders (e.g. increase late nights to 6/week, decrease breaks to 0) and click **"Run AI Analysis"** to demonstrate live backend model inference and dynamic chart rendering.
4. **Inspect Alert Management (`Tab: Wellbeing Alerts`):**
   - Click **"Manage & Review"** on any alert.
   - Transition status to *Under Review*, add a contextual reviewer note (e.g., *"Scheduled 1:1 check-in to adjust milestone deadlines"*), and save.
   - Reopen to show the persistent audit history saved in SQLite.
5. **Review Privacy & Ethical Safeguards (`Tab: Privacy & Settings`):**
   - Review the non-surveillance checklist (no keystrokes, no screen grabs, non-diagnostic).
   - Demonstrate the configurable scoring weights.

---

## 8. Definition of Done Checklist

- [x] Frontend starts successfully.
- [x] Backend starts successfully.
- [x] Database initializes correctly.
- [x] Synthetic employee data is generated (100 employees, 3,000 records).
- [x] Isolation Forest is implemented and callable.
- [x] Risk scoring uses real scenario data.
- [x] Risk explanations reflect actual contributing factors.
- [x] Dashboard statistics come from the backend.
- [x] Employee profiles display historical trends.
- [x] Charts display actual application data.
- [x] Simulation controls affect backend analysis.
- [x] Recommendations respond to observed patterns.
- [x] Alerts can be reviewed and updated.
- [x] Changes persist in the database.
- [x] API validation and error handling work.
- [x] Core automated tests pass (14/14 tests passing).
- [x] Privacy safeguards are documented.
- [x] Setup instructions are complete.
- [x] The hackathon demonstration works end to end.
