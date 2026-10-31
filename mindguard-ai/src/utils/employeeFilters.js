/** Pure helpers for the Employees page so filtering logic is easy to test. */

const LEVEL_RANK = { low: 0, moderate: 1, elevated: 2 };

export const SORT_ACCESSORS = {
  id: (e) => e.id,
  name: (e) => e.name,
  department: (e) => e.department,
  designation: (e) => e.designation,
  avgHours: (e) => e.metrics.avgHours,
  breaksPerDay: (e) => e.metrics.breaksPerDay,
  score: (e) => e.indicator.score,
  level: (e) => LEVEL_RANK[e.indicator.level],
};

export const DEFAULT_SORT = { key: 'score', direction: 'desc' };

export function filterEmployees(list, { q = '', dept = '', level = '' } = {}) {
  const needle = q.trim().toLowerCase();
  return list.filter((e) => {
    if (dept && e.department !== dept) return false;
    if (level && e.indicator.level !== level) return false;
    if (!needle) return true;
    return [e.name, e.id, e.designation, e.department].some((field) => field.toLowerCase().includes(needle));
  });
}

export function sortEmployees(list, { key = DEFAULT_SORT.key, direction = DEFAULT_SORT.direction } = {}) {
  const accessor = SORT_ACCESSORS[key] ?? SORT_ACCESSORS[DEFAULT_SORT.key];
  const factor = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return cmp * factor || a.name.localeCompare(b.name);
  });
}

/** Text columns default to A→Z, numeric columns to high→low. */
export function nextSort(current, key) {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  const textual = ['id', 'name', 'department', 'designation'].includes(key);
  return { key, direction: textual ? 'asc' : 'desc' };
}
