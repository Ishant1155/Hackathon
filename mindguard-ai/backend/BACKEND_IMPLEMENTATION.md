# Backend implementation notes

## 1. What I inspected in the frontend

The React app (`../src`) already had a complete service layer in `src/services/api.js` with a `USE_MOCK_DATA` switch and an in-browser mock backend (`src/services/mockBackend.js`). The mock backend is the source of truth for response shapes. I captured its real output for every service function into `tests/fixtures/frontend_contract.json`, and `tests/test_api.py::test_frontend_contract` checks that the API returns every field the pages read.

| Frontend function | Used by | Endpoint |
| --- | --- | --- |
| `getOverview()` | Overview, Reports | `GET /analytics/overview` |
| `getEmployees()` | Employees, search | `GET /employees` |
| `getEmployeeById(id)` | Employee profile | `GET /employees/{id}` |
| `getEmployeeHistory(id)` | Employee profile charts | `GET /employees/{id}/history` |
| `getEmployeeForecast(id)` | Employee profile forecast | `GET /employees/{id}/forecast` |
| `getInsights()` | Insights, Reports, search | `GET /analytics/insights` |
| `getTrends({range})` | Trends, Reports | `GET /analytics/trends?range=7\|30` |
| `getForecast()` | Home, 7-Day Forecast, Overview, search | `GET /analytics/forecast` |
| `simulateScenario(payload)` | Simulation Lab | `POST /simulate` |
| `getReportSummary()` | Reports | composed client-side from the three above |
| `getDepartments()` *(new)* | available to pages | `GET /analytics/departments` |
| `analyzeEmployee(id)` *(new)* | Employee profile "AI pattern check" | `POST /analyze/{id}` |
| `getAssessments(id)` *(new)* | available to pages | `GET /assessments/{id}` |

Features the brief did not mention but the frontend needed, so the backend provides them: the 7-day forecast endpoints (organisation and per employee), the `{data, meta}` envelope with `meta.period` and `meta.thresholds`, insight objects with comparison periods and suggestions, weekly buckets, and the Simulation Lab's camelCase slider keys.

## 2. Data flow

```
generator.py ──► dataset/*.csv ──► seed_database.py ──► SQLite (employees, daily_activity, simulation_labels)
                       │                                         │
                       └──► train.py ──► feature_engineering ──► IsolationForest ──► models/isolation_forest.pkl
                                                                                       │
FastAPI request ──► routes ──► get_engine(db) ──► AnalyticsEngine (built once from SQLite + model)
                                     ├── features ──► risk_engine ──► recommendation
                                     ├── anomaly_detector.predict
                                     ├── trend_analyzer / insight_engine
                                     └── forecaster
POST /analyze ──► engine.analyze() ──► assessments table
POST /simulate ──► risk_engine.evaluate_scenario() (no database access)
```

`AnalyticsEngine` loads all employees and activity once per process. For 100 people × 60 days that takes about 0.3 s, and responses then come from memory. After reseeding or retraining, restart the API (or call `reset_engine()`).

## 3. Module responsibilities

