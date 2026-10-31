/** Large editorial page header used by every dashboard page. */
export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-10 flex flex-col gap-6 pt-2 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">{title}</h1>
        {description && <p className="mt-4 text-lg leading-relaxed text-brown">{description}</p>}
        {children}
      </div>
      {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
