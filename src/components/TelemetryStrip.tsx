import React, { useState } from 'react';
import { RegionProfile } from '../types/marine';

interface TelemetryStripProps {
  region: RegionProfile;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({ region }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const series = region.forecast48h;
  const chartW = 760;
  const chartH = 132;
  const padL = 36;
  const padR = 36;
  const padT = 14;
  const padB = 24;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const waveMin = 0;
  const waveMax = 4.2;
  const sstMin = 25.5;
  const sstMax = 30.5;

  const getX = (idx: number) => padL + (idx / (series.length - 1)) * plotW;
  const getWaveY = (val: number) =>
    padT + (1 - Math.min(1, Math.max(0, (val - waveMin) / (waveMax - waveMin)))) * plotH;
  const getSstY = (val: number) =>
    padT + (1 - Math.min(1, Math.max(0, (val - sstMin) / (sstMax - sstMin)))) * plotH;

  const wavePath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getWaveY(pt.waveHeightM).toFixed(1)}`)
    .join(' ');
  const waveArea = `${wavePath} L${getX(series.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;

  const sstPath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getSstY(pt.sstC).toFixed(1)}`)
    .join(' ');

  const activePoint = hoveredIdx !== null ? series[hoveredIdx] : series[0];

  const statusTone =
    region.status === 'Severe'
      ? 'text-[#EF4444]'
      : region.status === 'Advisory'
      ? 'text-[#F59E0B]'
      : 'text-[#10B981]';
  const statusGlyph =
    region.status === 'Severe' ? '✖' : region.status === 'Advisory' ? '▲' : '●';

  return (
    <section className="rounded-xl border border-[#1A354F] bg-[#0D2033]">
      {/* 4-Column Calibrated Telemetry KPI Strip */}
      <div className="grid grid-cols-2 divide-y divide-[#1A354F] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <div className="p-4">
          <div className="text-xs font-medium text-[#9FB6C9]">Mean Sea Surface Temp</div>
          <div className="mt-1.5 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E6F1F8]">
              {region.meanSstC.toFixed(1)}
            </span>
            <span className="ml-1.5 font-mono text-xs text-[#9FB6C9]">°C</span>
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-[#16C7D9]">
            Anomaly {region.sstAnomalyC >= 0 ? '+' : ''}
            {region.sstAnomalyC.toFixed(2)} °C · {region.salinityPsu} PSU
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-[#9FB6C9]">Peak Chlorophyll-a</div>
          <div className="mt-1.5 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E6F1F8]">
              {region.peakChlMgM3.toFixed(2)}
            </span>
            <span className="ml-1.5 font-mono text-xs text-[#9FB6C9]">mg/m³</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-[#9FB6C9]">
            EOS-06 OCM-3 · Nutrient front
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-[#9FB6C9]">Active PFZ Zones</div>
          <div className="mt-1.5 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E6F1F8]">
              {region.activePfzCount}
            </span>
            <span className="ml-1.5 font-mono text-xs text-[#9FB6C9]">sectors</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-[#9FB6C9]">
            Updated 09:45 IST · Valid 24h
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-[#9FB6C9]">
            <span>Max Swell &amp; Sea State</span>
            <span className={`font-mono text-[11px] font-medium ${statusTone}`}>
              {statusGlyph} {region.status}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E6F1F8]">
              {region.maxSwellM.toFixed(1)}
            </span>
            <span className="ml-1.5 font-mono text-xs text-[#9FB6C9]">m</span>
            <span className="ml-3 font-mono text-sm tabular-nums text-[#9FB6C9]">
              / {region.windSpeedKts} kts
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-[#9FB6C9]">
            Vector {region.windDirectionDeg}° · INCOIS Wave III
          </div>
        </div>
      </div>

      {/* Dual-Axis 48-Hour Oceanographic Forecast Curve */}
      <div className="border-t border-[#1A354F] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-[#E6F1F8]">
              48-Hour Oceanographic Forecast — {region.name}
            </h3>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
            <span className="text-[#16C7D9]">
              ― Wave Height: {activePoint.waveHeightM.toFixed(1)} m
            </span>
            <span className="text-[#F59E0B]">
              -- SST: {activePoint.sstC.toFixed(1)} °C
            </span>
            <span className="text-[#9FB6C9]">
              Wind: {activePoint.windKts} kts ({activePoint.hourOffset})
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-32 w-full select-none"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="waveFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16C7D9" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#16C7D9" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[1.0, 2.0, 3.0, 4.0].map((val) => {
              const y = getWaveY(val);
              return (
                <g key={val}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke="#1A354F"
                    strokeWidth="0.75"
                  />
                  <text
                    x={4}
                    y={y + 3}
                    fill="#6F8CA4"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {val.toFixed(0)}m
                  </text>
                </g>
              );
            })}

            {/* Right axis SST labels */}
            {[26, 28, 30].map((val) => {
              const y = getSstY(val);
              return (
                <text
                  key={`sst-${val}`}
                  x={chartW - padR + 6}
                  y={y + 3}
                  fill="#9FB6C9"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {val}°
                </text>
              );
            })}

            {/* Wave Height Area + Curve */}
            <path d={waveArea} fill="url(#waveFillGrad)" />
            <path d={wavePath} fill="none" stroke="#16C7D9" strokeWidth="2" />

            {/* SST Dashed Curve */}
            <path
              d={sstPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.6"
              strokeDasharray="4 3"
            />

            {/* X-axis ticks & interactive hover targets */}
            {series.map((pt, idx) => {
              const x = getX(idx);
              const wy = getWaveY(pt.waveHeightM);
              const sy = getSstY(pt.sstC);
              const isHovered = hoveredIdx === idx;
              return (
                <g
                  key={pt.hourOffset}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  className="cursor-crosshair"
                >
                  <rect
                    x={x - plotW / (series.length * 2)}
                    y={padT}
                    width={plotW / series.length}
                    height={plotH}
                    fill="transparent"
                  />
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={padT + plotH}
                      stroke="#E6F1F8"
                      strokeOpacity="0.35"
                      strokeWidth="1"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={wy}
                    r={isHovered ? 4 : 2.5}
                    fill="#16C7D9"
                    stroke="#071525"
                    strokeWidth="1"
                  />
                  <circle
                    cx={x}
                    cy={sy}
                    r={isHovered ? 3.5 : 2}
                    fill="#F59E0B"
                    stroke="#071525"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={chartH - 6}
                    textAnchor="middle"
                    fill={isHovered ? '#E6F1F8' : '#6F8CA4'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {pt.hourOffset}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
};
