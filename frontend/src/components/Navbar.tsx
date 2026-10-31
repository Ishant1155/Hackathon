import React, { useState } from 'react';
import { RefreshCw, ShieldAlert, Sparkles, UserCheck, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface NavbarProps {
  title: string;
  subtitle: string;
  onSelectEmployeeProfile?: (employeeId: string) => void;
  onDataRegenerated?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  onSelectEmployeeProfile,
  onDataRegenerated,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (confirm('Regenerate synthetic employee dataset? This will reset all records and retrain the anomaly detection model.')) {
      setIsRegenerating(true);
      try {
        await apiService.regenerateData();
        if (onDataRegenerated) onDataRegenerated();
      } catch (err: any) {
        alert(`Failed to regenerate data: ${err.message}`);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Demonstration Profiles Quick Switcher */}
        {onSelectEmployeeProfile && (
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="px-2 font-medium text-slate-500 flex items-center gap-1">
              <Sparkles size={12} className="text-brand-600" />
              Demo Profiles:
            </span>
            <button
              onClick={() => onSelectEmployeeProfile('EMP-001')}
              className="px-2.5 py-1 rounded font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              title="Healthy Pattern (7-9 hrs, regular breaks)"
            >
              A: Healthy
            </button>
            <button
              onClick={() => onSelectEmployeeProfile('EMP-002')}
              className="px-2.5 py-1 rounded font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 ml-1 transition-colors"
              title="Occasional Overtime (9-10 hrs, occasional late night)"
            >
              B: Overtime
            </button>
            <button
              onClick={() => onSelectEmployeeProfile('EMP-003')}
              className="px-2.5 py-1 rounded font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 ml-1 transition-colors"
              title="Sustained Overwork Pattern (12-14 hrs, late nights, declining tasks)"
            >
              C: Overwork
            </button>
          </div>
        )}

        {/* Regenerate Dataset Button */}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRegenerating ? 'animate-spin text-brand-600' : 'text-slate-500'} />
          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Data'}</span>
        </button>

        {/* Responsible AI / Non-diagnostic disclaimer pill */}
        <div
          title="MindGuard AI is an early workload pattern detector, not a medical or diagnostic platform."
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium"
        >
          <ShieldAlert size={13} className="text-amber-500" />
          <span>Non-Diagnostic Safeguard Active</span>
        </div>
      </div>
    </header>
  );
};
