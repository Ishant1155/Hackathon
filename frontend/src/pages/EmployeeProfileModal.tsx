import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Clock,
  Coffee,
  Calendar,
  AlertTriangle,
  Activity,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { EmployeeDetail } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';

interface EmployeeProfileModalProps {
  employeeId: string | null;
  onClose: () => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employeeId,
  onClose,
}) => {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService
      .getEmployeeDetail(employeeId)
      .then((data) => {
        if (isMounted) setEmployee(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 sm:p-6 md:p-10">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {employee ? employee.name : 'Loading Profile...'}
                </h2>
                {employee && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {employee.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {employee ? `${employee.role} • ${employee.department}` : 'Retrieving telemetry records'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-sm font-medium">Loading comprehensive employee patterns...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={16} /> Error loading employee profile
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {employee && (
            <>
              {/* Top Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Risk Score Card */}
                <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Wellbeing Risk Score
                    </span>
                    <RiskBadge category={employee.risk_category} />
                  </div>
                  <div className="my-3 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {employee.risk_score.toFixed(0)}
                    </span>
                    <span className="text-sm font-medium text-slate-400">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        employee.risk_score >= 80
                          ? 'bg-rose-500'
                          : employee.risk_score >= 60
                          ? 'bg-amber-500'
                          : employee.risk_score >= 30
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, employee.risk_score)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Machine Learning Anomaly Score */}
                <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ML Anomaly Status
                    </span>
                    <AnomalyBadge isAnomaly={employee.is_anomaly} score={employee.anomaly_score} />
                  </div>
                  <div className="my-3">
                    <span className="text-xl font-bold text-slate-800">
                      {employee.is_anomaly ? 'Unusual Divergence' : 'Normal Bounds'}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Scikit-learn Isolation Forest model score:{' '}
                      <span className="font-semibold text-slate-700">
                        {(employee.anomaly_score * 100).toFixed(0)}%
                      </span>
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Identifies mathematical divergence, separate from risk scoring.
                  </p>
                </div>

                {/* Key Telemetry Quick Stats */}
                <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 flex flex-col justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    14-Day Working Rhythms
                  </span>
                  <div className="grid grid-cols-2 gap-2 my-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">7d Avg Hours</span>
                      <span className="font-bold text-slate-800 text-sm">{employee.avg_hours_7d}h / day</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">7d Daily Breaks</span>
                      <span className="font-bold text-slate-800 text-sm">{employee.avg_breaks_7d} breaks</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Late Nights (14d)</span>
                      <span className="font-bold text-slate-800 text-sm">{employee.late_night_count_14d} sessions</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Task Shift</span>
                      <span className={`font-bold text-sm ${employee.task_completion_trend < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {(employee.task_completion_trend * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Schedule: {employee.schedule}
                  </span>
                </div>
              </div>

              {/* Plain-Language Assessment Summary */}
              <div className="p-4 rounded-xl bg-brand-50/70 border border-brand-200">
                <div className="flex items-center gap-2 text-brand-900 font-semibold text-sm">
                  <Sparkles size={16} className="text-brand-600" />
                  <span>Pattern Assessment Overview</span>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                  {employee.primary_explanation}
                </p>
              </div>

              {/* 30-Day Historical Trend Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">30-Day Work Hours & Recorded Breaks</h3>
                    <p className="text-xs text-slate-500">Track daily working volume against recorded replenishment breaks</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-brand-500"></span>
                      Hours Worked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-teal-500"></span>
                      Breaks Taken
                    </span>
                  </div>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={employee.records} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="record_date"
                        tickFormatter={(val) => val.slice(5)}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 16]} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 6]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any, name: string) => [
                          name === 'working_hours' ? `${val} hrs` : val,
                          name === 'working_hours' ? 'Daily Hours' : 'Breaks Taken',
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="working_hours" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={12} opacity={0.85} />
                      <Line yAxisId="right" type="monotone" dataKey="break_count" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Contributing Factors Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Explainable Contributing Factor Breakdown
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Transparent multi-indicator score calculation based on multi-day sustained patterns.
                </p>

                <div className="space-y-3.5">
                  {employee.contributing_factors.map((factor, idx) => {
                    const pct = Math.min(100, (factor.score / factor.max_score) * 100);
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-800">{factor.title}</span>
                          <span className="font-mono font-medium text-slate-600">
                            {factor.score.toFixed(1)} / {factor.max_score.toFixed(1)} pts
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full ${
                              factor.severity === 'high'
                                ? 'bg-rose-500'
                                : factor.severity === 'moderate'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-600">{factor.description}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">Evidence: {factor.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supporting Observations & Recommended Supportive Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supporting Observations */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <Activity size={16} className="text-brand-600" />
                    Supporting Observations
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {employee.supporting_observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ChevronRight size={14} className="text-brand-500 mt-0.5 shrink-0" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Next Steps */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <CheckCircle size={16} className="text-teal-600" />
                    Recommended Supportive Actions
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {employee.recommendations.map((rec, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/80 leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Safeguards & Confidence Limitations Footer */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-3">
                <ShieldAlert size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Data Completeness & Ethical Safeguards</span>
                  <p>{employee.data_completeness}</p>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {employee.confidence_limitations}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
