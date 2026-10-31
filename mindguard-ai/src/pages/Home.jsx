import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  ChevronRight,
  FlaskConical,
  History,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Telescope,
  TrendingUp,
  UserRound,
  Users,
  Waypoints,
} from 'lucide-react';
import ForecastChart from '../components/forecast/ForecastChart.jsx';
import ForecastSummary from '../components/forecast/ForecastSummary.jsx';
import DailyForecast from '../components/forecast/DailyForecast.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getForecast } from '../services/api.js';
import { SEVERITY_META } from '../utils/constants.js';
import { fmt, formatDate, pctChange } from '../utils/format.js';

/* ------------------------------------------------------------------ */
/* Hero preview: a live, interactive slice of the forecasting engine    */
/* ------------------------------------------------------------------ */

function HeroPreview({ forecast, loading, error, onRetry }) {
  const weekdays = useMemo(() => forecast?.days.filter((d) => !d.isWeekend) ?? [], [forecast]);
  const [selected, setSelected] = useState(0);

  if (loading) return <div className="h-[460px] w-full animate-pulse rounded-[28px] bg-beige/60" role="status" aria-label="Loading forecast preview" />;
  if (error) {
    return (
      <div className="card grid h-[460px] place-items-center p-8 text-center" role="alert">
        <div>
          <p className="text-lg font-bold text-espresso">The forecast preview could not load.</p>
          <button type="button" onClick={onRetry} className="btn-secondary mt-4">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const day = weekdays[selected] ?? weekdays[0];
  const s = forecast.summary;
  const topInsight = forecast.insights[0];

  return (
    <div className="card relative overflow-hidden p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-xs">Next 7 days · All employees</p>
          <p className="mt-1 text-[15px] font-semibold text-espresso">{forecast.horizon.display}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3 py-1 text-[12px] font-bold text-espresso">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Live forecast
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div aria-live="polite">
          <p className="text-[14px] font-semibold text-brown">{formatDate(day.date, { weekday: 'long' })} · predicted</p>
          <p className="metric text-[64px] leading-none sm:text-[76px]">
            {fmt(day.predictedHours, 1)}
            <span className="ml-1 text-2xl font-semibold tracking-normal text-brown">h</span>
          </p>
          <p className="mt-1 text-[14px] text-brown">
            Range {fmt(day.lower, 1)}–{fmt(day.upper, 1)} h · {fmt(day.predictedOvertime, 0)} h overtime
          </p>
        </div>
        <div>
          <p className="mb-2 text-right text-[12px] font-semibold text-brown">Choose a day</p>
          <div role="radiogroup" aria-label="Forecast day" className="flex gap-2">
            {weekdays.map((d, i) => (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={i === selected}
                aria-label={formatDate(d.date, { weekday: 'long' })}
                onClick={() => setSelected(i)}
                className={`grid h-11 w-11 place-items-center rounded-full text-[13px] font-bold transition-[background-color,color,transform] duration-200 hover:scale-105 ${
                  i === selected ? 'bg-espresso text-cream' : 'bg-soft text-espresso ring-1 ring-beige hover:bg-beige'
                }`}
              >
                {formatDate(d.date, { weekday: 'short', month: undefined, day: undefined }).slice(0, 2)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 -mx-1">
        <ForecastChart history={forecast.history} days={forecast.days} height={170} compact />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Avg hours', value: `${fmt(s.predictedAvgHours, 1)} h`, delta: pctChange(s.predictedAvgHours, s.recentAvgHours), good: 'down' },
          { label: 'Overtime', value: `${fmt(s.predictedOvertime, 0)} h`, delta: s.overtimeChangePct, good: 'down' },
          { label: 'Breaks / day', value: fmt(s.predictedBreaks, 1), delta: pctChange(s.predictedBreaks, s.recentBreaks), good: 'up' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-soft px-3 py-3">
            <p className="text-[12px] font-semibold text-brown">{k.label}</p>
            <p className="metric mt-0.5 text-xl">{k.value}</p>
            <TrendDelta value={k.delta} goodDirection={k.good} className="mt-1" />
          </div>
        ))}
      </div>

      {topInsight && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-beige px-4 py-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-caramel" aria-hidden="true" />
          <p className="text-[14px] leading-snug text-espresso">
            <span className="font-bold">{topInsight.title}.</span> <span className="text-brown">Forecast-based insight.</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section content                                                     */
/* ------------------------------------------------------------------ */

const INTRO = [
  {
    icon: History,
    title: 'Understand Work Patterns',
    body: 'Analyse historical working hours, breaks, overtime and productivity patterns against each person’s own baseline.',
  },
  {
    icon: Telescope,
    title: 'Predict What’s Ahead',
    body: 'Forecast employee workload trends over the next seven days using a model fitted to each person’s history.',
  },
  {
    icon: Waypoints,
    title: 'Support Better Decisions',
    body: 'Provide actionable, explainable insights that help organisations distribute workloads more effectively.',
  },
];

const STEPS = [
  { n: '01', title: 'Collect Work Patterns', body: 'Sisyphus analyses simulated or connected historical work activity: hours, breaks, late sessions and weekends.' },
  { n: '02', title: 'AI Forecasting', body: 'A forecasting model identifies each person’s trend and predicts the next seven days, with a range of likely outcomes.' },
  { n: '03', title: 'Supportive Insights', body: 'Predictions become clear, plain-language recommendations for better workload management, never diagnoses.' },
];

const FEATURES = [
  { icon: CalendarClock, title: 'Seven-Day Workload Prediction', body: 'Hours, overtime and breaks forecast for every person and department, with 80% ranges.', to: '/forecast' },
  { icon: Lightbulb, title: 'Explainable AI Insights', body: 'Every observation says what changed, which periods were compared and why it matters.', to: '/insights' },
  { icon: UserRound, title: 'Employee Work Pattern Analysis', body: 'Individual profiles compare recent weeks with each person’s own baseline.', to: '/employees' },
  { icon: Building2, title: 'Department Workload Comparison', body: 'See at a glance which teams are carrying the most and how that is changing.', to: '/dashboard' },
  { icon: FlaskConical, title: 'Interactive Simulation Lab', body: 'Move a slider and watch an illustrative score respond, with every factor explained.', to: '/simulation' },
  { icon: TrendingUp, title: 'Historical Trend Analysis', body: 'Compare 7-day and 30-day windows for hours, productivity, breaks and weekend work.', to: '/trends' },
];

function SectionHeading({ eyebrow, title, children, align = 'center' }) {
  return (
    <Reveal className={`mx-auto max-w-3xl ${align === 'center' ? 'text-center' : ''}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="headline">{title}</h2>
      {children && <p className="mt-5 text-lg leading-relaxed text-brown sm:text-xl">{children}</p>}
    </Reveal>
  );
}

export default function Home() {
  useDocumentTitle();
  const { data: forecast, loading, error, reload } = useApi((opts) => getForecast(opts), []);
  const [selectedDay, setSelectedDay] = useState(2);

  return (
    <>
      {/* 1 · Hero */}
      <section id="top" className="scroll-mt-24 px-3 pb-20 pt-4 sm:px-5">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[36px] border border-beige bg-soft px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
          <div
            className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-caramel/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-rise">
              <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-beige bg-white/70 px-3.5 py-1.5">
                <Sparkles className="h-4 w-4 text-caramel" aria-hidden="true" /> Seven-day workload forecasting
              </p>
              <h1 className="display">Understand Work Patterns. Build Healthier Workplaces.</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-brown sm:text-xl">
                Sisyphus uses intelligent workload forecasting to help organisations understand changing work patterns, anticipate workload
                increases and support healthier working environments.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/dashboard" className="btn-primary px-6 py-3 text-base">
                  Explore AI Dashboard
                </Link>
                <a href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
                  Discover How It Works
                </a>
              </div>
            </div>
            <div className="animate-rise [animation-delay:120ms]">
              <HeroPreview forecast={forecast} loading={loading && !forecast} error={error} onRetry={reload} />
            </div>
          </div>
          <p className="relative mt-14 text-center text-[17px] font-semibold text-espresso">
            Healthier work, <span className="text-brown">seen seven days ahead.</span>
          </p>
        </div>
      </section>

      {/* 2 · Introduction */}
      <section id="about" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <SectionHeading eyebrow="Why Sisyphus" title="Better Insights. More Supportive Workplaces.">
            Long hours rarely appear overnight. They build slowly, week after week, until they become the norm. Sisyphus makes those
            patterns visible early so teams can rebalance work before it turns into sustained overwork.
          </SectionHeading>
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {INTRO.map((item, i) => (
              <Reveal key={item.title} delay={i * 90} className="card p-8">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-caramel/15 text-espresso">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-brown">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · Forecast showcase */}
      <section id="forecasting" className="scroll-mt-24 bg-soft px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <SectionHeading eyebrow="AI Forecasting" title="See the Next Seven Days Before They Happen.">
            Sisyphus analyses historical work patterns to forecast upcoming workload trends, helping teams identify potential pressure points
            before they become sustained problems.
          </SectionHeading>

          <Reveal className="mt-14">
            {loading && !forecast && <div className="h-[640px] animate-pulse rounded-[28px] bg-beige/60" role="status" aria-label="Loading forecast" />}
            {error && (
              <div className="card p-10 text-center" role="alert">
                <p className="text-lg font-bold text-espresso">The forecast could not load.</p>
                <p className="mt-1 text-brown">{error.message}</p>
                <button type="button" onClick={reload} className="btn-secondary mt-5">
                  Try again
                </button>
              </div>
            )}
            {forecast && (
              <div className="rounded-[32px] border border-beige bg-white p-5 shadow-[0_30px_80px_-50px_rgba(94,48,35,0.45)] sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="label-xs">Organisation forecast</p>
                    <p className="mt-1 text-2xl font-bold text-espresso">{forecast.horizon.display}</p>
                  </div>
                  <p className="max-w-sm text-[14px] text-brown">
                    {forecast.model.name}. Back-tested error: ±{fmt(forecast.model.backtest.maeHours, 2)} h per day, against ±
                    {fmt(forecast.model.backtest.naiveMaeHours, 2)} h for a simple average.
                  </p>
                </div>

                <ForecastSummary summary={forecast.summary} className="mt-8" />

                <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                  <div>
                    <p className="mb-3 text-[15px] font-bold text-espresso">Predicted weekday hours per person</p>
                    <ForecastChart history={forecast.history} days={forecast.days} height={320} />
                  </div>
                  <div>
                    <p className="mb-3 text-[15px] font-bold text-espresso">What the model expects</p>
                    <ul className="space-y-3">
                      {forecast.insights.slice(0, 4).map((ins) => (
                        <li key={ins.id} className="rounded-2xl bg-soft p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${SEVERITY_META[ins.tone].className}`}>
                            {SEVERITY_META[ins.tone].label}
                          </span>
                          <p className="mt-2 text-[15px] font-bold leading-snug text-espresso">{ins.title}</p>
                          <p className="mt-1 text-[14px] leading-relaxed text-brown">{ins.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <DailyForecast days={forecast.days} selected={selectedDay} onSelect={setSelectedDay} />
                </div>

                <div className="mt-10 flex justify-center">
                  <Link to="/forecast" className="btn-primary px-6 py-3 text-base">
                    Explore the Forecasting Engine <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* 4 · How it works */}
      <section id="how-it-works" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <SectionHeading eyebrow="How It Works" title="Three steps from activity to action." />
          <ol className="mt-16 grid border-t border-beige md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal
                as="li"
                key={step.n}
                delay={i * 110}
                className={`border-b border-beige py-10 md:border-b-0 md:px-8 md:py-12 ${i > 0 ? 'md:border-l' : 'md:pl-0'}`}
              >
                <span className="metric text-[64px] leading-none text-brown">{step.n}</span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-brown">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 · Features */}
      <section id="features" className="scroll-mt-24 bg-soft px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <SectionHeading eyebrow="Features" title="Everything you need to see workload clearly." />
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <Link to={f.to} className="card card-interactive group flex h-full flex-col p-8">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-cream text-espresso ring-1 ring-beige transition-colors group-hover:bg-caramel/15">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-xl font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-brown">{f.body}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-[14px] font-semibold text-espresso">
                    Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Final CTA */}
      <section className="px-3 py-24 sm:px-5 lg:py-28">
        <Reveal className="mx-auto max-w-[1280px] overflow-hidden rounded-[36px] bg-espresso px-6 py-20 text-center sm:px-12 lg:py-28">
          <Users className="mx-auto h-8 w-8 text-caramel" aria-hidden="true" />
          <h2 className="headline mx-auto mt-6 max-w-3xl text-cream">Build a More Balanced Way of Working.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-beige">
            Turn workplace activity patterns into meaningful insights and more supportive decisions.
          </p>
          <Link to="/dashboard" className="btn-primary mt-10 px-7 py-3 text-base">
            Explore Sisyphus
          </Link>
        </Reveal>
      </section>
    </>
  );
}
