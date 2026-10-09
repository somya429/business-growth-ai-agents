import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface TimePoint {
  date: string;
  replies: number;
  meetings: number;
  unsubscribes: number;
}

interface OutcomesChartProps {
  data?: TimePoint[];
  replyRate?: number;
  meetingRate?: number;
  unsubscribeRate?: number;
}

export const OutcomesChart: React.FC<OutcomesChartProps> = ({
  data = [
    { date: 'Oct 02', replies: 3, meetings: 1, unsubscribes: 0 },
    { date: 'Oct 03', replies: 5, meetings: 2, unsubscribes: 0 },
    { date: 'Oct 04', replies: 4, meetings: 2, unsubscribes: 1 },
    { date: 'Oct 05', replies: 6, meetings: 3, unsubscribes: 0 },
    { date: 'Oct 06', replies: 8, meetings: 4, unsubscribes: 0 },
    { date: 'Oct 07', replies: 7, meetings: 3, unsubscribes: 0 },
    { date: 'Oct 08', replies: 11, meetings: 6, unsubscribes: 1 },
  ],
  replyRate = 0.28,
  meetingRate = 0.145,
  unsubscribeRate = 0.021,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TimePoint | null>(null);

  const maxValue = Math.max(...data.map((d) => Math.max(d.replies, d.meetings, d.unsubscribes)), 12);
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (idx: number) => paddingX + (idx / (data.length - 1)) * (chartWidth - paddingX * 2);
  const getY = (val: number) => chartHeight - paddingY - (val / maxValue) * (chartHeight - paddingY * 2);

  // Generate paths
  const generatePath = (key: 'replies' | 'meetings' | 'unsubscribes') => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`)
      .join(' ');
  };

  return (
    <Card variant="surface" className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-serif text-lg text-text font-normal">
            Grounded Conversion Telemetry
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Real business velocity: responses, booked meetings, and unsubscribes (vanity open rates omitted).
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-accent">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            Replies ({Math.round(replyRate * 100)}%)
          </span>
          <span className="flex items-center gap-1.5 text-verified">
            <span className="w-2.5 h-2.5 rounded-full bg-verified" />
            Meetings ({Math.round(meetingRate * 100)}%)
          </span>
          <span className="flex items-center gap-1.5 text-danger">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
            Unsubscribes ({(unsubscribeRate * 100).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area / Lines */}
          <path
            d={generatePath('replies')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={generatePath('meetings')}
            fill="none"
            stroke="var(--verified)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={generatePath('unsubscribes')}
            fill="none"
            stroke="var(--danger)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 3"
          />

          {/* Data Points */}
          {data.map((d, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(d)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              <circle
                cx={getX(i)}
                cy={getY(d.replies)}
                r="4"
                className="fill-surface stroke-accent"
                strokeWidth="2"
              />
              <circle
                cx={getX(i)}
                cy={getY(d.meetings)}
                r="3.5"
                className="fill-surface stroke-verified"
                strokeWidth="2"
              />
              {/* X Axis Date Labels */}
              <text
                x={getX(i)}
                y={chartHeight - 4}
                textAnchor="middle"
                className="text-[9px] fill-text-faint font-mono"
              >
                {d.date}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-surface-2 border border-border p-2.5 rounded-[8px] shadow-lg text-xs font-mono">
            <div className="font-semibold text-text mb-1">{hoveredPoint.date}</div>
            <div className="text-accent">Replies: {hoveredPoint.replies}</div>
            <div className="text-verified">Meetings: {hoveredPoint.meetings}</div>
            <div className="text-danger">Unsubscribes: {hoveredPoint.unsubscribes}</div>
          </div>
        )}
      </div>
    </Card>
  );
};
