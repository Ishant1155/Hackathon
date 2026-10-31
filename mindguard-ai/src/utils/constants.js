import {
  Clock,
  Coffee,
  Moon,
  CalendarDays,
  ListChecks,
  TrendingDown,
  LayoutDashboard,
  Users,
  Lightbulb,
  TrendingUp,
  FlaskConical,
  FileText,
  CalendarClock,
} from 'lucide-react';

/** Sisyphus palette. Use these hex values in charts and inline styles. */
export const COLORS = {
  cream: '#F3E9DC',
  soft: '#FAF5EF',
  beige: '#E8D8C6',
  caramel: '#C08552',
  espresso: '#5E3023',
  brown: '#895737',
  sage: '#81977B',
  honey: '#D6A45D',
  white: '#FFFFFF',
  grid: '#EFE3D4',
  // Older keys kept so existing chart code keeps working.
  teal: '#C08552',
  blue: '#895737',
  amber: '#D6A45D',
  violet: '#81977B',
  slate: '#B79A80',
  slateLight: '#895737',
};

/**
 * Indicator levels. Text, dot and colour are always shown together so
 * the level is never conveyed by colour alone.
 */
export const LEVEL_META = {
  low: {
    label: 'Low',
    color: COLORS.sage,
    badge: 'bg-sage/15 text-espresso ring-sage/40',
    dot: 'bg-sage',
    description: 'Pattern close to the reference schedule.',
  },
  moderate: {
    label: 'Moderate',
    color: COLORS.caramel,
    badge: 'bg-caramel/15 text-espresso ring-caramel/40',
    dot: 'bg-caramel',
    description: 'Some patterns differ from the reference schedule.',
  },
  elevated: {
    label: 'Elevated',
    color: COLORS.honey,
    badge: 'bg-honey/25 text-espresso ring-honey/60',
    dot: 'bg-honey',
    description: 'Several patterns suggest sustained overwork.',
  },
  // Returned by the backend when there is not enough recorded activity to score.
  insufficient_data: {
    label: 'Insufficient data',
    color: '#B79A80',
    badge: 'bg-beige/70 text-espresso ring-brown/30',
    dot: 'bg-brown/50',
    description: 'Not enough recorded activity to calculate an indicator. Missing data is not treated as healthy.',
  },
};

export const LEVEL_ORDER = { low: 0, moderate: 1, elevated: 2 };

export const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];

export const INSIGHT_TYPES = {
  hours: { label: 'Working hours', icon: Clock },
  breaks: { label: 'Breaks', icon: Coffee },
  lateNight: { label: 'Late-night activity', icon: Moon },
  weekend: { label: 'Weekend work', icon: CalendarDays },
  tasks: { label: 'Task completion', icon: ListChecks },
  improvement: { label: 'Positive change', icon: TrendingDown },
};

export const SEVERITY_META = {
  elevated: { label: 'Suggest check-in', className: 'bg-honey/25 text-espresso ring-honey/60', bar: 'bg-honey' },
  moderate: { label: 'Worth watching', className: 'bg-caramel/15 text-espresso ring-caramel/40', bar: 'bg-caramel' },
  positive: { label: 'Positive change', className: 'bg-sage/15 text-espresso ring-sage/40', bar: 'bg-sage' },
};

/** Dashboard navigation (sidebar). */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true, description: 'Organisation-wide wellbeing snapshot' },
  { to: '/employees', label: 'Employees', icon: Users, description: 'Directory and individual work patterns' },
  { to: '/insights', label: 'Insights', icon: Lightbulb, description: 'Explainable behavioural observations' },
  { to: '/trends', label: 'Trends', icon: TrendingUp, description: 'Period-over-period comparisons' },
  { to: '/forecast', label: '7-Day Forecast', icon: CalendarClock, description: 'Predicted workload for the next seven days' },
  { to: '/simulation', label: 'Simulation Lab', icon: FlaskConical, description: 'Explore hypothetical work patterns' },
  { to: '/reports', label: 'Reports', icon: FileText, description: 'Printable department summaries' },
];

/** Public site navigation (homepage sections). */
export const SITE_NAV = [
  { href: '/#top', id: 'top', label: 'Home' },
  { href: '/#how-it-works', id: 'how-it-works', label: 'How It Works' },
  { href: '/#features', id: 'features', label: 'Features' },
  { href: '/#forecasting', id: 'forecasting', label: 'AI Forecasting' },
  { href: '/#about', id: 'about', label: 'About' },
];

export const DISCLAIMER =
  'Sisyphus is a workplace wellbeing demonstration platform. Its predictions are estimates based on simulated activity data and are not medical diagnoses or scientifically validated assessments.';
