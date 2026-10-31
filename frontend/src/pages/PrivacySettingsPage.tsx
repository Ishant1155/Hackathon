import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileText,
  Sliders,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { SettingsData } from '../types';

export const PrivacySettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    hours_weight: 25.0,
    late_night_weight: 20.0,
    task_trend_weight: 25.0,
    breaks_weight: 15.0,
    weekend_weight: 15.0,
    anomaly_bonus_max: 5.0,
    alert_risk_threshold: 60.0,
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    apiService
      .getSettings()
      .then((data) => setSettings(data))
      .catch(console.error);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      const updated = await apiService.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (confirm('Regenerate the entire 100-employee synthetic dataset? This resets telemetry and re-runs anomaly detection.')) {
      setRegenerating(true);
      try {
        await apiService.regenerateData();
        alert('Synthetic dataset successfully regenerated!');
      } catch (err: any) {
        alert(`Failed to regenerate: ${err.message}`);
      } finally {
        setRegenerating(false);
      }
    }
  };

  const privacySafeguards = [
    { title: 'No Keystroke Monitoring', desc: 'MindGuard AI does not log individual keystrokes, typing velocity, or text entered.' },
    { title: 'No Screen Captures', desc: 'Zero visual tracking, desktop recording, or webcam surveillance is ever conducted.' },
    { title: 'No Private Communications Inspection', desc: 'Private emails, Slack direct messages, and personal files are strictly excluded.' },
    { title: 'No Personal Web Browsing Tracking', desc: 'Off-work personal browsing and search histories are never accessed or ingested.' },
    { title: 'Non-Clinical & Non-Diagnostic', desc: 'Scores represent early organizational workload patterns, not medical diagnoses of burnout or depression.' },
    { title: 'No Automated Disciplinary Actions', desc: 'Platform principles forbid automated employment or punitive decisions based on telemetry.' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-teal-600" />
          <h2 className="text-base font-bold text-slate-900">Privacy Safeguards & Analysis Configuration</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
          MindGuard AI is engineered strictly for supportive organizational workload intelligence. Below are the enforced
          ethical privacy boundaries and transparent risk calibration settings.
        </p>
      </div>

      {/* Ethical Safeguards Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Lock size={16} className="text-teal-600" />
            Core Privacy & Responsible AI Safeguards
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            Enforced in MVP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {privacySafeguards.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-600" />
                {item.title}
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Engine Scoring Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders size={16} className="text-brand-600" />
              Adjustable Wellbeing Risk Weights
            </h3>
            <p className="text-xs text-slate-500">
              Configure transparent factor weights (Total baseline adds to 100 points max).
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={13} /> Saved in Database!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Extended Hours Weight (pts):
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={settings.hours_weight}
                onChange={(e) => setSettings({ ...settings, hours_weight: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Late-Night Activity Weight (pts):
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={settings.late_night_weight}
                onChange={(e) => setSettings({ ...settings, late_night_weight: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Task Trend Decline Weight (pts):
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={settings.task_trend_weight}
                onChange={(e) => setSettings({ ...settings, task_trend_weight: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reduced Breaks Weight (pts):
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={settings.breaks_weight}
                onChange={(e) => setSettings({ ...settings, breaks_weight: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Weekend Work Weight (pts):
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={settings.weekend_weight}
                onChange={(e) => setSettings({ ...settings, weekend_weight: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alert Trigger Threshold (Score &ge;):
              </label>
              <input
                type="number"
                step="5"
                min="40"
                max="90"
                value={settings.alert_risk_threshold}
                onChange={(e) => setSettings({ ...settings, alert_risk_threshold: parseFloat(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-slate-500 text-[11px]">
              Weights define transparent scoring logic in SQLite <code>application_settings</code> table.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-brand-600 text-white font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Synthetic Dataset Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Synthetic Dataset Operations</h3>
          <p className="text-xs text-slate-500">
            Reset, regenerate, and retrain the Isolation Forest model on 100 fresh simulated employees (3,000 records).
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={14} className={regenerating ? 'animate-spin text-brand-600' : ''} />
          <span>{regenerating ? 'Regenerating Records...' : 'Regenerate 100-Employee Dataset'}</span>
        </button>
      </div>
    </div>
  );
};
