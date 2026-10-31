import { useMemo, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import DisclaimerBanner from '../components/ui/DisclaimerBanner.jsx';
import InsightCard from '../components/insights/InsightCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getInsights } from '../services/api.js';
import { DEPARTMENTS, INSIGHT_TYPES } from '../utils/constants.js';

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'elevated', label: 'Suggest check-in' },
  { value: 'moderate', label: 'Worth watching' },
  { value: 'positive', label: 'Positive' },
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
        active ? 'border-espresso bg-espresso text-cream' : 'border-beige bg-white text-brown hover:border-caramel/50 hover:text-espresso'
      }`}
    >
      {children}
    </button>
  );
}

export default function Insights() {
  useDocumentTitle('Insights');
  const { data, loading, error, reload } = useApi((opts) => getInsights(opts), []);
  const [type, setType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [department, setDepartment] = useState('');

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(INSIGHT_TYPES).map((k) => [k, 0]));
    (data ?? []).forEach((i) => (counts[i.type] += 1));
    return counts;
  }, [data]);

  const visible = useMemo(
    () =>
      (data ?? []).filter(
        (i) => (type === 'all' || i.type === type) && (severity === 'all' || i.severity === severity) && (!department || i.department === department),
      ),
    [data, type, severity, department],
  );

  const reset = () => {
    setType('all');
    setSeverity('all');
    setDepartment('');
  };

  return (
    <>
      <PageHeader
        eyebrow="Explainable observations"
        title="Insights"
        description="Each observation explains what changed, which periods were compared and why it may be worth a supportive conversation. They describe work patterns, not people’s health."
      />

      {loading && <LoadingState label="Loading insights…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <div className="card-soft mb-8 space-y-4 p-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by observation type">
              <Chip active={type === 'all'} onClick={() => setType('all')}>
                All types <span className="tabular-nums opacity-80">{data.length}</span>
              </Chip>
              {Object.entries(INSIGHT_TYPES).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <Chip key={key} active={type === key} onClick={() => setType(type === key ? 'all' : key)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {meta.label}
                    <span className="tabular-nums opacity-80">{typeCounts[key]}</span>
                  </Chip>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="overflow-x-auto">
                <SegmentedControl label="Filter by attention level" options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} size="sm" />
              </div>
              <div className="relative">
                <label htmlFor="insight-dept" className="sr-only">
                  Department
                </label>
                <select
                  id="insight-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input w-full cursor-pointer appearance-none rounded-full pr-10 font-semibold sm:w-52"
                >
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown" aria-hidden="true" />
              </div>
            </div>
          </div>

          <p className="mb-4 text-[14px] text-brown" aria-live="polite">
            <span className="font-bold text-espresso">{visible.length}</span> of {data.length} observations
          </p>

          {visible.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {visible.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                icon={Lightbulb}
                title="No observations match"
                message="Try another type, attention level or department."
                action={
                  <button type="button" onClick={reset} className="btn-secondary">
                    Reset filters
                  </button>
                }
              />
            </div>
          )}

          <DisclaimerBanner className="mt-8">
            Insights come from simulated activity using illustrative rules (for example, weekday hours up by 45 minutes or more). They are prompts
            for a caring conversation about workload, not a diagnosis, a performance rating or a reason for disciplinary action.
          </DisclaimerBanner>
        </>
      )}
    </>
  );
}
