# Sisyphus backend

FastAPI + SQLite + scikit-learn backend for **Sisyphus**, a workplace behavioural analytics and digital wellbeing demo. It generates a synthetic workforce, engineers behavioural features, flags unusual patterns with an Isolation Forest, scores explainable behavioural indicators with transparent rules, forecasts the next seven days and serves everything to the existing React frontend.

> **Not a diagnostic tool.** Sisyphus identifies work patterns that may warrant a supportive check-in. It does not diagnose burnout, depression, anxiety or any other condition. All data is synthetic. Indicator thresholds are demonstration assumptions, not validated medical or psychological cut-offs.

## Quick start

```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

python -m app.data.generator        # 100 employees × 60 days → dataset/*.csv
python -m app.database.init_db      # create SQLite tables
python -m app.data.seed_database    # load CSVs (safe to repeat, no duplicates)
python -m app.ml.train              # features → Isolation Forest → models/
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/

The repository already contains a generated dataset and a trained model, so `uvicorn` works straight after `pip install`. On start-up the API creates missing tables, seeds an empty database from the CSVs, and retrains the model if it is missing or was trained with a different backend. Set `SISYPHUS_AUTO_BOOTSTRAP=false` to disable this.

Run the tests:

```bash
python -m pytest -q
```

Tests use their own temporary dataset, database and model, so they never touch your local files.

### Connect the frontend

In the frontend folder (one level up), create `.env.local`:

```
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000
```

Then run `npm run dev`. The top bar badge changes from **Simulated data** to **Live API**. Remove the file, or set `VITE_USE_MOCK_DATA=true`, to go back to the in-browser mock data.

## Architecture

```
React (src/services/api.js) ── Axios ──► FastAPI routes ──► AnalyticsEngine ──► SQLite
                                                  │
                         ┌────────────────────────┼─────────────────────────┐
                 feature_engineering      risk_engine (rules)       anomaly_detector (IsolationForest)
                 trend_analyzer           recommendation            forecaster (7-day Holt model)
                 insight_engine
