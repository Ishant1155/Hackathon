# Sisyphus

Sisyphus is a workplace wellbeing demonstration platform. It analyses **simulated** employee work patterns (hours, breaks, late-night sessions, weekend work and task completion), forecasts the next seven days, and turns both into supportive, explainable insights.

> Sisyphus is a workplace wellbeing demonstration platform. Its predictions are estimates based on simulated activity data and are not medical diagnoses or scientifically validated assessments.

## Stack

React 18 · Vite 6 · JavaScript · Tailwind CSS 4 · React Router 6 · Recharts 2 · Lucide React · Axios. Typeface: Urbanist (Google Fonts).

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

### Add the official logo

Save the Sisyphus logo as **`public/brand/sisyphus-logo.png`** (square, ideally 512 × 512 px or larger). It is used in the site navigation, dashboard sidebar, footer, report header and loading states. Until the file exists, an interim SVG of the mark (`public/brand/sisyphus-mark.svg`) is shown instead, so nothing breaks.

## Routes

| Route | Page |
| --- | --- |
| `/` | Homepage: hero with live forecast preview, introduction, forecasting showcase, how it works, features, call to action |
| `/dashboard` | Overview: KPIs, forecast teaser, weekly hours, indicator distribution, department workload, check-ins, recent insights |
| `/employees` | Directory with search, department and level filters, sortable table (state kept in the URL) |
| `/employees/:id` | Profile: baseline comparison, 7-day forecast (`#forecast`), daily and weekly trends, factor breakdown, insights |
| `/insights` | Explainable observations filtered by type, attention level and department |
| `/trends` | 7-day / 30-day comparisons for hours, productivity, breaks, overtime, weekend and late-night activity |
| `/forecast` | 7-Day Forecast: predicted hours with 80% range, day-by-day detail, departments, individuals, model accuracy |
| `/simulation` | Simulation Lab: sliders and presets update an illustrative score instantly |
| `/reports` | Printable report; “Print / Save as PDF” uses the browser print dialog |

`/overview` redirects to `/dashboard`.

## Search

The circular search button (top bar and site navigation) opens a search overlay. **Ctrl/⌘ K** or **/** also opens it. It searches real data loaded through the service layer: pages, homepage sections, employees (by name, ID, role, location), departments, department and individual forecasts, insights and report sections. Use ↑ ↓ to move, Enter to open and Esc to close.

## 7-day forecasting

`src/utils/forecast.js` fits a damped Holt trend model (double exponential smoothing) to each employee’s weekday hours and breaks, plus a weekend-participation model from the last four weekends. It returns point forecasts, an 80% interval and expected overtime.

The smoothing parameters were chosen by grid search on rolling back-tests over the simulated data. Across 3 rolling origins (360 weekday predictions) the mean absolute error is **0.38 h/day**, against **0.48 h/day** for a naive 10-day average. These figures describe fit to simulated data only.

## Project structure

```
src/
  App.jsx                    routes (site layout + dashboard layout)
  index.css                  Sisyphus design tokens, components, motion, print styles
  layouts/                   SiteLayout (homepage), AppLayout (dashboard)
  components/
    brand/Logo.jsx           official logo with fallback
    site/                    SiteNav, SiteFooter
    layout/                  Sidebar (transparent), Topbar
    search/                  SearchProvider, SearchButton, SearchOverlay
    forecast/                ForecastChart, ForecastSummary, DailyForecast
    ui/                      StatCard, RiskBadge, ChartCard, ChartTooltip, LoadingState, EmptyState,
                             ErrorState, PageHeader, SegmentedControl, InfoTooltip, TrendDelta,
                             DisclaimerBanner, Avatar, Reveal
    employees/, insights/, charts/, simulation/
  pages/                     Home, Overview, Employees, EmployeeDetail, Insights, Trends, Forecast,
                             SimulationLab, Reports, NotFound
  hooks/                     useApi, useSimulation, useDocumentTitle, useReveal, useScrolled, useScrollToHash
  services/api.js            Axios client + service functions (USE_MOCK_DATA switch)
  services/mockBackend.js    in-browser stand-in for the FastAPI endpoints
  services/README.md         response shapes for every endpoint
  data/mockData.js           24 fictional employees, 60 days of seeded activity
  utils/                     forecast, simulation, search, metrics, employeeFilters, format, constants, chartTheme
```

## Connecting a backend

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_USE_MOCK_DATA=false` and `VITE_API_BASE_URL` (default `http://localhost:8000`).
3. Implement these endpoints and allow the Vite origin in CORS:

| Service function | Endpoint |
| --- | --- |
| `getOverview()` | `GET /analytics/overview` |
| `getEmployees()` | `GET /employees` |
| `getEmployeeById(id)` | `GET /employees/{id}` |
| `getEmployeeHistory(id)` | `GET /employees/{id}/history` |
| `getEmployeeForecast(id)` | `GET /employees/{id}/forecast` |
| `getInsights()` | `GET /analytics/insights` |
| `getTrends({ range })` | `GET /analytics/trends?range=7\|30` |
| `getForecast()` | `GET /analytics/forecast` |
| `simulateScenario(payload)` | `POST /simulate` |

Full response shapes are in [`src/services/README.md`](src/services/README.md).

## Design system

| Token | Hex | Use |
| --- | --- | --- |
| `cream` | `#F3E9DC` | page background |
| `caramel` | `#C08552` | primary buttons, highlights, chart accent |
| `espresso` | `#5E3023` | headings, strong text, secondary buttons |
| `brown` | `#895737` | body text, primary-button hover |
| `soft` | `#FAF5EF` | soft cards, sidebar |
| `beige` | `#E8D8C6` | borders, tracks |
| `sage` | `#81977B` | positive indicators |
| `honey` | `#D6A45D` | elevated workload indicators |

Body text (#895737) on cream is 5.0:1 and on white 6.1:1. Caramel and honey are not used for text because they fall below 4.5:1. Levels and changes always show a label or arrow alongside colour.

## Accessibility

Skip links, landmarks, visible focus rings, labelled controls, `aria-sort` on sortable headers, radio-group semantics with arrow keys on segmented controls and day selectors, a focus-trapped search dialog with combobox semantics, and `prefers-reduced-motion` support.

## Backend (FastAPI + Isolation Forest)

The `backend/` folder has a complete Python backend: synthetic data generator, SQLite, feature engineering, an Isolation Forest anomaly model, a rule-based behavioural indicator engine, recommendations, 7-day forecasting and every endpoint this frontend calls.

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.data.generator && python -m app.database.init_db && python -m app.data.seed_database && python -m app.ml.train
uvicorn app.main:app --reload --port 8000      # docs at http://localhost:8000/docs
```

Then create `.env.local` in this folder with `VITE_USE_MOCK_DATA=false` and `VITE_API_BASE_URL=http://localhost:8000`, and run `npm run dev`. With the backend connected, each employee profile also shows an **AI pattern check** (Isolation Forest result, with a "Run analysis" button that saves an assessment). See [backend/README.md](backend/README.md) and [backend/BACKEND_IMPLEMENTATION.md](backend/BACKEND_IMPLEMENTATION.md).
