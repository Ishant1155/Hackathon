import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coffee,
  Moon,
  Calendar,
  TrendingDown,
  Activity,
  ArrowRight,
  ShieldCheck,
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
import { SimulationScenarioInput, SimulationResult } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';

const PRESETS = [
  {
    name: 'Healthy Working Pattern',
    description: 'Balanced daily rhythm with consistent breaks and regular evening rest.',
    values: {
      preset_name: 'Healthy Working Pattern',
      daily_working_hours: 8.0,
      break_count: 3,
      avg_break_duration: 18.0,
      late_night_sessions_per_week: 0,
      weekend_days_per_month: 0,
      task_completion_trend: 4.0,
      consecutive_extended_days: 0,
      observation_days: 14,
    },
  },
  {
    name: 'Increasing Workload',
    description: 'Developing deadline surge with mild overtime and occasional late hours.',
    values: {
      preset_name: 'Increasing Workload',
      daily_working_hours: 9.8,
      break_count: 2,
      avg_break_duration: 12.0,
      late_night_sessions_per_week: 2,
      weekend_days_per_month: 2,
      task_completion_trend: -8.0,
      consecutive_extended_days: 2,
      observation_days: 14,
    },
  },
  {
    name: 'Sustained Overwork Pattern',
    description: 'High strain with 13+ hours, low breaks, frequent late nights, and dropping task output.',
    values: {
      preset_name: 'Sustained Overwork Pattern',
      daily_working_hours: 13.5,
      break_count: 1,
      avg_break_duration: 8.0,
      late_night_sessions_per_week: 5,
      weekend_days_per_month: 4,
      task_completion_trend: -35.0,
      consecutive_extended_days: 6,
      observation_days: 14,
    },
  },
];

