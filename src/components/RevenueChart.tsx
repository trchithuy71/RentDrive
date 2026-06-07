'use client';

import React, { useState } from 'react';

interface RevenueChartData {
  date: string;
  usdc: number;
  eurc: number;
  total: number;
}

interface RevenueChartProps {
  data: RevenueChartData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-sm bg-white border border-[#DDDCD4] text-[10px] uppercase tracking-widest font-black text-[#718096]">
        No Revenue Data Available
      </div>
    );
  }

  // Find max value for scaling
  const maxTotal = Math.max(...data.map((d) => d.total), 50) * 1.15;
  
  // Dimensions
  const width = 600;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Generate coordinates for SVG path
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.total / maxTotal) * chartHeight;
    return { x, y, ...d };
  });

  // SVG path definitions
  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
    : '';

  return (
    <div className="w-full bg-white rounded-sm border border-[#DDDCD4] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1C2B3C]">
            Revenue Trend (USD Equivalent)
          </h4>
          <span className="text-[9px] text-[#718096] font-mono tracking-widest uppercase">
            On-Chain Settlements Over Time
          </span>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-bold tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1C2B3C]" />
            <span>TOTAL (USD FX)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>USDC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>EURC</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" style={{ minWidth: '500px' }}>
          {/* Y Axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * ratio;
            const value = (maxTotal * (1 - ratio)).toFixed(0);
            return (
              <g key={i} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#DDDCD4"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3}
                  textAnchor="end"
                  fill="#718096"
                  className="text-[9px] font-mono font-extrabold"
                >
                  ${value}
                </text>
              </g>
            );
          })}

          {/* Filled Area Gradient */}
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1C2B3C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1C2B3C" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Area Path */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}

          {/* Main Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#1C2B3C"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interaction Circles */}
          {points.map((p, index) => {
            const isHovered = hoveredPoint === index;
            return (
              <g key={index}>
                {/* Invisible Hover Zone */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={15}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Solid Point Circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? '#FFFFFF' : '#1C2B3C'}
                  stroke="#1C2B3C"
                  strokeWidth={2.5}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.map((p, index) => {
            // Show labels for first, middle, and last to avoid clutter
            const isLabel = index === 0 || index === Math.floor(points.length / 2) || index === points.length - 1;
            if (!isLabel) return null;
            const dateObj = new Date(p.date);
            const labelStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return (
              <text
                key={index}
                x={p.x}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                fill="#718096"
                className="text-[9px] font-bold tracking-wider"
              >
                {labelStr}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            className="absolute z-10 bg-[#1C2B3C] text-white p-3 rounded-sm shadow-xl border border-slate-700/60 pointer-events-none text-left"
            style={{
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              top: `${Math.max(10, (points[hoveredPoint].y / height) * 100 - 30)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-1">
              {new Date(points[hoveredPoint].date).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] font-black uppercase">
              <span className="text-slate-300">Combined:</span>
              <span className="text-white text-right">${points[hoveredPoint].total.toFixed(2)}</span>
              <span className="text-indigo-400">USDC:</span>
              <span className="text-indigo-200 text-right">${points[hoveredPoint].usdc.toFixed(2)}</span>
              <span className="text-emerald-400">EURC:</span>
              <span className="text-emerald-200 text-right">€{points[hoveredPoint].eurc.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
