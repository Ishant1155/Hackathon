import {
  DashboardSummary,
  EmployeeSummary,
  EmployeeDetail,
  DailyRecord,
  Alert,
  AlertHistory,
  SimulationScenarioInput,
  SimulationResult,
  SettingsData,
  AnalyticsTrendPoint,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const apiService = {
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<any>(res);
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    return handleResponse<DashboardSummary>(res);
  },

  async getEmployees(params?: {
    search?: string;
    department?: string;
    risk_category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; limit: number; offset: number; items: EmployeeSummary[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    if (params?.risk_category && params.risk_category !== 'All') query.append('risk_category', params.risk_category);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/employees?${query.toString()}`);
    return handleResponse<{ total: number; limit: number; offset: number; items: EmployeeSummary[] }>(res);
  },

  async getEmployeeDetail(id: string): Promise<EmployeeDetail> {
    const res = await fetch(`${API_BASE_URL}/employees/${id}`);
    return handleResponse<EmployeeDetail>(res);
  },

  async getEmployeeHistory(id: string): Promise<DailyRecord[]> {
    const res = await fetch(`${API_BASE_URL}/employees/${id}/history`);
    return handleResponse<DailyRecord[]>(res);
  },

  async runAnalysis(employeeId: string, days: number = 30) {
    const res = await fetch(`${API_BASE_URL}/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, observation_days: days }),
    });
    return handleResponse<any>(res);
  },

  async getAlerts(params?: { status?: string; department?: string; limit?: number; offset?: number }): Promise<{
    total: number;
    limit: number;
    offset: number;
    items: Alert[];
  }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.department && params.department !== 'All') query.append('department', params.department);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/alerts?${query.toString()}`);
    return handleResponse<{ total: number; limit: number; offset: number; items: Alert[] }>(res);
  },

  async updateAlert(alertId: string, data: Partial<Alert>): Promise<Alert> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Alert>(res);
  },

  async getAlertHistory(alertId: string): Promise<AlertHistory[]> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/history`);
    return handleResponse<AlertHistory[]>(res);
  },

  async getAnalyticsTrends(department?: string, days: number = 30): Promise<AnalyticsTrendPoint[]> {
    const query = new URLSearchParams();
    if (department && department !== 'All') query.append('department', department);
    query.append('days', days.toString());

    const res = await fetch(`${API_BASE_URL}/analytics/trends?${query.toString()}`);
    return handleResponse<AnalyticsTrendPoint[]>(res);
  },

  async runSimulation(scenario: SimulationScenarioInput): Promise<SimulationResult> {
    const res = await fetch(`${API_BASE_URL}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });
    return handleResponse<SimulationResult>(res);
  },

  async regenerateData(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/data/generate`, {
      method: 'POST',
    });
    return handleResponse<any>(res);
  },

  async getSettings(): Promise<SettingsData> {
    const res = await fetch(`${API_BASE_URL}/settings`);
    return handleResponse<SettingsData>(res);
  },

  async updateSettings(settings: SettingsData): Promise<SettingsData> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleResponse<SettingsData>(res);
  },
};
