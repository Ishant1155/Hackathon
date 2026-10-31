import { ShieldCheck } from 'lucide-react';

/** Calm notice that frames insights as supportive, not diagnostic. */
export default function DisclaimerBanner({ title = 'Supportive insights, not a diagnosis', children, className = '' }) {
  return (
    <div className={`flex gap-3.5 rounded-[20px] border border-beige bg-soft px-5 py-4 text-[15px] ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage/20 text-espresso">
        <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div>
        <p className="font-bold text-espresso">{title}</p>
        <div className="mt-0.5 leading-relaxed text-brown">{children}</div>
      </div>
    </div>
  );
}
