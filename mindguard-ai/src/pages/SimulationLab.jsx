import { useMemo, useState } from 'react';
import { Beaker, RotateCcw, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ChartCard from '../components/ui/ChartCard.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import DisclaimerBanner from '../components/ui/DisclaimerBanner.jsx';
import FactorBreakdown from '../components/charts/FactorBreakdown.jsx';
import ScoreGauge from '../components/simulation/ScoreGauge.jsx';
import SliderControl from '../components/simulation/SliderControl.jsx';
import { useSimulation } from '../hooks/useSimulation.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { DEFAULT_INPUTS, FACTOR_WEIGHTS, SCORE_THRESHOLDS, SIMULATION_PRESETS, SLIDER_CONFIG } from '../utils/simulation.js';
import { LEVEL_META } from '../utils/constants.js';

const sameInputs = (a, b) => SLIDER_CONFIG.every(({ key }) => a[key] === b[key]);

function ThresholdScale({ score, thresholds }) {
  const segments = [
    { level: 'low', from: 0, to: thresholds.moderate },
    { level: 'moderate', from: thresholds.moderate, to: thresholds.elevated },
    { level: 'elevated', from: thresholds.elevated, to: 100 },
  ];
  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 gap-1 overflow-hidden">
          {segments.map((s) => (
            <div key={s.level} className="rounded-full" style={{ width: `${s.to - s.from}%`, background: LEVEL_META[s.level].color, opacity: 0.55 }} />
          ))}
        </div>
        <span
          className="absolute -top-1.5 h-5.5 w-1.5 -translate-x-1/2 rounded-full bg-espresso shadow transition-[left] duration-500 ease-out"
          style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 text-[12px] font-semibold text-brown">
        <span>Low · 0–{thresholds.moderate - 1}</span>
        <span className="text-center">
          Moderate · {thresholds.moderate}–{thresholds.elevated - 1}
        </span>
        <span className="text-right">Elevated · {thresholds.elevated}+</span>
      </div>
    </div>
  );
}

const WEIGHT_ROWS = [
  { label: 'Working hours', rule: `${FACTOR_WEIGHTS.avgWorkingHours.perUnit} pts per hour above 8 h/day`, max: FACTOR_WEIGHTS.avgWorkingHours.max },
  { label: 'Break frequency', rule: `${FACTOR_WEIGHTS.dailyBreaks.perUnit} pts per break below 3/day`, max: FACTOR_WEIGHTS.dailyBreaks.max },
  { label: 'Late-night activity', rule: `${FACTOR_WEIGHTS.lateNightSessions.perUnit} pts per session per week`, max: FACTOR_WEIGHTS.lateNightSessions.max },
  { label: 'Weekend work', rule: `${FACTOR_WEIGHTS.weekendDays.perUnit} pts per weekend day per week`, max: FACTOR_WEIGHTS.weekendDays.max },
  { label: 'Productivity change', rule: `${FACTOR_WEIGHTS.productivityChange.perUnit} pts per 1% decline`, max: FACTOR_WEIGHTS.productivityChange.max },
];