export const SimulationPlaygroundPage: React.FC = () => {
  const [params, setParams] = useState<SimulationScenarioInput>(PRESETS[0].values);
  const [activePreset, setActivePreset] = useState<string>('Healthy Working Pattern');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setParams(preset.values);
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.runSimulation(params);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  // Run initial simulation on mount
  React.useEffect(() => {
    handleRunAnalysis();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Interactive Judge Demonstration
              </span>
              <span className="text-xs text-slate-400">Live Scikit-Learn Model Inference</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Simulation Playground: Test Behavioral Patterns in Real Time
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Adjust work hours, break frequencies, late-night shifts, and task trends. When you click{' '}
              <strong className="text-white">&ldquo;Run AI Analysis&rdquo;</strong>, the backend executes live
              Isolation Forest outlier detection and transparent wellbeing risk scoring.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-brand-500 hover:from-teal-400 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={16} className={loading ? 'animate-spin' : 'fill-current'} />
              <span>{loading ? 'Running AI Inference...' : 'Run AI Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESETS.map((preset) => {
          const isSelected = activePreset === preset.name;
          return (
            <div
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-brand-50/70 border-brand-400 shadow-sm ring-1 ring-brand-400'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{preset.name}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{preset.description}</p>
            </div>
          );
        })}
      </div>

      {/* Control Sliders Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-brand-600" />
            <h3 className="font-bold text-sm text-slate-900">Custom Behavioral Sliders</h3>
          </div>
          <button
            onClick={() => applyPreset(PRESETS[0])}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw size={12} /> Reset to Baseline
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* Daily Working Hours */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <Clock size={13} className="text-slate-400" /> Daily Working Hours:
              </span>
              <span className="font-bold text-brand-600">{params.daily_working_hours.toFixed(1)}h</span>
            </div>
            <input
              type="range"
              min="4.0"
              max="16.0"
              step="0.5"
              value={params.daily_working_hours}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, daily_working_hours: parseFloat(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>4.0h</span>
              <span>8.0h (Norm)</span>
              <span>16.0h</span>
            </div>
          </div>

          {/* Daily Breaks Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <Coffee size={13} className="text-slate-400" /> Recorded Breaks / Day:
              </span>
              <span className="font-bold text-brand-600">{params.break_count} breaks</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={params.break_count}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, break_count: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (None)</span>
              <span>3 (Healthy)</span>
              <span>6</span>
            </div>
          </div>

          {/* Late-Night Sessions */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <Moon size={13} className="text-slate-400" /> Late Nights / Week:
              </span>
              <span className="font-bold text-brand-600">{params.late_night_sessions_per_week} nights</span>
            </div>
            <input
              type="range"
              min="0"
              max="7"
              step="1"
              value={params.late_night_sessions_per_week}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, late_night_sessions_per_week: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (Rare)</span>
              <span>2</span>
              <span>7 (Daily)</span>
            </div>
          </div>

          {/* Weekend Work Frequency */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" /> Weekend Days / Month:
              </span>
              <span className="font-bold text-brand-600">{params.weekend_days_per_month} days</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={params.weekend_days_per_month}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, weekend_days_per_month: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (Off)</span>
              <span>4</span>
              <span>8 (All)</span>
            </div>
          </div>

          {/* Task Completion Trend */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <TrendingDown size={13} className="text-slate-400" /> Task Completion Trend:
              </span>
              <span
                className={`font-bold ${
                  params.task_completion_trend < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {params.task_completion_trend > 0 ? `+${params.task_completion_trend}%` : `${params.task_completion_trend}%`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={params.task_completion_trend}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, task_completion_trend: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-50% (Drop)</span>
              <span>0% (Stable)</span>
              <span>+50% (Surge)</span>
            </div>
          </div>

          {/* Consecutive Extended Days */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-1">
                <Activity size={13} className="text-slate-400" /> Consecutive Days &gt;10h:
              </span>
              <span className="font-bold text-brand-600">{params.consecutive_extended_days} days</span>
            </div>
            <input
              type="range"
              min="0"
              max="14"
              step="1"
              value={params.consecutive_extended_days}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, consecutive_extended_days: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0</span>
              <span>5 (Strain)</span>
              <span>14</span>
            </div>
          </div>

          {/* Average Break Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700">Average Break Duration:</span>
              <span className="font-bold text-brand-600">{params.avg_break_duration} mins</span>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              step="5"
              value={params.avg_break_duration}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, avg_break_duration: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5m</span>
              <span>15m</span>
              <span>45m</span>
            </div>
          </div>

          {/* Observation Window */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700">Analysis Window:</span>
              <span className="font-bold text-brand-600">{params.observation_days} days</span>
            </div>
            <input
              type="range"
              min="7"
              max="30"
              step="1"
              value={params.observation_days}
              onChange={(e) => {
                setActivePreset('Custom');
                setParams({ ...params, observation_days: parseInt(e.target.value) });
              }}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>7 days</span>
              <span>14 days</span>
              <span>30 days</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Selected scenario:{' '}
            <strong className="text-slate-800">{params.daily_working_hours}h/day</strong>,{' '}
            <strong className="text-slate-800">{params.break_count} breaks</strong>,{' '}
            <strong className="text-slate-800">{params.late_night_sessions_per_week} late nights/wk</strong>
          </span>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} className={loading ? 'animate-spin' : 'fill-current'} />
            <span>{loading ? 'Evaluating Model...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Live AI Analysis Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Main Results KPI Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Score */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Wellbeing Risk Score
                </span>
                <RiskBadge category={result.risk_category} />
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {result.overall_risk_score.toFixed(0)}
                </span>
                <span className="text-sm font-medium text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    result.overall_risk_score >= 80
                      ? 'bg-rose-500'
                      : result.overall_risk_score >= 60
                      ? 'bg-amber-500'
                      : result.overall_risk_score >= 30
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, result.overall_risk_score)}%` }}
                ></div>
              </div>
            </div>

            {/* Isolation Forest Anomaly */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Isolation Forest ML Score
                </span>
                <AnomalyBadge
                  isAnomaly={result.anomaly_detection.is_anomaly}
                  score={result.anomaly_detection.anomaly_score}
                />
              </div>
              <div className="my-3">
                <span className="text-xl font-bold text-slate-800">
                  {result.anomaly_detection.is_anomaly ? 'Outlier Pattern Detected' : 'Conforms to Baseline'}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Model divergence score:{' '}
                  <span className="font-semibold text-slate-700">
                    {(result.anomaly_detection.anomaly_score * 100).toFixed(0)}%
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                ML flags mathematical outlier behavior separately from risk points.
              </p>
            </div>

            {/* Plain Language Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Plain-Language HR Assessment
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed my-2">
                &ldquo;{result.primary_explanation}&rdquo;
              </p>
              <span className="text-[10px] text-brand-600 font-semibold">
                Evidence-derived • Non-diagnostic
              </span>
            </div>
          </div>

          {/* Dynamic Scenario Daily Timeline Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Simulated Daily Hours & Task Output ({params.observation_days} Days)
                </h3>
                <p className="text-xs text-slate-500">
                  Generated day-by-day telemetry for this exact scenario configuration
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-brand-500"></span> Hours
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-teal-500"></span> Tasks
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={result.daily_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" domain={[0, 16]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar yAxisId="left" dataKey="working_hours" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={14} opacity={0.85} />
                  <Line yAxisId="right" type="monotone" dataKey="tasks_completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Table: Healthy Baseline vs Configured Scenario */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Detailed Scenario Comparison vs Healthy Baseline
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                    <th className="py-2.5 px-4">Behavioral Dimension</th>
                    <th className="py-2.5 px-4">Healthy Standard Baseline</th>
                    <th className="py-2.5 px-4">Configured Scenario</th>
                    <th className="py-2.5 px-4">Observed Variance</th>
                    <th className="py-2.5 px-4">Wellbeing Impact Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.comparison_table.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{row.metric}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.healthy_baseline}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.scenario_value}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {row.difference}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{row.impact_description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contributing Factors & Supportive Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contributing Factors */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900">Contributing Factor Breakdown</h4>
              <div className="space-y-2.5">
                {result.contributing_factors.map((cf, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-800 mb-1">
                      <span>{cf.title}</span>
                      <span className="font-mono text-slate-600">
                        {cf.score.toFixed(1)} / {cf.max_score.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full ${
                          cf.severity === 'high'
                            ? 'bg-rose-500'
                            : cf.severity === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (cf.score / cf.max_score) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-slate-600 text-[11px]">{cf.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Steps */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900">Recommended Supportive Actions</h4>
              <ul className="space-y-2 text-xs">
                {result.recommended_next_steps.map((rec, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-lg bg-teal-50/70 border border-teal-200/80 text-teal-950 leading-relaxed"
                  >
                    {rec}
                  </li>
                ))}
              </ul>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-400 mt-4 leading-relaxed">
                <ShieldCheck size={14} className="text-teal-600 inline mr-1" />
                {result.confidence_notes}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
