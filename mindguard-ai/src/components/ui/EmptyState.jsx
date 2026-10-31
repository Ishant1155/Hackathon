import { SearchX } from 'lucide-react';

export default function EmptyState({ icon: Icon = SearchX, title = 'Nothing to show', message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream text-brown">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-[15px] text-brown">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
