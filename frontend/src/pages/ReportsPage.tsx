import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  ShieldCheck,
  Building,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { DashboardSummary } from '../types';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    apiService.getDashboardSummary().then(setSummary).catch(console.error);
  }, []);

  const departments = [
    { name: 'Engineering', total: 24, avgHours: 9.4, atRisk: 2, status: 'Moderate Concern' },
    { name: 'Product Management', total: 16, avgHours: 8.6, atRisk: 1, status: 'Low Concern' },
    { name: 'Design & UX', total: 12, avgHours: 8.1, atRisk: 0, status: 'Low Concern' },
    { name: 'Data & Analytics', total: 14, avgHours: 8.8, atRisk: 0, status: 'Low Concern' },
    { name: 'Customer Experience', total: 12, avgHours: 8.3, atRisk: 0, status: 'Low Concern' },
    { name: 'Marketing & Growth', total: 10, avgHours: 8.0, atRisk: 0, status: 'Low Concern' },
    { name: 'Sales & Accounts', total: 8, avgHours: 8.7, atRisk: 0, status: 'Low Concern' },
    { name: 'Operations', total: 4, avgHours: 8.1, atRisk: 0, status: 'Low Concern' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={18} className="text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Organizational Wellbeing Report</h2>
          </div>
          <p className="text-xs text-slate-500">
            Executive workload distribution summary, team-level health indices, and supportive review status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Departmental Telemetry & Risk Index
          </h3>
          <span className="text-xs text-slate-400">Aggregated across active squads</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-center">Team Members</th>
                <th className="py-2.5 px-4 text-center">Avg Daily Hours</th>
                <th className="py-2.5 px-4 text-center">Requiring Review</th>
                <th className="py-2.5 px-4 text-right">Team Posture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept.name} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                    <Building size={14} className="text-slate-400" />
                    {dept.name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700">{dept.total}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{dept.avgHours}h</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        dept.atRisk > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-500'
                      }`}
                    >
                      {dept.atRisk}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        dept.status === 'Moderate Concern'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Summary Takeaways */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3">
        <h4 className="font-bold text-sm text-teal-400 flex items-center gap-1.5">
          <ShieldCheck size={16} />
          Executive Human-Centered Wellbeing Takeaways
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="font-semibold text-white block mb-1">Workload Allocation</span>
            Engineering and Product squads demonstrate mild overtime clusters during current release cycles.
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="font-semibold text-white block mb-1">Recovery Protection</span>
            Evening late-night work is largely isolated to a small group of specialists rather than systemic team-wide overtime.
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="font-semibold text-white block mb-1">Follow-up Cadence</span>
            All identified elevated patterns have actionable review recommendations attached for managers.
          </div>
        </div>
      </div>
    </div>
  );
};
