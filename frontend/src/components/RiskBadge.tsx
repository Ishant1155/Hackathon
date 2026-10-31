import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

interface RiskBadgeProps {
  category: string;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  score,
  showScore = false,
  size = 'md',
}) => {
  const cat = category.toLowerCase();

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = ShieldCheck;
  let label = 'Low concern';

  if (cat.includes('high') || (score !== undefined && score >= 80)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = AlertOctagon;
    label = 'High priority';
  } else if (cat.includes('elevated') || (score !== undefined && score >= 60)) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    Icon = AlertTriangle;
    label = 'Elevated concern';
  } else if (cat.includes('moderate') || (score !== undefined && score >= 30)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    Icon = AlertCircle;
    label = 'Moderate concern';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses} transition-all`}
    >
      <Icon size={iconSizes} className="shrink-0" />
      <span>{label}</span>
      {showScore && score !== undefined && (
        <span className="font-bold opacity-90 border-l border-current pl-1.5 ml-0.5">
          {score.toFixed(0)}/100
        </span>
      )}
    </span>
  );
};