- **`core/config.py`**: every tunable value, including the `IndicatorRules` dataclass (points, thresholds, levels, reference schedule) and `MODEL_FEATURES`. It reads optional `backend/.env` without extra dependencies.
- **`data/generator.py`**: three hidden behaviour profiles per group. Group sizes are fixed (60/25/15) and the shuffle is seeded. Missing data is injected as `None`. Labels are written to their own CSV.
- **`ml/feature_engineering.py`**: `EmployeeTimeline` windows by calendar date per employee. Missing values are skipped, not zeroed. The personal baseline is the previous 30 days. `data_sufficiency` gates training and scoring.
- **`ml/anomaly_detector.py`**: scikit-learn pipeline (`SimpleImputer` → `StandardScaler` → `IsolationForest`) with `train`, `predict`, `save` and `load`. It stores the feature order and robust reference statistics for the `drivers` explanation. `load_detector()` returns `None` when the file is missing or was built with a different backend, so the API reports `model_unavailable` (or retrains at start-up) instead of crashing.
- **`ml/_pure_iforest.py`**: dependency-free Isolation Forest (Liu et al., 2008) with the same API, used only when scikit-learn is absent. The build environment had no PyPI access, so the committed model and test runs used this path.
- **`ml/train.py`**: employee-level 70/30 split, baseline-window training, held-out evaluation against synthetic labels (precision, recall, F1, rank AUC, flag rate per group), then a final fit and report.
- **`ml/forecaster.py`**: Python port of the frontend's damped Holt model so mock and API modes agree. It follows each employee's own schedule. Smoothing parameters were chosen by grid search on rolling back-tests (α 0.15, β 0.1, φ 0.85). On this data the back-tested MAE is 0.67 h/day against 0.68 h for a naive 10-day mean, so the forecast's value here is the trend and range, not a large accuracy gain.
- **`services/risk_engine.py`**: five independent factor rules returning the frontend's factor shape plus the brief's aliases (`factor`, `contribution`, `observed_value`). `evaluate_scenario()` reuses the same rules with the reference schedule (8 h, 3 breaks) as the baseline.
- **`services/recommendation.py`**: one recommendation per contributing factor, plus a general check-in suggestion at moderate or elevated level, and a "collect more data" recommendation for insufficient data. Tests check that no medical vocabulary appears.
- **`services/insight_engine.py`**: the frontend's Insights rules (hours +0.75 h, breaks −0.75, late nights, rest days, task completion, improvement), applied to current vs previous 30 days.
- **`services/trend_analyzer.py`**: `summarise_period` (the frontend's PeriodSummary), the trends payload, and weekly buckets.
- **`services/analysis_service.py`**: builds every payload and runs the documented 8-step `analyze()` workflow.
- **`routes/*`**: thin HTTP layer with validation, status codes and assessment persistence.
- **`schemas/*`**: Pydantic models that work on v1 and v2. Response models allow extra fields so nothing the frontend reads is dropped. The simulation request rejects unknown fields and validates ranges.

## 4. Keeping ML and rules separate

| | Isolation Forest | Indicator engine |
| --- | --- | --- |
| Question | Is this 7-day pattern unusual compared with the training baseline? | Which understandable behaviours changed, and by how much? |
| Output | `prediction`, `anomalyScore`, `drivers` | `indicator_score` 0–100, level, factors with explanations |
| Missing data | median-imputed inside the pipeline | factor marked `unknown`; too many unknowns → `insufficient_data` |
| Stored in `assessments` | `anomaly_detected`, `anomaly_score` | `indicator_score`, `indicator_level`, `explanation`, `recommendation` |

Neither output is derived from the other.

## 5. Frontend changes (minimal, all backwards-compatible with mock mode)

1. **`src/utils/constants.js`**: added `LEVEL_META.insufficient_data`, because the backend can return that level and badges and the donut chart look colours up by level.
2. **`src/pages/Employees.jsx`**: level counts tolerate levels beyond low, moderate and elevated.
3. **`src/pages/EmployeeDetail.jsx`**: shows "–" when the score is `null` (insufficient data). It also shows the new **AI pattern check** card when the payload includes `anomaly`, which only the backend returns.
4. **`src/components/analysis/AnomalyCard.jsx`** *(new)*: shows the Isolation Forest result and drivers. "Run analysis" calls `POST /analyze/{id}` and shows the saved assessment.
5. **`src/pages/Overview.jsx`**: tooltip thresholds come from `meta.thresholds` (backend 30/60, mock 30/55) instead of hard-coded text.
6. **`src/pages/SimulationLab.jsx`**: the "How the demo score works" table shows `result.rules` from the backend when present.
7. **`src/services/api.js`**: added `getDepartments`, `analyzeEmployee` and `getAssessments`, plus their endpoints.

Mock mode is unchanged and remains the default.

## 6. Verification performed

In the build sandbox (Python 3.11, with FastAPI 0.110, Starlette 0.36, Pydantic 1.10, SQLAlchemy 2.0, uvicorn 0.29 and httpx 0.27 loaded from source; numpy, pandas and scikit-learn were not available):

- generator → init_db → seed (run twice, no duplicates) → train ran in the documented order;
- `pytest`: 39 passed;
- uvicorn served `/`, `/docs`, `/openapi.json` and the API over HTTP, with CORS headers for `http://localhost:5173`;
- the frontend's real `src/services/api.js` (with axios 1.7) called every service function against the live server with `USE_MOCK_DATA=false`, including 404 and 422 handling;
- frontend sources pass a TypeScript syntax and import check. **`npm run build` was not run**, because npm packages could not be installed in the sandbox.

Not verified here: scikit-learn, pandas and numpy code paths (`make_pipeline` with scikit-learn, `feature_engineering --describe`), Pydantic 2, and rendering in a browser.
