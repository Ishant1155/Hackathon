import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  Play,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';

interface AiAnalysisPageProps {
  onSelectEmployeeProfile: (id: string) => void;
}

export const AiAnalysisPage: React.FC<AiAnalysisPageProps> = ({
  onSelectEmployeeProfile,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState('EMP-003');
  const [days, setDays] = useState(30);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.runAnalysis(selectedEmpId, days);
      setAnalysis(res);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [selectedEmpId, days]);

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={18} className="text-brand-600" />
          <h2 className="text-base font-bold text-slate-900">AI Model & Risk Engine Architecture</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
          MindGuard AI pairs an unsupervised <strong>Scikit-learn Isolation Forest</strong> model with an explainable
          rule-based risk engine. The Isolation Forest detects statistical divergence across 10 behavioral dimensions,
          while the risk engine translates sustained multi-week patterns into transparent, non-punitive guidance.
        </p>
      </div>

      {/* Target Employee Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Target Employee ID:</span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-bold text-slate-800"
          >
            <option value="EMP-001">EMP-001 (Alice Chen - Healthy Benchmark)</option>
            <option value="EMP-002">EMP-002 (Marcus Vance - Occasional Overtime)</option>
            <option value="EMP-003">EMP-003 (Elena Rostova - Sustained Overwork)</option>
            <option value="EMP-004">EMP-004 (Employee 004)</option>
            <option value="EMP-005">EMP-005 (Employee 005)</option>
            <option value="EMP-010">EMP-010 (Employee 010)</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Observation Window:</span>
          {[14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                days === d ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {d} Days
            </button>
          ))}

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center gap-1.5 ml-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Play size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Output */}
      {analysis && (
        <div className="space-y-6">
          {/* Dual Engine Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engine 1: Isolation Forest */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Engine 1: Machine Learning Outlier Detection
                  </span>
                  <AnomalyBadge isAnomaly={analysis.anomaly_detection.is_anomaly} score={analysis.anomaly_detection.anomaly_score} />
                </div>
                <h3 className="text-base font-bold">Scikit-Learn IsolationForest (100 Trees)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluates 10 behavioral dimensions in multidimensional feature space without predefined rules.
                </p>
              </div>

              <div className="my-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Model Decision Score:</span>
                  <span className="font-mono font-bold text-teal-400">
                    {analysis.anomaly_detection.raw_decision_score.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Normalized Anomaly Index:</span>
                  <span className="font-mono font-bold text-purple-300">
                    {(analysis.anomaly_detection.anomaly_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Outlier Status:</span>
                  <span className="font-semibold text-white">
                    {analysis.anomaly_detection.is_anomaly ? 'Statistically Anomalous' : 'Within Normal Bounds'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                {analysis.anomaly_detection.interpretation}
              </p>
            </div>

            {/* Engine 2: Explainable Risk Scoring */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    Engine 2: Transparent Wellbeing Scoring
                  </span>
                  <RiskBadge category={analysis.risk_category} score={analysis.overall_risk_score} showScore />
                </div>
                <h3 className="text-base font-bold text-slate-900">Explainable Multi-Indicator Rubric</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Combines persistent hours, late nights, task trends, breaks, and weekend work into a 0-100 score.
                </p>
              </div>

              <div className="my-4 space-y-1.5">
                {analysis.contributing_factors.map((cf: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium">{cf.title}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {cf.score.toFixed(1)} / {cf.max_score.toFixed(1)} pts
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-100 text-xs text-brand-900 leading-relaxed">
                <strong>Plain-Language Summary:</strong> &ldquo;{analysis.primary_explanation}&rdquo;
              </div>
            </div>
          </div>

          {/* Actionable Next Steps */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-600" />
              Recommended Supportive Organizational Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {analysis.recommended_next_steps.map((step: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-teal-50/50 border border-teal-200 text-teal-950 leading-relaxed">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
