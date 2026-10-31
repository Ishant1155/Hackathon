/**
 * Accessible segmented toggle (radio group semantics, arrow-key support).
 * @param {{ options: {value:any,label:string}[], value:any, onChange:(v:any)=>void, label:string, size?: 'sm'|'md' }} props
 */
export default function SegmentedControl({ options, value, onChange, label, size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-[14px]';

  const onKeyDown = (event) => {
    const index = options.findIndex((o) => o.value === value);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = options[(index + 1) % options.length];
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = options[(index - 1 + options.length) % options.length];
    if (next) {
      event.preventDefault();
      const group = event.currentTarget;
      onChange(next.value);
      requestAnimationFrame(() => group.querySelector('[aria-checked="true"]')?.focus());
    }
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-flex rounded-full border border-beige bg-soft p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full font-semibold transition-[background-color,color,box-shadow] duration-200 ${pad} ${
              selected ? 'bg-white text-espresso shadow-sm ring-1 ring-beige' : 'text-brown hover:text-espresso'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
