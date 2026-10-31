import { useId, useState } from 'react';
import { Info } from 'lucide-react';

/** Small accessible tooltip, shown on hover, focus or tap. */
export default function InfoTooltip({ text, label = 'More information', align = 'center' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const position = align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="grid h-6 w-6 place-items-center rounded-full text-brown transition-colors hover:bg-beige hover:text-espresso"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`animate-fade absolute top-full z-30 mt-2 w-64 rounded-2xl border border-beige bg-white px-3.5 py-2.5 text-[13px] font-medium normal-case leading-relaxed tracking-normal text-brown shadow-xl ${position}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
