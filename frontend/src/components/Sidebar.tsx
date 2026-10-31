import React from 'react';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FlaskConical,
  Cpu,
  BarChart3,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'employees'
  | 'alerts'
  | 'simulation'
  | 'ai-analysis'
  | 'reports'
  | 'privacy';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openAlertsCount = 0,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'employees' as NavTab, label: 'Employee Insights', icon: Users },
    {
      id: 'alerts' as NavTab,
      label: 'Wellbeing Alerts',
      icon: AlertTriangle,
      badge: openAlertsCount > 0 ? openAlertsCount : undefined,
    },
    { id: 'simulation' as NavTab, label: 'Simulation Playground', icon: FlaskConical, isHighlight: true },
    { id: 'ai-analysis' as NavTab, label: 'AI Analysis', icon: Cpu },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart3 },
    { id: 'privacy' as NavTab, label: 'Privacy & Settings', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <HeartHandshake size={20} className="stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight text-base">MindGuard</span>
            <span className="text-[10px] font-semibold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/30">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Overwork Detection MVP</p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Platform Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-700/50'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : item.isHighlight ? 'text-teal-400' : 'text-slate-400'}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.isHighlight && !isActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                )}
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-brand-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Product Principle & Synthetic Data Badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs">
          <div className="flex items-center gap-1.5 text-brand-400 font-semibold mb-1">
            <Sparkles size={13} />
            <span>Product Principle</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 italic">
            &ldquo;We don&apos;t measure how hard an employee works. We identify when their working patterns may be becoming unhealthy.&rdquo;
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Simulated Telemetry
          </span>
          <span className="font-mono text-[10px] text-slate-400">v1.0 Hackathon</span>
        </div>
      </div>
    </aside>
  );
};
