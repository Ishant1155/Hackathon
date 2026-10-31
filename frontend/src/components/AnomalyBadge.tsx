import React from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

interface AnomalyBadgeProps {
  isAnomaly: boolean;
  score?: number;
}

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({ isAnomaly, score }) => {
  if (isAnomaly) {
    return (
      <span
        title={`Isolation Forest outlier score: ${score !== undefined ? (score * 100).toFixed(0) + '%' : 'Significant divergence'}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
      >
        <Activity size={12} className="text-purple-600 animate-pulse" />
        Pattern Shift
      </span>
    );
  }

  return (
    <span
      title="Behavioral metrics conform to expected baseline range"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
    >
      <CheckCircle2 size={12} className="text-slate-400" />
      Standard
    </span>
  );
};
