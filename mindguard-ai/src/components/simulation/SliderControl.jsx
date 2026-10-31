import { useId } from 'react';

function formatValue(value, step) {
  return step < 1 ? Number(value).toFixed(1) : String(value);
}

/** Labelled range input with live value, bounds and help text. */
export default function SliderControl({ config, value, onChange, contributing }) {
  const id = useId();
  const helpId = `${id}-help`;
  const fill = ((value - config.min) / (config.max - config.min)) * 100;
  const display = formatValue(value, config.step);

  return (
    <div className={`rounded-[20px] border p-5 transition-colors duration-300 ${contributing ? 'border-honey/60 bg-honey/10' : 'border-beige bg-soft'}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-bold text-espresso">
          {config.label}
        </label>
        <output htmlFor={id} className="whitespace-nowrap text-right">
          <span className="metric text-2xl">
            {config.key === 'productivityChange' && value > 0 ? '+' : ''}
            {display}
          </span>
          <span className="ml-1 text-[13px] font-medium text-brown">{config.unit}</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(config.key, Number(e.target.value))}
        aria-describedby={helpId}
        aria-valuetext={`${display} ${config.unit}`}
        style={{ '--range-fill': `${fill}%`, '--range-color': contributing ? '#D6A45D' : '#C08552' }}
      />
      <div className="mt-2 flex justify-between text-[12px] font-medium tabular-nums text-brown" aria-hidden="true">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
      <p id={helpId} className="mt-2 text-[13px] leading-relaxed text-brown">
        {config.help}
        {contributing && <span className="font-semibold text-espresso"> Adds to the score.</span>}
      </p>
    </div>
  );
}
