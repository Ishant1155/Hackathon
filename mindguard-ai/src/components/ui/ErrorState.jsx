import { RotateCcw, TriangleAlert } from 'lucide-react';

export default function ErrorState({ error, title = 'Could not load data', onRetry, action, className = '' }) {
  return (
    <div role="alert" className={`card flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-honey/25 text-espresso">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-md text-[15px] text-brown">{error?.message || 'An unexpected error occurred.'}</p>
      {error?.status && <p className="mt-1 text-[13px] text-brown">Status {error.status}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <button type="button" className="btn-secondary" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
