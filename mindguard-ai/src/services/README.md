# Sisyphus – API contract

The frontend talks to the backend only through `src/services/api.js`.
With `VITE_USE_MOCK_DATA=true` (the default) every call is answered in the
browser by `mockBackend.js`. Set it to `false` and the same functions call
the FastAPI service at `VITE_API_BASE_URL`.

## Envelope

Every service function resolves to `{ data, meta }`.

The backend can return either form below. `unwrap()` in `api.js` handles both.

```jsonc
// preferred
{ "data": <payload>, "meta": { "simulated": true, "generatedAt": "2026-10-31T06:00:00Z" } }
// also accepted
<payload>
```

Errors reject with `ApiError { message, status, details }`. A FastAPI
`{"detail": "..."}` body becomes `message`. `GET /employees/{id}` must
return **404** for unknown IDs; the profile page shows a "not found" state.

`meta` fields used by the UI (all optional):

| field | type | used for |
| --- | --- | --- |
| `simulated` | bool | data notice |
| `organisation` | string | report header |
| `generatedAt` | ISO datetime | report header |
| `thresholds` | `{ moderate: 30, elevated: 55 }` | report method text |

## Endpoints

| Service function | Method & path |
| --- | --- |
| `getOverview()` | `GET /analytics/overview` |
| `getEmployees()` | `GET /employees` |
| `getEmployeeById(id)` | `GET /employees/{id}` |
| `getEmployeeHistory(id)` | `GET /employees/{id}/history` |
| `getInsights()` | `GET /analytics/insights` |
| `getTrends({ range })` | `GET /analytics/trends?range=7\|30` |
| `simulateScenario(payload)` | `POST /simulate` |
| `getForecast()` | `GET /analytics/forecast` |
| `getEmployeeForecast(id)` | `GET /employees/{id}/forecast` |
| `getReportSummary()` | composed from overview + trends(30) + insights (no extra route) |

### Shared types

```ts
type Level = 'low' | 'moderate' | 'elevated';

type PeriodSummary = {
  avgHours: number;          // mean weekday hours
  breaksPerDay: number;      // mean weekday breaks (≥10 min)
  productivity: number;      // mean weekday score 0–100
  tasksPerDay: number;
  overtimeHours: number;     // weekday hours beyond 8 h + all weekend hours
  overtimePerWeek: number;
  lateNightSessions: number; // sessions after 9 pm
  lateNightPerWeek: number;
  weekendDays: number;       // weekend days with work
  weekendDaysPerWeek: number;
  totalHours: number;
  days: number;
};

type Comparison = { current: number; previous: number; change: number; changePct: number };

type Employee = {
  id: string;                // "MG-1001"
  name: string;
  department: 'Engineering' | 'Marketing' | 'HR' | 'Finance' | 'Operations' | 'Sales';
  designation: string;
  location: 'Remote' | 'Hybrid' | 'Office';
  startDate: string;         // YYYY-MM-DD
  simulated: boolean;
  metrics: PeriodSummary;    // current period
  baseline: PeriodSummary;   // previous period
  indicator: {
    score: number;           // 0–100, illustrative
    level: Level;
    levelLabel: string;
    previousScore: number;
    previousLevel: Level;
    productivityChange: number; // % vs baseline
  };
};

type Factor = {
  key: 'avgWorkingHours' | 'dailyBreaks' | 'lateNightSessions' | 'weekendDays' | 'productivityChange';
  label: string; value: number; unit: string;
  points: number; maxPoints: number;
  status: 'contributing' | 'neutral';
  explanation: string;
};

type Insight = {
  id: string;
  employeeId: string; employeeName: string; department: string; designation: string;
  indicatorLevel: Level;
  type: 'hours' | 'breaks' | 'lateNight' | 'weekend' | 'tasks' | 'improvement';
  severity: 'elevated' | 'moderate' | 'positive';
  title: string;
  metric: Comparison & { label: string; unit: string };
  comparison: {
    current:  { start: string; end: string; label: string; display: string };
    previous: { start: string; end: string; label: string; display: string };
  };
  whatChanged: string;
  whyItMatters: string;
  suggestion: string;
  detectedAt: string;
  simulated: boolean;
};
```

### `GET /analytics/overview`

```ts
{
  kpis: {
    totalEmployees: number;
    departments: number;
    elevated: { current: number; previous: number };
    moderate: { current: number; previous: number };
    avgWorkingHours: Comparison;
    avgProductivity: Comparison;
  };
  weeklyHours: Array<{ weekEnding: string; label: string; period: 'current' | 'previous';
                       avgHours: number; elevatedGroupHours: number; overtimePerEmployee: number; reference: 8 }>;
  distribution: Array<{ level: Level; label: string; count: number; previousCount: number; percent: number }>;
  departments: Array<{ department: string; headcount: number; avgHours: number; previousAvgHours: number;
                       overtimePerWeek: number; breaksPerDay: number; productivity: number;
                       lateNightSessions: number; weekendDays: number; avgScore: number; previousAvgScore: number;
                       low: number; moderate: number; elevated: number }>;
  recentInsights: Insight[];   // up to 4
  checkIns: Array<{ id: string; name: string; department: string; designation: string;
                    indicator: Employee['indicator']; avgHours: number; reasons: string[] }>;
}
```

### `GET /employees` → `Employee[]`

### `GET /employees/{id}` → `Employee & { factors: Factor[]; insights: Insight[]; disclaimer: string }`

