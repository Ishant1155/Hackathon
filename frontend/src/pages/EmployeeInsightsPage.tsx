import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  Coffee,
  Activity,
} from 'lucide-react';
import { EmployeeSummary } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';

interface EmployeeInsightsPageProps {
  onSelectEmployee: (employeeId: string) => void;
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

const RISK_CATEGORIES = ['All', 'Low concern', 'Moderate concern', 'Elevated concern', 'High priority'];

export const EmployeeInsightsPage: React.FC<EmployeeInsightsPageProps> = ({
  onSelectEmployee,
}) => {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [riskCategory, setRiskCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getEmployees({
        search: search.trim() || undefined,
        department: department === 'All' ? undefined : department,
        risk_category: riskCategory === 'All' ? undefined : riskCategory,
        limit: 100,
      });
      setEmployees(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, department, riskCategory]);

  return (
    <div className="space-y-6">
      {/* Page Header Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Workforce Pattern Directory</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Search and filter simulated employees to inspect multi-week telemetry trends. Selecting an employee reveals
          the explainable risk breakdown, statistical anomaly score, and tailored supportive organizational steps.
        </p>

        {/* Filter Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID (e.g. EMP-003), or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Department:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Concern Level:</span>
            <select
              value={riskCategory}
              onChange={(e) => setRiskCategory(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {RISK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Simulated Employees</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-600">
              {employees.length} of {total} shown
            </span>
          </div>
          <span className="text-xs text-slate-400 italic">
            Click any row to open the explainable profile modal
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="h-7 w-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-medium">Filtering telemetry directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            <p>Error: {error}</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No employees found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4 text-center">7d Avg Hours</th>
                  <th className="py-3 px-4 text-center">7d Breaks</th>
                  <th className="py-3 px-4 text-center">Late Nights</th>
                  <th className="py-3 px-4 text-center">Task Trend</th>
                  <th className="py-3 px-4 text-center">ML Anomaly</th>
                  <th className="py-3 px-4 text-center">Wellbeing Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const isDemoProfile = ['EMP-001', 'EMP-002', 'EMP-003'].includes(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => onSelectEmployee(emp.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              emp.id === 'EMP-003'
                                ? 'bg-rose-100 text-rose-700'
                                : emp.id === 'EMP-002'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {emp.id.replace('EMP-', '#')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                                {emp.name}
                              </span>
                              {isDemoProfile && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400">{emp.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{emp.department}</div>
                        <div className="text-[11px] text-slate-500">{emp.role}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            emp.avg_hours_7d >= 11
                              ? 'bg-rose-50 text-rose-700 font-bold'
                              : emp.avg_hours_7d >= 9.5
                              ? 'bg-amber-50 text-amber-700 font-bold'
                              : 'text-slate-700'
                          }`}
                        >
                          {emp.avg_hours_7d.toFixed(1)}h
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-700">
                        {emp.avg_breaks_7d.toFixed(1)} / day
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-medium ${
                            emp.late_night_count_14d >= 4
                              ? 'text-rose-600 font-bold'
                              : emp.late_night_count_14d >= 2
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {emp.late_night_count_14d} in 14d
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-medium">
                        <span
                          className={
                            emp.task_completion_trend < -0.15
                              ? 'text-rose-600'
                              : emp.task_completion_trend > 0
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }
                        >
                          {(emp.task_completion_trend * 100).toFixed(0)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <AnomalyBadge isAnomaly={emp.is_anomaly} score={emp.anomaly_score} />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <RiskBadge category={emp.risk_category} score={emp.risk_score} showScore size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEmployee(emp.id);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 font-medium inline-flex items-center gap-1 transition-all"
                        >
                          <span>Inspect</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
