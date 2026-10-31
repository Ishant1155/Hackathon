import React, { useEffect, useState } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  Briefcase,
  TrendingDown,
  Activity,
  Calendar,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DashboardSummary, AnalyticsTrendPoint } from '../types';
import { apiService } from '../services/api';
import { SummaryCard } from '../components/SummaryCard';

interface OverviewPageProps {
  onSelectEmployeeProfile: (employeeId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

const DEPARTMENTS = [
  'All',
  'Engineering',
  'Product Management',
  'Design & UX',
  'Data & Analytics',
  'Customer Experience',
  'Marketing & Growth',
  'Sales & Accounts',
  'Operations',
];

const PIE_COLORS = {
  'Low concern': '#10b981',
  'Moderate concern': '#3b82f6',
  'Elevated concern': '#f59e0b',
  'High priority': '#ef4444',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onSelectEmployeeProfile,
  onNavigateToTab,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendPoint[]>([]);
  const [department, setDepartment] = useState('All');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, trendData] = await Promise.all([
        apiService.getDashboardSummary(),
        apiService.getAnalyticsTrends(department === 'All' ? undefined : department, days),
      ]);
      setSummary(sumData);
      setTrends(trendData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [department, days]);

  const pieData = summary
    ? Object.entries(summary.risk_distribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Demonstration Profiles Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Live Hackathon Demonstration
              </span>
              <span className="text-xs text-slate-400">Pre-Configured Telemetry Profiles</span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Compare AI Behavioral Analysis Across Three Working Patterns
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a benchmark profile to inspect how Isolation Forest anomaly detection and explainable risk scoring respond.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onSelectEmployeeProfile('EMP-001')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:text-white transition-all shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Profile A: Healthy Pattern
              <ArrowRight size={13} className="text-emerald-400" />
            </button>
            <button
              onClick={() => onSelectEmployeeProfile('EMP-002')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-blue-500/30 text-xs font-semibold text-blue-300 hover:text-white transition-all shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
              Profile B: Occasional Overtime
              <ArrowRight size={13} className="text-blue-400" />
            </button>
            <button
              onClick={() => onSelectEmployeeProfile('EMP-003')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white transition-all shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
              Profile C: Sustained Overwork
              <ArrowRight size={13} className="text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Filter size={14} className="text-brand-600" />
            Department:
          </span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Window:</span>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                days === d
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <SummaryCard
            title="Total Employees"
            value={summary.total_simulated_employees}
            subtext="Simulated workforce"
            icon={Users}
            onClick={() => onNavigateToTab('employees')}
          />
          <SummaryCard
            title="Requiring Review"
            value={summary.requiring_review}
            subtext="Risk score ≥ 60"
            icon={AlertTriangle}
            badge={{
              text: `${((summary.requiring_review / summary.total_simulated_employees) * 100).toFixed(0)}% workforce`,
              variant: summary.requiring_review > 0 ? 'warning' : 'positive',
            }}
            onClick={() => onNavigateToTab('alerts')}
          />
          <SummaryCard
            title="Sustained >10h"
            value={summary.sustained_extended_hours}
            subtext="14d persistent overtime"
            icon={Clock}
            badge={{
              text: 'Fatigue Risk',
              variant: summary.sustained_extended_hours > 0 ? 'danger' : 'neutral',
            }}
          />
          <SummaryCard
            title="Avg Daily Hours"
            value={`${summary.average_daily_hours}h`}
            subtext="Benchmark: 8.0h/day"
            icon={Briefcase}
          />
          <SummaryCard
            title="Open Alerts"
            value={summary.open_alerts}
            subtext="Pending human review"
            icon={Activity}
            badge={{
              text: `${summary.open_alerts} Actionable`,
              variant: summary.open_alerts > 0 ? 'warning' : 'positive',
            }}
            onClick={() => onNavigateToTab('alerts')}
          />
          <SummaryCard
            title="Mean Risk Index"
            value={`${summary.average_risk_score}`}
            subtext="Overall organizational score"
            icon={TrendingDown}
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Working Hours Over Time */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Average Daily Working Hours Over Time</h3>
              <p className="text-xs text-slate-500">Track company-wide daily hours against the 8.0h baseline</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {days}-Day Rhythms
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="short_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[4, 14]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} hrs`, 'Avg Hours']}
                />
                <Line
                  type="monotone"
                  dataKey="avg_working_hours"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Wellbeing Risk Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Wellbeing Risk Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown of simulated workforce across 4 categories</p>
          </div>

          <div className="h-52 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={(PIE_COLORS as any)[entry.name] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: (PIE_COLORS as any)[item.name] || '#94a3b8' }}
                ></span>
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 6: Work Hours vs Task Completion Correlation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Work Hours vs Task Completion Rate</h3>
              <p className="text-xs text-slate-500">Detecting diminishing returns when hours rise but completion drops</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Productivity Dynamic
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="short_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" domain={[0, 14]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="avg_working_hours"
                  name="Avg Working Hours"
                  fill="#0c87eb"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  opacity={0.8}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avg_tasks_completed"
                  name="Avg Tasks Completed"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 & 4: Breaks & Late-Night Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Late-Night Work Frequency</h3>
            <p className="text-xs text-slate-500">Percentage of active employees logging work after 9 PM</p>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="short_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 40]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Late Night %']}
                />
                <Bar dataKey="late_night_pct" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
