/**
 * Application search. Builds an index from data returned by the
 * service layer (employees, insights, forecast) plus the app's real
 * routes and page sections, then ranks matches for a query.
 * Pure functions, no React.
 */

import { NAV_ITEMS, SITE_NAV } from './constants.js';

export const CATEGORY_ORDER = ['Page', 'Department', 'Employee', 'Forecast', 'Insight', 'Report'];

const PAGE_KEYWORDS = {
  '/dashboard': 'overview dashboard kpi home summary distribution check-in',
  '/employees': 'directory people staff table team',
  '/insights': 'observations explanations alerts check-ins',
  '/trends': 'history historical charts comparison overtime breaks productivity weekend',
  '/forecast': 'prediction predict ai machine learning seven days next week ml model',
  '/simulation': 'lab sliders scenario what-if hypothetical score',
  '/reports': 'report print pdf export summary',
};

const REPORT_SECTIONS = [
  { id: 'report-summary', title: 'Executive summary', description: 'Key changes this period in plain language' },
  { id: 'report-departments', title: 'Department summary report', description: 'Hours, overtime, breaks and indicator levels per department' },
  { id: 'report-distribution', title: 'Indicator distribution report', description: 'Employees at each illustrative level, by department' },
  { id: 'report-trends', title: 'Trend summary report', description: '30-day comparison with the previous period' },
];

/**
 * @param {{ employees?: any[], insights?: any[], forecast?: any }} sources
 * @returns {SearchItem[]}
 *
 * @typedef {Object} SearchItem
 * @property {string} id
 * @property {string} title
 * @property {string} category  one of CATEGORY_ORDER
 * @property {string} description
 * @property {string} to        router destination
 * @property {string} text      lower-cased haystack
 */
export function buildSearchIndex({ employees = [], insights = [], forecast = null } = {}) {
  const items = [];
  const add = (item) => items.push({ ...item, text: `${item.title} ${item.description} ${item.keywords ?? ''}`.toLowerCase() });

  NAV_ITEMS.forEach((n) =>
    add({ id: `page:${n.to}`, category: 'Page', title: n.label, description: n.description, to: n.to, keywords: PAGE_KEYWORDS[n.to] }),
  );
  SITE_NAV.filter((s) => s.id !== 'top').forEach((s) =>
    add({ id: `site:${s.id}`, category: 'Page', title: s.label, description: 'Section on the Sisyphus homepage', to: s.href }),
  );

  employees.forEach((e) =>
    add({
      id: `emp:${e.id}`,
      category: 'Employee',
      title: e.name,
      description: `${e.designation} · ${e.department} · ${e.indicator.levelLabel} indicator`,
      to: `/employees/${e.id}`,
      keywords: `${e.id} ${e.location}`,
    }),
  );

  const departments = [...new Set(employees.map((e) => e.department))];
  departments.forEach((d) => {
    const count = employees.filter((e) => e.department === d).length;
    add({ id: `dept:${d}`, category: 'Department', title: d, description: `${count} employees · open in directory`, to: `/employees?dept=${encodeURIComponent(d)}`, keywords: 'department team' });
  });

  if (forecast) {
    forecast.departments?.forEach((d) =>
      add({
        id: `fc-dept:${d.department}`,
        category: 'Forecast',
        title: `${d.department} 7-day forecast`,
        description: `${d.predictedAvgHours} h/day predicted · ${Math.round(d.predictedOvertime)} h overtime`,
        to: `/forecast?dept=${encodeURIComponent(d.department)}`,
        keywords: 'forecast prediction next week',
      }),
    );
    forecast.employees?.forEach((p) =>
      add({
        id: `fc-emp:${p.id}`,
        category: 'Forecast',
        title: `${p.name} – forecast`,
        description: `${p.predictedAvgHours} h/day predicted, ${p.trend}`,
        to: `/employees/${p.id}#forecast`,
        keywords: `${p.id} ${p.department} forecast prediction`,
      }),
    );
  }

  insights.forEach((i) =>
    add({
      id: `ins:${i.id}`,
      category: 'Insight',
      title: `${i.title} – ${i.employeeName}`,
      description: i.whatChanged,
      to: `/employees/${i.employeeId}`,
      keywords: `${i.department} ${i.type}`,
    }),
  );

  REPORT_SECTIONS.forEach((r) => add({ ...r, id: `rep:${r.id}`, category: 'Report', to: `/reports#${r.id}`, keywords: 'report print pdf' }));

  return items;
}

function scoreItem(item, terms, phrase) {
  const title = item.title.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!item.text.includes(term)) return 0; // every term must match
    if (title.startsWith(term)) score += 6;
    else if (title.split(/[\s–-]+/).some((w) => w.startsWith(term))) score += 4;
    else if (title.includes(term)) score += 2;
    else score += 1;
  }
  if (title === phrase) score += 10;
  else if (title.startsWith(phrase)) score += 4;
  return score;
}

/**
 * Rank items for a query. Returns groups in CATEGORY_ORDER, each
 * limited to `perCategory` results.
 */
export function searchIndex(items, query, { perCategory = 5 } = {}) {
  const phrase = query.trim().toLowerCase();
  if (!phrase) return [];
  const terms = phrase.split(/\s+/).filter(Boolean);
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, terms, phrase) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

  return CATEGORY_ORDER.map((category) => ({
    category,
    items: scored.filter((r) => r.item.category === category).slice(0, perCategory).map((r) => r.item),
  })).filter((g) => g.items.length);
}

/** Shortcuts shown before the user types. */
export const SUGGESTIONS = [
  { title: '7-Day Forecast', to: '/forecast' },
  { title: 'Employees with elevated indicators', to: '/employees?level=elevated' },
  { title: 'Simulation Lab', to: '/simulation' },
  { title: 'Reports', to: '/reports' },
];
