import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Calendar,
  Filter,
  History,
  ShieldCheck,
  ChevronRight,
  X,
  Send,
} from 'lucide-react';
import { Alert, AlertHistory } from '../types';
import { apiService } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

const STATUS_FILTERS = ['All', 'Open', 'Under Review', 'Follow-up Scheduled', 'Resolved'];

export const WellbeingAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Modal State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [reviewStatus, setReviewStatus] = useState<Alert['status']>('Open');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpCompleted, setFollowUpCompleted] = useState(false);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAlerts({
        status: statusFilter === 'All' ? undefined : statusFilter,
      });
      setAlerts(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const openReviewModal = async (alert: Alert) => {
    setSelectedAlert(alert);
    setReviewStatus(alert.status);
    setReviewerNotes(alert.reviewer_notes || '');
    setFollowUpDate(alert.follow_up_date || '');
    setFollowUpCompleted(alert.follow_up_completed);

    try {
      const history = await apiService.getAlertHistory(alert.id);
      setAlertHistory(history);
    } catch {
      setAlertHistory([]);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    setIsSubmitting(true);
    try {
      const updated = await apiService.updateAlert(selectedAlert.id, {
        status: reviewStatus,
        reviewer_notes: reviewerNotes,
        follow_up_date: followUpDate || undefined,
        follow_up_completed: followUpCompleted,
      });

      // Update in local state
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedAlert(null);
    } catch (err: any) {
      alert(`Error updating alert: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Wellbeing Alert Management</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Alerts are automatically triggered when an employee&apos;s sustained work pattern crosses elevated risk thresholds (Score &ge; 60).
          Authorized reviewers can record contextual check-in notes, schedule supportive check-ins, and track remediation.
        </p>

        {/* Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 mr-2 flex items-center gap-1.5">
            <Filter size={14} className="text-brand-600" />
            Filter by Status:
          </span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="h-7 w-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-medium">Loading wellbeing review queue...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCircle size={36} className="text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No Open Alerts</h3>
          <p className="text-xs text-slate-400 mt-1">
            No work patterns currently meet the elevated review threshold in this status category.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:border-brand-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                      <RiskBadge category={alert.risk_category} score={alert.risk_score} showScore size="sm" />
                    </div>
                    <span className="text-xs text-slate-400">
                      ID: {alert.id} • Target: <span className="font-semibold text-slate-700">{alert.employee_id}</span> • Created: {alert.created_date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      alert.status === 'Open'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : alert.status === 'Under Review'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : alert.status === 'Follow-up Scheduled'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {alert.status}
                  </span>

                  <button
                    onClick={() => openReviewModal(alert)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                  >
                    Manage & Review
                  </button>
                </div>
              </div>

              {/* Alert Content */}
              <div className="pt-3 space-y-2 text-xs">
                <p className="text-slate-700 leading-relaxed">{alert.explanation}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block font-medium">Observed Contributing Factors:</span>
                    <span className="text-slate-700 font-medium">{alert.contributing_factors}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200">
                    <span className="text-teal-700 block font-medium">Recommended Action:</span>
                    <span className="text-teal-900">{alert.recommended_action}</span>
                  </div>
                </div>

                {alert.reviewer_notes && (
                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-slate-700 mt-2">
                    <span className="font-bold text-amber-900 block text-[11px]">Reviewer Log:</span>
                    <p className="mt-0.5">{alert.reviewer_notes}</p>
                    {alert.follow_up_date && (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Follow-up Scheduled: <strong>{alert.follow_up_date}</strong>{' '}
                        {alert.follow_up_completed ? '(Completed)' : '(Pending)'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Remediation Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <h3 className="font-bold text-base">Alert Review Workflow</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Target Pattern:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedAlert.title}</p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alert Review Status:</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="Open">Open (Pending review)</option>
                  <option value="Under Review">Under Review (Assessment in progress)</option>
                  <option value="Follow-up Scheduled">Follow-up Scheduled (Check-in booked)</option>
                  <option value="Resolved">Resolved (Workload supportive action taken)</option>
                </select>
              </div>

              {/* Reviewer Context Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contextual Reviewer Notes:
                </label>
                <textarea
                  rows={3}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Record relevant context (e.g., end-of-quarter deadline surge, team staffing adjustment, supportive conversation completed)..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                ></textarea>
              </div>

              {/* Follow-up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Check-in Date:</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={followUpCompleted}
                      onChange={(e) => setFollowUpCompleted(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Follow-up Completed</span>
                  </label>
                </div>
              </div>

              {/* Audit Trail History */}
              {alertHistory.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
                    <History size={14} className="text-slate-500" />
                    Review Audit Trail:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {alertHistory.map((h) => (
                      <div key={h.id} className="p-2 rounded bg-slate-50 text-[11px] border border-slate-200">
                        <span className="font-semibold text-slate-700">{h.action}</span>
                        {h.note && <span className="text-slate-600"> — {h.note}</span>}
                        <span className="text-slate-400 block text-[10px]">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