### `GET /employees/{id}/history`

```ts
{
  employeeId: string;
  range: { start: string; end: string };
  baseline: PeriodSummary;
  current: PeriodSummary;
  daily: Array<{ date: string; isWeekend: boolean; worked: boolean; hours: number; breaks: number;
                 productivity: number | null; tasksCompleted: number; overtime: number; lateNight: 0 | 1;
                 baselineHours: number; previousDate: string | null; previousHours: number | null }>;
  weekly: Array<{ weekEnding: string; label: string; period: 'current' | 'previous'; avgHours: number;
                  breaksPerDay: number; productivity: number; overtimeHours: number;
                  lateNightSessions: number; weekendDays: number }>;
}
```

### `GET /analytics/insights` → `Insight[]` (sorted: elevated, moderate, positive)

### `GET /analytics/trends?range=7|30`

```ts
{
  range: 7 | 30;
  current:  { start: string; end: string; display: string };
  previous: { start: string; end: string; display: string };
  summary: Record<'avgHours' | 'productivity' | 'breaksPerDay' | 'overtimeHours' |
                  'lateNightSessions' | 'weekendDays' | 'tasksPerDay', Comparison>;
  // weekdays only, paired by working-day index with the previous window
  daily: Array<{ date: string; label: string; previousDate: string | null;
                 hours: number; previousHours: number | null;
                 productivity: number; previousProductivity: number | null;
                 breaks: number; previousBreaks: number | null;
                 overtime: number; previousOvertime: number | null;
                 lateNight: number; previousLateNight: number | null }>;
  // weekend days, paired in order with the previous window
  weekend: Array<{ date: string; label: string; previousDate: string | null;
                   activeEmployees: number; previousActiveEmployees: number | null;
                   hours: number; previousHours: number | null }>;
}
```

### `POST /simulate`

Request:

```json
{ "avgWorkingHours": 9.5, "dailyBreaks": 2, "lateNightSessions": 2, "weekendDays": 0.5, "productivityChange": -5 }
```

Response (`SimulationResult`):

```ts
{
  score: number; level: Level; levelLabel: string;
  factors: Factor[];          // highest contribution first
  summary: string;
  disclaimer: string;
  inputs: SimulationInputs;   // sanitised and clamped
  thresholds: { moderate: number; elevated: number };
}
```

The reference implementation is `computeIndicatorScore()` in
`src/utils/simulation.js`. Its weights and thresholds are illustrative and
not validated.

### `GET /analytics/forecast`

7-day organisation forecast. The reference implementation is
`src/utils/forecast.js` (damped Holt trend model per employee, plus a
weekend-participation model) aggregated in `mockBackend.getForecast()`.

```ts
type ForecastModel = {
  name: string; method: string;
  params: { alpha: number; beta: number; phi: number };
  horizonDays: 7; interval: 0.8; disclaimer: string;
  backtest: { window: 7; origins: number; samples: number; maeHours: number; naiveMaeHours: number };
};

{
  model: ForecastModel;
  historyRange: { start: string; end: string };
  horizon: { start: string; end: string; display: string };
  days: Array<{ date: string; label: string; weekday: string; isWeekend: boolean;
                predictedHours: number;          // weekday: per worker; weekend: expected per person
                lower: number | null; upper: number | null;   // 80% interval, weekdays only
                predictedOvertime: number;       // all employees
                predictedBreaks: number | null;
                expectedWorkers: number;         // people expected to work that day
                expectedLateNights: number }>;
  history: Array<{ date: string; label: string; isWeekend: boolean; hours: number; overtime: number; breaks: number | null }>; // last 14 days
  summary: { predictedAvgHours: number; recentAvgHours: number; change: number; changePct: number;
             predictedOvertime: number; recentOvertime: number; overtimeChangePct: number;
             predictedBreaks: number; recentBreaks: number; expectedWeekendWorkers: number;
             expectedLateNights: number; peakDay: { date: string; label: string; hours: number } | null;
             rising: number; easing: number; above10h: number };
  departments: Array<{ department: string; headcount: number; predictedAvgHours: number;
                       recentAvgHours: number; change: number; predictedOvertime: number }>;
  employees: Array<{ id: string; name: string; department: string; designation: string;
                     indicator: Employee['indicator'] } & EmployeeForecastSummary>;  // sorted by predicted overtime
  insights: Array<{ id: string; tone: 'elevated' | 'moderate' | 'positive'; title: string; detail: string }>;
}
```

### `GET /employees/{id}/forecast`

```ts
type EmployeeForecastSummary = {
  predictedAvgHours: number; recentAvgHours: number; change: number;
  trend: 'rising' | 'easing' | 'steady';
  predictedOvertime: number; predictedBreaks: number;
  expectedWeekendDays: number; expectedLateNights: number;
  residualSd: number; dailyTrend: number;
};

{
  employeeId: string;
  model: ForecastModel;
  horizon: { start: string; end: string; display: string };
  days: Array<{ date: string; label: string; isWeekend: boolean; workProbability: number;
                hours: number; expectedHours: number; lower: number | null; upper: number | null;
                overtime: number; breaks: number | null; lateNight: number }>;
  history: Array<{ date: string; label: string; isWeekend: boolean; hours: number; breaks: number | null; overtime: number }>;
  summary: EmployeeForecastSummary;
}
```

Returns **404** for unknown IDs.