```

| Folder | What it does |
| --- | --- |
| `app/core/config.py` | Paths, seed, CORS, model features, **configurable indicator rules** |
| `app/data/generator.py` | Synthetic workforce and daily activity (fixed seed) |
| `app/data/seed_database.py` | CSV → SQLite upsert (idempotent) |
| `app/database/` | Engine and sessions, models, table creation |
| `app/ml/feature_engineering.py` | Rolling per-employee features and personal baselines |
| `app/ml/anomaly_detector.py` | Imputer → scaler → IsolationForest; save, load, predict |
| `app/ml/train.py` | Reproducible training with held-out evaluation report |
| `app/ml/forecaster.py` | 7-day forecast used by the frontend's forecast page |
| `app/services/risk_engine.py` | Rule-based indicator score with per-factor explanations |
| `app/services/recommendation.py` | Supportive recommendations from detected factors |
| `app/services/trend_analyzer.py` | Period summaries and trend series |
| `app/services/insight_engine.py` | Plain-language observations for the Insights page |
| `app/services/analysis_service.py` | The analysis workflow and every frontend payload |
| `app/routes/` | `employees.py`, `analytics.py`, `simulation.py` |
| `app/schemas/` | Pydantic request and response models |
| `tests/` | 39 pytest tests, including a frontend contract test |

More detail is in [BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md).

## Synthetic data

`python -m app.data.generator [--employees 100] [--days 60] [--seed 42]`

| File | Contents |
| --- | --- |
| `dataset/employees.csv` | `employee_id, name, department, designation, work_arrangement, shift_type, expected_hours, working_days, start_date` |
| `dataset/employee_activity.csv` | One row per employee per day: login/logout datetimes, hours, breaks, late-night sessions, rest-day work, tasks, productivity, meetings, overtime, schedule, leave, `data_completeness` |
| `dataset/employee_features.csv` | Engineered features for every employee and day |
| `dataset/simulation_labels.csv` | **Ground truth only**: simulation group and ramp start. Never a model input or API field |

- 100 employees in 6 departments. Simulation groups: 60 healthy, 25 occasional overtime, 15 sustained overwork.
- The default is **60 days** (5,898 records), because the frontend compares the latest 30 days with the previous 30 (its September baseline and 30-day Trends view). `--days 30` produces exactly **3,000 records**, and every endpoint still works.
- Schedules vary: day, late and night shifts, 7.5 or 8 contracted hours, and Mon–Fri or Tue–Sat weeks. Planned leave, two recent joiners and tracking gaps are included: about 1.4% of days are missing and about 3% partial. Missing values stay empty and are never written as 0.
- Sustained-overwork employees start normal, then ramp up over 2–3 weeks: longer days, fewer breaks, more late-night and weekend work, and (for about 80% of them) lower productivity.
- Login, breaks, work time and logout are generated in whole minutes and always agree.

## Features (`app/ml/feature_engineering.py`)

A **workday** is a scheduled day, not on leave, with recorded hours. Windows end on the as-of date.

| Feature | Calculation |
| --- | --- |
| `avg_hours_7d` / `avg_hours_30d` | Mean workday hours over the last 7 / 30 days (needs 3 / 7 workdays) |
| `hours_vs_expected_7d` | `avg_hours_7d` − contracted `expected_hours` |
| `avg_breaks_7d` | Mean break count on workdays with a known count |
| `avg_break_duration_7d` | Mean `average_break_minutes` on workdays with breaks |
| `avg_overtime_7d` | Mean hours beyond expected on workdays |
| `night_sessions_7d` | Sessions after 21:00 (day shift) or 23:30 (late shift). Scheduled night-shift hours never count |
| `weekend_days_14d` | Non-scheduled days with recorded work in 14 days (needs 10 observed days) |
| `productivity_change` | % change of mean productivity, last 7 days vs the 7 before (3 values each side) |
| `task_completion_rate` | Tasks completed / assigned over 7 days |
| `work_variability_7d` | Std-dev of workday hours (needs 3) |
| `meeting_hours_7d` | Meeting minutes / 60 over 7 days |
| `consecutive_overtime_days` | Latest run of workdays with ≥ 0.5 h overtime. Stops at an unknown day |
| `consecutive_workdays` | Latest run of calendar days with recorded work |

The personal baseline is the previous 30-day period (`baseline_hours`, `baseline_breaks`, …). A snapshot counts as **sufficient** with ≥ 14 observed days of history and ≥ 3 workdays in the last 7. Insufficient snapshots are excluded from training and return `insufficient_data` from the API.

## Machine learning: Isolation Forest

`python -m app.ml.train`

- **Inputs:** the 10 behavioural features in `config.MODEL_FEATURES`. No IDs, names, dates, departments or labels.
- **Pipeline:** `SimpleImputer(median)` → `StandardScaler` → `IsolationForest(n_estimators=300, contamination=0.05, random_state=42)`.
- **Training baseline:** snapshots from the first half of the window (Sep 1–30), before most overwork ramps begin.
- **Evaluation:** a 70/30 split by employee, so test employees are never seen in training. Their snapshots from the last 7 days are compared with the synthetic labels. The positive label is "sustained-overwork employee, at least 14 days into their ramp".
- **Saved:** `models/isolation_forest.pkl` (pipeline, feature order, reference statistics, metadata) and `models/evaluation_report.json`.
- **Output:** `prediction` (−1 unusual, 1 not flagged), `anomalyScore` (> 0 means flagged), `rawScore`, and `drivers`: the features furthest from the training median, as a guide rather than a causal explanation.

Result of the run committed in this repository:

| Metric | Value |
| --- | --- |
| Held-out snapshots | 206 (30 employees), 32 positives |
| Precision / recall / F1 | 0.711 / 1.000 / 0.831 |
| ROC AUC | 0.982 |
| Flag rate: healthy / occasional overtime / sustained overwork | 0% / 32% / 100% |

These numbers show how separable the *simulated* groups are. They do not measure real-world accuracy. The committed model was trained with the dependency-free Isolation Forest in `app/ml/_pure_iforest.py`, because scikit-learn could not be installed in the build environment. When you run `python -m app.ml.train` with the packages from `requirements.txt`, scikit-learn's IsolationForest is used and the metrics will differ slightly. The API also retrains automatically at start-up if the saved model's backend doesn't match.

## Behavioural indicator engine (rules)

Separate from the ML model. The anomaly prediction is **never** converted into a score. Rules live in `config.IndicatorRules` and can be changed there.

| Factor | Points | Rule (personal baseline = previous 30 days) |
| --- | --- | --- |
| Extended working hours | +25 | ≥ 1.5 h/day above contracted hours **and** ≥ 0.75 h above baseline, or ≥ 2.5 h above contracted hours |
| Low recorded break frequency | +15 | < 2 breaks per workday, or ≥ 1 fewer than baseline while below 3 |
| Increased late-night activity | +20 | ≥ 2 late sessions in 7 days and ≥ 1 above baseline |
| Significant productivity decline | +25 | ≥ 10% below baseline (or the previous week if no baseline exists) |
| Increased weekend activity | +15 | ≥ 2 non-scheduled days worked in 14 days and ≥ 1 above baseline |

Levels: **Low** 0–29, **Moderate** 30–59, **Elevated** 60–100. A factor with missing data is reported as `unknown` and adds no points. If more than two factors are unknown, or history is insufficient, the result is `insufficient_data` with no score. Missing data is never treated as a healthy pattern.

## API

All data endpoints return `{ "data": ..., "meta": {...} }`, which the frontend's `unwrap()` reads. Errors return `{ "detail": "..." }` with a suitable status code (404 unknown employee, 422 invalid input, 400 inconsistent dates).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Health: database counts, model status |
| GET | `/employees` | `search` (or `q`), `department`, `level`, `page`, `page_size` (default 100, max 500) |
| GET | `/employees/{id}` | Profile, factors, recommendations, insights, anomaly result |
| GET | `/employees/{id}/history` | `start`, `end` (YYYY-MM-DD). Default: the last 30 days |
| GET | `/employees/{id}/forecast` | 7-day forecast |
| POST | `/analyze/{id}` | Full workflow; **saves an assessment** |
| GET | `/assessments/{id}` | Saved assessments, newest first (`limit`) |
| GET | `/analytics/overview` | KPIs, weekly hours, distribution, departments, insights, check-ins |
| GET | `/analytics/insights` | `type`, `severity`, `department` filters |
| GET | `/analytics/trends` | `range=7` or `30` |
| GET | `/analytics/departments` | Department summaries |
| GET | `/analytics/forecast` | Organisation 7-day forecast |
| GET | `/analytics/model` | Model status and evaluation report |
| POST | `/simulate` | Hypothetical scoring; never stored |
| GET | `/simulate/rules` | The rule table used by `/simulate` and `/analyze` |

### Example: simulate

```bash
curl -X POST localhost:8000/simulate -H 'Content-Type: application/json' \
  -d '{"working_hours":10.5,"break_count":1,"night_sessions":4,"weekend_days":3,"productivity_change":-15}'
