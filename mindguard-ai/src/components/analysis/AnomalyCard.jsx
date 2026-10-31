import { useState } from 'react';
import { Cpu, RotateCcw } from 'lucide-react';
import { analyzeEmployee } from '../../services/api.js';
import { fmt } from '../../utils/format.js';

const STATUS_TEXT = {
  insufficient_data: 'Not enough recorded activity for the anomaly model to score this period.',
  model_unavailable: 'The anomaly model has not been trained yet. Run python -m app.ml.train in the backend.',
};

/**
 * Isolation Forest result for one employee (backend only).
 * Shown when the employee payload includes `anomaly`, which only the
 * FastAPI backend returns. "Run analysis" calls POST /analyze/{id},
 * which recalculates everything and saves an assessment.
 */
export default function AnomalyCard({ employeeId, anomaly }) {
  const [state, setState] = useState({ running: false, error: null, result: null });
  const current = state.result?.anomaly ?? anomaly;

  const run = async () => {
    setState({ running: true, error: null, result: null });
    try {
      const { data } = await analyzeEmployee(employeeId);
      setState({ running: false, error: null, result: data });
    } catch (error) {
      setState({ running: false, error, result: null });
    }
  };

  const scored = current?.status === 'scored';
  const flagged = scored && current.detected;

  return (
    <section className="card p-6 sm:p-7" aria-labelledby="anomaly-heading" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-espresso ring-1 ring-beige">
            <Cpu className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 id="anomaly-heading" className="text-xl font-bold tracking-tight">
              AI pattern check
            </h2>
            <p className="mt-1 text-[15px] text-brown">Isolation Forest compares the last 7 days with the organisation’s usual work patterns.</p>
          </div>
        </div>
        <button type="button" onClick={run} disabled={state.running} className="btn-secondary">
          <RotateCcw className={`h-4 w-4 ${state.running ? 'animate-spin' : ''}`} aria-hidden="true" />
          {state.running ? 'Analysing…' : 'Run analysis'}
        </button>
      </div>

      <div className="mt-5">
        {scored ? (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ring-1 ring-inset ${
                flagged ? 'bg-honey/25 text-espresso ring-honey/60' : 'bg-sage/15 text-espresso ring-sage/40'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${flagged ? 'bg-honey' : 'bg-sage'}`} aria-hidden="true" />
              {flagged ? 'Unusual pattern' : 'Not flagged as unusual'}
            </span>
            <span className="text-[14px] text-brown">
              Anomaly score <span className="font-bold tabular-nums text-espresso">{fmt(current.anomalyScore, 3)}</span> (above 0 = flagged)
            </span>
          </div>
        ) : (
          <p className="text-[15px] text-brown">{STATUS_TEXT[current?.status] ?? 'No anomaly result available.'}</p>
        )}

        {scored && current.drivers?.length > 0 && (
          <div className="mt-4">
            <p className="label-xs mb-2">Furthest from the usual pattern</p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {current.drivers.map((d) => (
                <li key={d.feature} className="rounded-2xl bg-soft px-4 py-3">
                  <p className="text-[13px] font-semibold text-brown">{d.label}</p>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-espresso">
                    {fmt(d.value, 1)} <span className="text-[13px] font-medium text-brown">vs usual {fmt(d.baselineMedian, 1)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.result && (
          <div className="mt-4 rounded-2xl border border-beige px-4 py-3 text-[14px] text-espresso">
            <p className="font-bold">
              Analysis saved{state.result.assessment_id ? ` (assessment #${state.result.assessment_id})` : ''}.
            </p>
            <p className="mt-1 text-brown">{state.result.explanation}</p>
          </div>
        )}
        {state.error && (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-espresso">
            {state.error.message}
          </p>
        )}

        <p className="mt-4 text-[13px] text-brown">
          An unusual pattern means “different from the training baseline”. It is not evidence of overwork, burnout or any health condition, and it
          is kept separate from the indicator score above.
        </p>
      </div>
    </section>
  );
}
