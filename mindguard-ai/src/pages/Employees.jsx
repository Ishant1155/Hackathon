import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import EmployeeFilters from '../components/employees/EmployeeFilters.jsx';
import EmployeeTable from '../components/employees/EmployeeTable.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getEmployees } from '../services/api.js';
import { DEFAULT_SORT, filterEmployees, nextSort, sortEmployees, SORT_ACCESSORS } from '../utils/employeeFilters.js';
import { LEVEL_META } from '../utils/constants.js';

export default function Employees() {
  useDocumentTitle('Employees');
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useApi((opts) => getEmployees(opts), []);

  const filters = {
    q: params.get('q') ?? '',
    dept: params.get('dept') ?? '',
    level: LEVEL_META[params.get('level')] ? params.get('level') : '',
  };
  const sortKey = SORT_ACCESSORS[params.get('sort')] ? params.get('sort') : DEFAULT_SORT.key;
  const dir = params.get('dir');
  const sort = { key: sortKey, direction: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_SORT.direction };

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const rows = useMemo(
    () => (data ? sortEmployees(filterEmployees(data, filters), sort) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filters.q, filters.dept, filters.level, sort.key, sort.direction],
  );

  const counts = useMemo(() => {
    const c = { low: 0, moderate: 0, elevated: 0 };
    rows.forEach((e) => (c[e.indicator.level] = (c[e.indicator.level] ?? 0) + 1));
    return c;
  }, [rows]);

  const hasFilters = Boolean(filters.q || filters.dept || filters.level);
  const resetFilters = () => updateParams({ q: '', dept: '', level: '' });
  const handleSort = (key) => {
    const next = nextSort(sort, key);
    updateParams({ sort: next.key, dir: next.direction });
  };

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Employees"
        description="Every person’s current work pattern next to their own baseline. Select someone to see trends, their forecast and what shapes their indicator."
      />

      <section className="card overflow-hidden">
        <div className="border-b border-beige p-5 sm:p-6">
          <EmployeeFilters
            query={filters.q}
            department={filters.dept}
            level={filters.level}
            onChange={updateParams}
            onReset={resetFilters}
            hasFilters={hasFilters}
          />
          {data && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-brown" aria-live="polite">
              <span className="mr-2">
                Showing <span className="font-bold text-espresso">{rows.length}</span> of {data.length}
              </span>
              {Object.entries(counts).map(([level, n]) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateParams({ level: filters.level === level ? '' : level })}
                  aria-pressed={filters.level === level}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold transition-colors ${
                    filters.level === level ? 'border-caramel bg-caramel/15 text-espresso' : 'border-beige text-brown hover:border-caramel/50 hover:text-espresso'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${LEVEL_META[level].dot}`} aria-hidden="true" />
                  {LEVEL_META[level].label} <span className="tabular-nums">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <LoadingState variant="block" className="h-96 p-5" label="Loading employees…" />}
        {error && <ErrorState error={error} onRetry={reload} className="m-5 border-0 shadow-none" />}
        {data && rows.length > 0 && <EmployeeTable employees={rows} sort={sort} onSort={handleSort} />}
        {data && rows.length === 0 && (
          <EmptyState
            icon={Users}
            title="No employees match these filters"
            message="Try a different search term, or clear the department and indicator filters."
            action={
              <button type="button" className="btn-secondary" onClick={resetFilters}>
                Clear filters
              </button>
            }
          />
        )}
      </section>

      <p className="mt-4 text-[13px] text-brown">
        Hours and breaks are weekday averages for Oct 1–30, 2026. The small number next to hours is the change from each person’s September
        baseline. Indicator scores are illustrative.
      </p>
    </>
  );
}
