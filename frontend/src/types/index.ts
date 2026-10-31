export interface DashboardSummary {
  total_simulated_employees: number;
  requiring_review: number;
  sustained_extended_hours: number;
  average_daily_hours: number;
  open_alerts: number;
  average_risk_score: number;
  risk_distribution: {
    "Low concern": number;
    "Moderate concern": number;
    "Elevated concern": number;
    "High priority": number;
  };
}

export interface EmployeeSummary {
  id: string;
  name: string;
  department: string;
  role: string;
  schedule: string;
  profile_type: string;
  baseline_hours: number;
  avg_hours_7d: number;
  avg_hours_30d: number;
  avg_breaks_7d: number;
  late_night_count_14d: number;
  weekend_days_count_14d: number;
  task_completion_trend: number;
  risk_score: number;
  risk_category: string;
  is_anomaly: boolean;
  anomaly_score: number;
  last_assessment_date?: string;
}

export interface DailyRecord {
  record_date: string;
  day_of_week: string;
  working_hours: number;
  break_count: number;
  avg_break_duration: number;
  late_night_active: boolean;
  weekend_work: boolean;
  tasks_completed: number;
  task_completion_trend: number;
  workload_indicator: number;
  recovery_hours: number;
}

export interface ContributingFactor {
  name: string;
  score: number;
  max_score: number;
  severity: "normal" | "moderate" | "high";
  title: string;
  description: string;
  evidence: string;
}

export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;
  raw_decision_score: number;
  model_name: string;
  interpretation: string;
}

export interface EmployeeDetail {
  id: string;
  name: string;
  department: string;
  role: string;
  schedule: string;
  profile_type: string;
  baseline_hours: number;
  avg_hours_7d: number;
  avg_hours_30d: number;
  avg_breaks_7d: number;
  late_night_count_14d: number;
  weekend_days_count_14d: number;
  task_completion_trend: number;
  risk_score: number;
  risk_category: string;
  is_anomaly: boolean;
  anomaly_score: number;
  primary_explanation: string;
  contributing_factors: ContributingFactor[];
  supporting_observations: string[];
  recommendations: string[];
  data_completeness: string;
  confidence_limitations?: string;
  records: DailyRecord[];
}

export interface Alert {
  id: string;
  employee_id: string;
  created_date: string;
  risk_category: string;
  risk_score: number;
  title: string;
  explanation: string;
  contributing_factors: string;
  recommended_action: string;
  status: "Open" | "Under Review" | "Follow-up Scheduled" | "Resolved";
  reviewer_notes?: string;
  follow_up_date?: string;
  follow_up_completed: boolean;
  updated_at?: string;
}

export interface AlertHistory {
  id: number;
  alert_id: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  note?: string;
  timestamp: string;
}

export interface SimulationScenarioInput {
  preset_name?: string;
  daily_working_hours: number;
  break_count: number;
  avg_break_duration: number;
  late_night_sessions_per_week: number;
  weekend_days_per_month: number;
  task_completion_trend: number;
  consecutive_extended_days: number;
  observation_days: number;
}

export interface ComparisonMetric {
  metric: string;
  healthy_baseline: string;
  scenario_value: string;
  difference: string;
  impact_description: string;
}

export interface SimulationResult {
  scenario_summary: string;
  is_simulated: boolean;
  overall_risk_score: number;
  risk_category: string;
  anomaly_detection: AnomalyResult;
  contributing_factors: ContributingFactor[];
  supporting_observations: string[];
  recommended_next_steps: string[];
  primary_explanation: string;
  comparison_table: ComparisonMetric[];
  daily_timeline: Array<{
    date: string;
    day: string;
    working_hours: number;
    breaks: number;
    tasks_completed: number;
    late_night: boolean;
    weekend_work: boolean;
  }>;
  confidence_notes: string;
}

export interface SettingsData {
  hours_weight: number;
  late_night_weight: number;
  task_trend_weight: number;
  breaks_weight: number;
  weekend_weight: number;
  anomaly_bonus_max: number;
  alert_risk_threshold: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  short_date: string;
  avg_working_hours: number;
  avg_tasks_completed: number;
  avg_breaks: number;
  late_night_pct: number;
  overtime_pct: number;
  active_employees: number;
}
