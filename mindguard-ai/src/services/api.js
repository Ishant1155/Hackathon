/**
 * Sisyphus – API service layer.
 *
 * Every page and hook gets data from these functions. Nothing outside
 * src/services may import the mock dataset.
 *
 *   USE_MOCK_DATA = true   -> served by ./mockBackend.js (in-browser)
 *   USE_MOCK_DATA = false  -> HTTP calls to the FastAPI backend
 *
 * Configure with Vite env variables (see .env.example):
 *   VITE_USE_MOCK_DATA=false
 *   VITE_API_BASE_URL=http://localhost:8000
 *
 * RESPONSE CONTRACT
 * Every service function resolves to `{ data, meta }`.
 * The backend may answer either with an envelope
 *   { "data": <payload>, "meta": { ... } }
 * or with the bare payload; both are normalised by `unwrap()`.
 * Failures reject with an `ApiError` ({ message, status, details }).
 * Full payload shapes are documented in src/services/README.md.
 */

import axios from 'axios';
import * as mock from './mockBackend.js';

const env = import.meta.env ?? {};

export const USE_MOCK_DATA = String(env.VITE_USE_MOCK_DATA ?? 'true').toLowerCase() !== 'false';
export const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Artificial latency for the mock backend so loading states are visible in demos. */
const MOCK_LATENCY_MS = 350;

export const ENDPOINTS = {
  overview: '/analytics/overview',
  employees: '/employees',
  employee: (id) => `/employees/${encodeURIComponent(id)}`,
  employeeHistory: (id) => `/employees/${encodeURIComponent(id)}/history`,
  insights: '/analytics/insights',
  trends: '/analytics/trends',
  simulate: '/simulate',
  forecast: '/analytics/forecast',
  employeeForecast: (id) => `/employees/${encodeURIComponent(id)}/forecast`,
  departments: '/analytics/departments',
  analyze: (id) => `/analyze/${encodeURIComponent(id)}`,
  assessments: (id) => `/assessments/${encodeURIComponent(id)}`,
};

export class ApiError extends Error {
  constructor(message, { status = null, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const status = error.response?.status ?? null;
    const body = error.response?.data;
    const message =
      (typeof body?.detail === 'string' && body.detail) ||
      body?.message ||
      (status ? `Request failed with status ${status}.` : 'Could not reach the Sisyphus API. Check that the backend is running.');
    return Promise.reject(new ApiError(message, { status, details: body ?? null }));
  },
);

function unwrap(body) {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) {
    return { data: body.data, meta: body.meta ?? {} };
  }
  return { data: body, meta: {} };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fromMock(handler, { latency = MOCK_LATENCY_MS, metaExtra } = {}) {
  if (latency) await delay(latency);
  try {
    const data = structuredClone(handler());
    return { data, meta: mock.buildMeta({ source: 'mock', ...metaExtra }) };
  } catch (err) {
    throw new ApiError(err.message, { status: err.status ?? 500 });
  }
}

async function request(config) {
  const response = await httpClient.request(config);
  const result = unwrap(response.data);
  return { data: result.data, meta: { source: 'api', ...result.meta } };
}

/* ---------------------------------------------------------------- */
/* Public service functions                                          */
/* ---------------------------------------------------------------- */

/**
 * Organisation overview: KPIs, weekly hours, indicator distribution,
 * department comparison, recent insights and suggested check-ins.
 * GET /analytics/overview
 */
export function getOverview({ signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getOverview());
  return request({ method: 'GET', url: ENDPOINTS.overview, signal });
}

/**
 * Employee directory with current metrics, baseline and indicator.
 * GET /employees
 */
export function getEmployees({ signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.listEmployees());
  return request({ method: 'GET', url: ENDPOINTS.employees, signal });
}

/**
 * Single employee with factor breakdown and their insights.
 * GET /employees/{id}. Rejects with ApiError(status 404) when not found.
 */
export function getEmployeeById(id, { signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getEmployee(id));
  return request({ method: 'GET', url: ENDPOINTS.employee(id), signal });
}

/**
 * Daily activity for the current period plus weekly buckets.
 * GET /employees/{id}/history
 */
export function getEmployeeHistory(id, { signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getEmployeeHistory(id));
  return request({ method: 'GET', url: ENDPOINTS.employeeHistory(id), signal });
}

/**
 * Explainable behavioural observations.
 * GET /analytics/insights
 */
export function getInsights({ signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.listInsights());
  return request({ method: 'GET', url: ENDPOINTS.insights, signal });
}

/**
 * Organisation trends for the last `range` days vs the previous `range` days.
 * GET /analytics/trends?range=7|30
 */
export function getTrends({ range = 30, signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getTrends({ range }), { metaExtra: { range } });
  return request({ method: 'GET', url: ENDPOINTS.trends, params: { range }, signal });
}

/**
 * Hypothetical scenario scoring for the Simulation Lab.
 * POST /simulate with SimulationInputs; resolves to SimulationResult.
 * The mock path has no artificial delay so sliders update instantly.
 */
export function simulateScenario(payload, { signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.simulate(payload), { latency: 0 });
  return request({ method: 'POST', url: ENDPOINTS.simulate, data: payload, signal });
}

/**
 * Organisation-wide 7-day workload forecast with per-day predictions,
 * department and employee breakdowns, model metadata and explanatory insights.
 * GET /analytics/forecast
 */
export function getForecast({ signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getForecast());
  return request({ method: 'GET', url: ENDPOINTS.forecast, signal });
}

/**
 * 7-day forecast for one employee.
 * GET /employees/{id}/forecast. Rejects with ApiError(status 404) when not found.
 */
export function getEmployeeForecast(id, { signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getEmployeeForecast(id));
  return request({ method: 'GET', url: ENDPOINTS.employeeForecast(id), signal });
}

/**
 * Department-level summaries.
 * GET /analytics/departments (mock mode: taken from the overview payload)
 */
export async function getDepartments({ signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => mock.getOverview().departments);
  return request({ method: 'GET', url: ENDPOINTS.departments, signal });
}

/**
 * Run the full backend analysis (features → Isolation Forest → indicator
 * rules → recommendations) and save an assessment.
 * POST /analyze/{id}. Requires the backend; the anomaly model does not run in mock mode.
 */
export function analyzeEmployee(id, { signal } = {}) {
  if (USE_MOCK_DATA) {
    return Promise.reject(new ApiError('AI analysis needs the Sisyphus backend. Set VITE_USE_MOCK_DATA=false.', { status: 501 }));
  }
  return request({ method: 'POST', url: ENDPOINTS.analyze(id), signal });
}

/**
 * Saved assessments for an employee, newest first.
 * GET /assessments/{id}. Returns an empty list in mock mode.
 */
export function getAssessments(id, { signal } = {}) {
  if (USE_MOCK_DATA) return fromMock(() => [], { latency: 0 });
  return request({ method: 'GET', url: ENDPOINTS.assessments(id), signal });
}

/**
 * Report data composed from existing endpoints, so no extra backend
 * route is needed.
 */
export async function getReportSummary({ signal } = {}) {
  const [overview, trends, insights] = await Promise.all([
    getOverview({ signal }),
    getTrends({ range: 30, signal }),
    getInsights({ signal }),
  ]);
  return {
    data: { overview: overview.data, trends: trends.data, insights: insights.data },
    meta: overview.meta,
  };
}

export function isAbortError(error) {
  return axios.isCancel(error) || error?.name === 'AbortError' || error?.name === 'CanceledError';
}
