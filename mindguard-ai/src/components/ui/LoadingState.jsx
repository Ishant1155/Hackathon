import { LogoMark } from '../brand/Logo.jsx';

function Block({ className = '' }) {
  return <div className={`animate-pulse rounded-[20px] bg-beige/60 ${className}`} />;
}

/**
 * Loading placeholder.
 *  variant="page"   skeleton with KPI row and chart blocks
 *  variant="block"  single skeleton block (set height via className)
 *  variant="inline" logo pulse and label
 *  variant="screen" full-height branded loader
 */
export default function LoadingState({ variant = 'page', label = 'Loading…', className = '' }) {
  if (variant === 'inline' || variant === 'screen') {
    return (
      <div
        role="status"
        className={`flex items-center gap-3 text-[15px] font-medium text-brown ${variant === 'screen' ? 'min-h-[50vh] flex-col justify-center' : ''} ${className}`}
      >
        <LogoMark size={variant === 'screen' ? 48 : 24} className="animate-pulse" />
        {label}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <div role="status" aria-label={label} className={className}>
        <Block className="h-full min-h-40 w-full" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} className={`space-y-6 ${className}`}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-44" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Block className="h-96 lg:col-span-2" />
        <Block className="h-96" />
      </div>
      <Block className="h-64" />
    </div>
  );
}
