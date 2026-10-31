/** Shared Recharts props so every chart looks consistent. */

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: '#895737', fontSize: 12 },
  tickMargin: 10,
};

export const gridProps = {
  strokeDasharray: '2 6',
  vertical: false,
  stroke: '#EFE3D4',
};

export const legendProps = {
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 13, paddingTop: 14 },
};

export const lineCursor = { stroke: '#E8D8C6', strokeWidth: 1.5 };
export const barCursor = { fill: 'rgba(192, 133, 82, 0.08)' };

export const activeDot = { r: 5, strokeWidth: 2.5, stroke: '#FFFFFF' };

/** Gentle chart entrance. */
export const chartAnimation = { animationDuration: 900, animationEasing: 'ease-out' };
