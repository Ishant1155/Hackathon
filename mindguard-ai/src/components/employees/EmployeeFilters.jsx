import { ChevronDown, Search, X } from 'lucide-react';
import { DEPARTMENTS, LEVEL_META } from '../../utils/constants.js';

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} onChange={onChange} className="input cursor-pointer appearance-none rounded-full pr-10 font-semibold sm:w-48">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown" aria-hidden="true" />
    </div>
  );
}

export default function EmployeeFilters({ query, department, level, onChange, onReset, hasFilters }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <label htmlFor="employee-search" className="sr-only">
          Search by name, ID or designation
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brown" aria-hidden="true" />
        <input
          id="employee-search"
          type="search"
          value={query}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search by name, ID or designation"
          className="input rounded-full pl-11"
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex">
        <Select id="filter-department" label="Department" value={department} onChange={(e) => onChange({ dept: e.target.value })}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select id="filter-level" label="Indicator level" value={level} onChange={(e) => onChange({ level: e.target.value })}>
          <option value="">All levels</option>
          {Object.entries(LEVEL_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <button type="button" onClick={onReset} className="btn-ghost col-span-2 sm:col-span-1">
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