export default function SimulationLab() {
  useDocumentTitle('Simulation Lab');
  const [inputs, setInputs] = useState(() => ({ ...DEFAULT_INPUTS }));
  const { result, error } = useSimulation(inputs);

  const activePreset = useMemo(() => SIMULATION_PRESETS.find((p) => sameInputs(p.inputs, inputs))?.id ?? null, [inputs]);
  const isDefault = sameInputs(inputs, DEFAULT_INPUTS);
  const contributing = useMemo(() => new Set((result?.factors ?? []).filter((f) => f.points > 0).map((f) => f.key)), [result]);

  // With the backend connected, show the rules it actually applied.
  const weightRows = result?.rules?.length ? result.rules.map((r) => ({ label: r.label, rule: r.rule, max: r.points })) : WEIGHT_ROWS;

  const updateInput = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }));
  const reset = () => setInputs({ ...DEFAULT_INPUTS });

  return (
    <>
      <PageHeader
        eyebrow="Hypothetical scenarios"
        title="Simulation Lab"
        description="Move the sliders and watch the illustrative indicator respond instantly, with every factor explained. Nothing here relates to a real person."
        actions={
          <button type="button" className="btn-secondary" onClick={reset} disabled={isDefault}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        }
      />

      <div className="mb-8 flex items-start gap-3 rounded-[20px] border border-honey/60 bg-honey/15 px-5 py-4 text-[15px] text-espresso">
        <Beaker className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <p>
          <span className="font-bold">Hypothetical demonstration.</span> This is not an assessment of any employee, and the scoring model is
          illustrative, not scientifically validated.
        </p>
      </div>

      <section aria-labelledby="presets-heading" className="mb-8">
        <h2 id="presets-heading" className="mb-4 text-xl font-bold tracking-tight">
          Start from a scenario
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SIMULATION_PRESETS.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => setInputs({ ...preset.inputs })}
                className={`card card-interactive group p-5 text-left ${active ? 'border-caramel! ring-2 ring-caramel/30' : ''}`}
              >
                <span className="flex items-center gap-2 text-[16px] font-bold text-espresso">
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${active ? 'bg-caramel text-white' : 'bg-cream text-espresso'}`}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {preset.name}
                </span>
                <span className="mt-3 block text-[14px] leading-relaxed text-brown">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="inputs-heading" className="card p-6 sm:p-7 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="inputs-heading" className="text-xl font-bold tracking-tight">
              Work pattern
            </h2>
            <span className="rounded-full bg-cream px-3 py-1 text-[13px] font-semibold text-espresso">
              {activePreset ? 'Preset applied' : isDefault ? 'Reference schedule' : 'Custom scenario'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {SLIDER_CONFIG.map((config) => (
              <SliderControl key={config.key} config={config} value={inputs[config.key]} onChange={updateInput} contributing={contributing.has(config.key)} />
            ))}
            <div className="flex flex-col justify-center rounded-[20px] border border-dashed border-beige p-5 text-[14px] leading-relaxed text-brown">
              <p className="font-bold text-espresso">Reference schedule</p>
              <p className="mt-1">8 h days, 3 breaks, no late nights or weekend work, and no change in productivity. This scores 0. Inputs that add points are highlighted.</p>
            </div>
          </div>
        </section>

        <div className="lg:col-span-2">
          <section aria-labelledby="result-heading" className="card p-6 sm:p-7 lg:sticky lg:top-24" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h2 id="result-heading" className="text-xl font-bold tracking-tight">
                Simulated indicator
              </h2>
              {result && <RiskBadge level={result.level} />}
            </div>

            {error && <ErrorState error={error} title="Simulation failed" className="mt-4 border-0 shadow-none" />}
            {!result && !error && <LoadingState variant="inline" label="Calculating…" className="mt-6" />}

            {result && (
              <>
                <div className="mt-6">
                  <ScoreGauge score={result.score} level={result.level} thresholds={result.thresholds ?? SCORE_THRESHOLDS} />
                </div>
                <div className="mt-6">
                  <ThresholdScale score={result.score} thresholds={result.thresholds ?? SCORE_THRESHOLDS} />
                </div>
                <p className="mt-6 text-[15px] leading-relaxed text-espresso">{result.summary}</p>

                <div className="mt-7 border-t border-beige pt-6">
                  <h3 className="mb-5 text-[16px] font-bold">Which factors affected the result</h3>
                  <FactorBreakdown factors={result.factors} />
                </div>
                <p className="mt-6 text-[13px] leading-relaxed text-brown">{result.disclaimer}</p>
              </>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="How the demo score works" subtitle="Each factor adds points up to a cap. Caps add up to 100.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[15px]">
              <caption className="sr-only">Illustrative weighting rules</caption>
              <thead>
                <tr className="text-left text-[12px] font-bold tracking-[0.06em] text-brown uppercase">
                  <th scope="col" className="pb-3">Factor</th>
                  <th scope="col" className="pb-3">Rule</th>
                  <th scope="col" className="pb-3 text-right">Cap</th>
                </tr>
              </thead>
              <tbody>
                {weightRows.map((row) => (
                  <tr key={row.label} className="border-t border-beige">
                    <td className="py-3 font-bold text-espresso">{row.label}</td>
                    <td className="py-3 text-brown">{row.rule}</td>
                    <td className="py-3 text-right font-semibold tabular-nums text-espresso">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        <div className="lg:col-span-2">
          <DisclaimerBanner title="Why the numbers are illustrative">
            The weights and thresholds were picked to make the demo easy to follow. They have not been tested against any health outcome. A
            production system would need validation with occupational health experts, employee consent and clear data governance. The calculation
            lives in <code className="rounded bg-white px-1 text-espresso">src/utils/simulation.js</code> and can be swapped for the{' '}
            <code className="rounded bg-white px-1 text-espresso">POST /simulate</code> API.
          </DisclaimerBanner>
        </div>
      </div>
    </>
  );
}