```

The endpoint accepts the snake_case names above or the frontend's slider keys (`avgWorkingHours`, `dailyBreaks`, `lateNightSessions`, `weekendDays`, `productivityChange`). `weekend_days` is non-scheduled days worked per week. Abridged response:

```json
{
  "data": {
    "indicator_score": 100,
    "indicator_level": "Elevated",
    "is_simulation": true,
    "contributing_factors": [
      {
        "factor": "Extended working hours",
        "contribution": 25,
        "observed_value": 10.5,
        "explanation": "10.5 h/day is 2.5 h above the contracted 8 h, a sustained long-hours pattern."
      }
    ],
    "recommendations": [
      { "key": "avgWorkingHours", "recommendation": "Review workload distribution and task allocation." }
    ],
    "score": 100, "level": "elevated", "levelLabel": "Elevated", "factors": ["…all five factors…"],
    "summary": "Several behaviours in this hypothetical scenario differ from the expected pattern…",
    "thresholds": { "moderate": 30, "elevated": 60 }
  },
  "meta": { "isSimulation": true, "simulated": true, "source": "api" }
}
```

### Example: analyze

```bash
curl -X POST localhost:8000/analyze/MG-1003
```

```json
{
  "data": {
    "status": "completed",
    "employee_id": "MG-1003",
    "data_sufficiency": "sufficient",
    "anomaly_detected": true,
    "anomaly_score": 0.167,
    "indicator_score": 100,
    "indicator_level": "Elevated",
    "explanation": "Several behaviours in the recent pattern differ from the expected pattern, mainly extended working hours and significant productivity decline. … The anomaly model flagged this pattern as unusual compared with the training baseline.",
    "recommendations": ["…"],
    "assessment_id": 1
  }
}
```

For an employee with too little history, `status` and `data_sufficiency` are `insufficient_data`, `indicator_score` is `null`, and the recommendation is to collect more data.

## Limitations

- All data is synthetic, and its patterns were designed by us. Results show the pipeline working, not real-world validity.
- Consecutive daily snapshots of one person are highly correlated, so the effective sample size is much smaller than the row count.
- Thresholds and weights are illustrative. Real use would need validation with occupational health experts, employee consent, transparency and data-protection review.
- Context such as deadlines, role changes and agreed overtime is not modelled.
- SQLite and an in-process cache suit a single-instance demo. Reseeding or retraining requires an API restart.
