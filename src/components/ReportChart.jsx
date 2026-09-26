import { cloneElement } from 'react';
import { ResponsiveContainer } from 'recharts';

// Print charts have explicit dimensions and never depend on a hidden ResizeObserver.
export default function ReportChart({ children }) {
  return <>
    <div className="report-screen-chart h-full w-full"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    <div className="report-print-chart" aria-hidden="true">{cloneElement(children, { width: 640, height: 260 })}</div>
  </>;
}
