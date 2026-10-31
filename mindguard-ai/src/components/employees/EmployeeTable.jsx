import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import RiskBadge from '../ui/RiskBadge.jsx';
import Avatar from '../ui/Avatar.jsx';
import { fmt, formatSigned } from '../../utils/format.js';

export const EMPLOYEE_COLUMNS = [
  { key: 'id', label: 'ID', className: 'hidden md:table-cell' },
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department', className: 'hidden sm:table-cell' },
  { key: 'designation', label: 'Designation', className: 'hidden xl:table-cell' },
  { key: 'avgHours', label: 'Hours / day', align: 'right' },
  { key: 'breaksPerDay', label: 'Breaks / day', align: 'right', className: 'hidden md:table-cell' },
  { key: 'score', label: 'Indicator', align: 'right' },
];

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />;
  return direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
}

/** Sortable employee table. Sort state is owned by the parent (stored in the URL). */
export default function EmployeeTable({ employees, sort, onSort, caption = 'Employee directory (simulated data)' }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[15px]">
        <caption className="sr-only">{caption}. Column headers are buttons that sort the table.</caption>
        <thead>
          <tr>
            {EMPLOYEE_COLUMNS.map((col) => {
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`border-b border-beige bg-white px-5 py-3.5 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className ?? ''}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full text-[12px] font-bold tracking-[0.06em] uppercase transition-colors hover:text-espresso ${
                      active ? 'text-espresso' : 'text-brown'
                    } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {col.label}
                    <SortIcon active={active} direction={sort.direction} />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="w-10 border-b border-beige bg-white">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const hoursChange = emp.metrics.avgHours - emp.baseline.avgHours;
            return (
              <tr key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)} className="group cursor-pointer transition-colors hover:bg-soft">
                <td className="hidden border-b border-beige/70 px-5 py-4 text-[13px] font-semibold tabular-nums text-brown md:table-cell">{emp.id}</td>
                <td className="border-b border-beige/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} size="sm" />
                    <div className="min-w-0">
                      <Link
                        to={`/employees/${emp.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-espresso decoration-caramel decoration-2 underline-offset-4 hover:underline"
                      >
                        {emp.name}
                      </Link>
                      <p className="truncate text-[13px] text-brown xl:hidden">
                        <span className="sm:hidden">{emp.department} · </span>
                        {emp.designation}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden border-b border-beige/70 px-5 py-4 font-medium text-espresso sm:table-cell">{emp.department}</td>
                <td className="hidden border-b border-beige/70 px-5 py-4 text-brown xl:table-cell">{emp.designation}</td>
                <td className="border-b border-beige/70 px-5 py-4 text-right tabular-nums">
                  <span className="font-bold text-espresso">{fmt(emp.metrics.avgHours, 1)} h</span>
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[12px] font-semibold ${hoursChange >= 0.75 ? 'bg-honey/25 text-espresso' : 'text-brown'}`}
                    title="Change from September baseline"
                  >
                    {formatSigned(hoursChange, 1)}
                  </span>
                </td>
                <td className="hidden border-b border-beige/70 px-5 py-4 text-right font-medium tabular-nums text-espresso md:table-cell">
                  {fmt(emp.metrics.breaksPerDay, 1)}
                </td>
                <td className="border-b border-beige/70 px-5 py-4 text-right">
                  <RiskBadge level={emp.indicator.level} score={emp.indicator.score} size="sm" />
                </td>
                <td className="border-b border-beige/70 py-4 pr-4 text-brown transition-transform group-hover:translate-x-0.5 group-hover:text-espresso">
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
