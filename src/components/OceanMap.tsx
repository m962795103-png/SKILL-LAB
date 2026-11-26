import React, { useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  LocateFixed,
  Maximize2,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import {
  HARBORS,
  MARINE_ALERTS,
  OMNI_BUOYS,
  PFZ_ZONES,
  REGIONS,
} from '../data/marineData';
import { MapLayer, MarineAlert, OmniBuoy, PfzZone, RegionProfile } from '../types/marine';

interface OceanMapProps {
  activeRegionId: string;
  activeLayer: MapLayer;
  highlightedZoneId?: string;
  onSelectRegion: (regionId: string) => void;
  onSelectLayer: (layer: MapLayer) => void;
  onAskAboutEntity: (prompt: string) => void;
}

const LON_MIN = 65.0;
const LON_MAX = 96.0;
const LAT_MIN = 4.5;
const LAT_MAX = 24.8;
const SVG_W = 1000;
const SVG_H = 660;

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W;
  const y = (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return [x, y];
}

function unproject(x: number, y: number): { lat: number; lon: number } {
  const lon = LON_MIN + (x / SVG_W) * (LON_MAX - LON_MIN);
  const lat = LAT_MIN + (1 - y / SVG_H) * (LAT_MAX - LAT_MIN);
  return { lat, lon };
}

function toPath(coords: Array<[number, number]>): string {
  return (
    coords
      .map(([lon, lat], idx) => {
        const [x, y] = project(lat, lon);
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}

// Accurate Indian Subcontinent, Sri Lanka & Island Coastline Geometry (lon, lat)
const INDIA_LANDMASS: Array<[number, number]> = [
  [65.0, 24.8],
  [96.0, 24.8],
  [96.0, 14.0],
  [94.3, 16.0],
  [93.6, 17.5],
  [92.8, 20.2],
  [91.9, 22.3],
  [90.5, 22.1],
  [89.1, 21.7],
  [88.1, 21.6],
  [87.0, 21.4],
  [86.6, 20.26],
  [85.82, 19.81],
  [84.9, 19.3],
  [83.3, 17.7],
  [82.25, 16.98],
  [81.1, 16.2],
  [80.1, 15.5],
  [80.28, 13.08],
  [79.81, 11.94],
  [79.85, 10.76],
  [79.3, 9.28],
  [78.13, 8.76],
  [77.54, 8.08],
  [76.9, 8.5],
  [76.26, 9.93],
  [75.78, 11.25],
  [74.8, 12.9],
  [73.8, 15.4],
  [73.3, 17.0],
  [72.82, 18.96],
  [72.8, 21.1],
  [72.2, 21.6],
  [71.0, 20.7],
  [70.4, 20.9],
  [69.6, 21.6],
  [69.0, 22.8],
  [68.4, 23.7],
  [67.2, 24.4],
  [65.0, 24.8],
];

const SRI_LANKA: Array<[number, number]> = [
  [80.05, 9.78],
  [81.2, 8.6],
  [81.84, 7.25],
  [81.25, 6.1],
  [80.22, 6.02],
  [79.82, 6.95],
  [79.75, 8.55],
  [80.05, 9.78],
];

const ANDAMAN_NICOBAR: Array<Array<[number, number]>> = [
  [
    [92.75, 13.45],
    [93.02, 13.15],
    [92.95, 12.2],
    [92.72, 11.6],
    [92.55, 11.45],
    [92.62, 12.5],
  ],
  [
    [92.45, 10.9],
    [92.65, 10.7],
    [92.5, 10.5],
  ],
  [
    [92.75, 9.25],
    [93.0, 9.15],
    [92.92, 8.85],
    [92.7, 9.05],
  ],
  [
    [93.65, 7.25],
    [93.92, 7.05],
    [93.8, 6.75],
    [93.6, 6.95],
  ],
];

const LAKSHADWEEP: Array<[number, number]> = [
  [72.64, 10.56],
  [72.18, 10.82],
  [72.92, 11.12],
  [72.65, 9.95],
  [73.03, 8.28],
];

const CONTINENTAL_SHELF: Array<[number, number]> = [
  [67.2, 24.4],
  [68.3, 21.8],
  [70.1, 19.6],
  [71.6, 17.8],
  [73.2, 14.5],
  [74.7, 11.6],
  [76.0, 8.9],
  [77.2, 7.3],
  [79.6, 6.2],
  [81.9, 6.6],
  [82.1, 9.5],
  [80.9, 13.1],
  [81.6, 15.8],
  [83.9, 17.4],
  [86.5, 19.5],
  [88.6, 20.9],
  [91.4, 21.1],
  [93.3, 18.0],
  [94.0, 15.2],
];

type SelectedEntity =
  | { type: 'pfz'; data: PfzZone }
  | { type: 'buoy'; data: OmniBuoy }
  | { type: 'alert'; data: MarineAlert };

const LAYER_TABS: Array<{ id: MapLayer; label: string }> = [
  { id: 'pfz', label: 'PFZ Corridors' },
  { id: 'sst', label: 'SST Thermal' },
  { id: 'chlorophyll', label: 'Chlorophyll-a' },
  { id: 'waves', label: 'Wave & Wind' },
];

export const OceanMap: React.FC<OceanMapProps> = ({
  activeRegionId,
  activeLayer,
  highlightedZoneId,
  onSelectRegion,
  onSelectLayer,
  onAskAboutEntity,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [cursorInfo, setCursorInfo] = useState<{
    lat: number;
    lon: number;
    sst: number;
    chl: number;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  const activeRegion: RegionProfile = useMemo(
    () => REGIONS.find((r) => r.id === activeRegionId) ?? REGIONS[0],
    [activeRegionId]
  );

  // Compute SVG viewBox crop based on active region zoom & manual zoom override
  const viewState = useMemo(() => {
    const effectiveZoom = manualZoom ?? activeRegion.zoom;
    const [cx, cy] = project(activeRegion.center.lat, activeRegion.center.lon);
    const w = SVG_W / effectiveZoom;
    const h = SVG_H / effectiveZoom;
    const vx = Math.max(0, Math.min(SVG_W - w, cx - w / 2));
    const vy = Math.max(0, Math.min(SVG_H - h, cy - h / 2));
    return { vx, vy, w, h, zoom: effectiveZoom };
  }, [activeRegion, manualZoom]);

  const indiaPath = useMemo(() => toPath(INDIA_LANDMASS), []);
  const sriLankaPath = useMemo(() => toPath(SRI_LANKA), []);
  const shelfPolyline = useMemo(
    () =>
      CONTINENTAL_SHELF.map(([lon, lat]) => {
        const [x, y] = project(lat, lon);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' '),
    []
  );

  // Sync highlighted zone when AI directive selects one
  React.useEffect(() => {
    if (!highlightedZoneId) return;
    const pfz = PFZ_ZONES.find((z) => z.id === highlightedZoneId);
    if (pfz) {
      setSelectedEntity({ type: 'pfz', data: pfz });
      return;
    }
    const alert = MARINE_ALERTS.find((a) => a.id === highlightedZoneId);
    if (alert) {
      setSelectedEntity({ type: 'alert', data: alert });
    }
  }, [highlightedZoneId]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const svgX = viewState.vx + relX * viewState.w;
    const svgY = viewState.vy + relY * viewState.h;
    const { lat, lon } = unproject(svgX, svgY);

    // Derive physically plausible interpolated SST & Chl-a field at cursor
    const eastShift = Math.max(0, Math.min(1, (lon - 68) / 22));
    const latFactor = Math.max(0, Math.min(1, (22 - lat) / 15));
    const baseSst = 26.4 + eastShift * 2.4 + latFactor * 1.1;
    const coastalProximity = Math.max(0.2, 1 - Math.abs(lon - 75.5) / 14);
    const baseChl = Number((0.45 + coastalProximity * 2.15 * (1 - eastShift * 0.4)).toFixed(2));

    setCursorInfo({
      lat: Number(lat.toFixed(2)),
      lon: Number(lon.toFixed(2)),
      sst: Number(baseSst.toFixed(1)),
      chl: baseChl,
    });
  };

  const handleRegionChange = (id: string) => {
    setManualZoom(null);
    onSelectRegion(id);
  };

  const lonTicks = [66, 70, 74, 78, 82, 86, 90, 94];
  const latTicks = [6, 10, 14, 18, 22];

  // Wind/wave vector field nodes across Arabian Sea & Bay of Bengal
  const windVectors = useMemo(
    () => [
      { lat: 18.5, lon: 68.5, deg: 315, kts: 13 },
      { lat: 15.2, lon: 69.8, deg: 285, kts: 15 },
      { lat: 11.4, lon: 73.2, deg: 295, kts: 14 },
      { lat: 8.5, lon: 74.8, deg: 270, kts: 16 },
      { lat: 10.2, lon: 83.2, deg: 60, kts: 24 },
      { lat: 13.8, lon: 84.6, deg: 45, kts: 33 },
      { lat: 16.8, lon: 86.2, deg: 25, kts: 34 },
      { lat: 18.5, lon: 88.6, deg: 350, kts: 26 },
      { lat: 10.8, lon: 91.5, deg: 110, kts: 22 },
    ],
    []
  );

  return (
    <section className="flex flex-col rounded-xl border border-[#1A354F] bg-[#0D2033] overflow-hidden">
      {/* Map Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A354F] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <label htmlFor="region-select" className="text-xs font-medium text-[#9FB6C9] whitespace-nowrap">
            Basin Focus
          </label>
          <select
            id="region-select"
            value={activeRegionId}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="rounded-lg border border-[#1A354F] bg-[#071525] px-3 py-1.5 text-xs font-medium text-[#E6F1F8] focus:border-[#16C7D9] focus:outline-none"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Segmented EO Layer Switcher */}
        <div
          role="tablist"
          aria-label="Satellite Earth Observation Layers"
          className="flex items-center gap-1 rounded-lg border border-[#1A354F] bg-[#071525] p-1 overflow-x-auto"
        >
          {LAYER_TABS.map((tab) => {
            const active = activeLayer === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onSelectLayer(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#16C7D9] text-[#071525] font-semibold'
                    : 'text-[#9FB6C9] hover:text-[#E6F1F8]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Geospatial Canvas */}
      <div className="relative h-[420px] sm:h-[480px] lg:h-[510px] w-full bg-[#061322] overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${viewState.vx} ${viewState.vy} ${viewState.w} ${viewState.h}`}
          preserveAspectRatio="xMidYMid slice"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorInfo(null)}
          className="h-full w-full cursor-crosshair select-none transition-[viewBox] duration-300"
        >
          <defs>
            {/* Ocean Bathymetric Depth Gradient */}
            <radialGradient id="oceanDepth" cx="50%" cy="55%" r="70%">
              <stop offset="0%" stopColor="#091D32" />
              <stop offset="65%" stopColor="#071525" />
              <stop offset="100%" stopColor="#040D18" />
            </radialGradient>

            {/* SST Thermal Plume Gradients */}
            <radialGradient id="sstWarmBob" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#EA580C" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#16C7D9" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sstCoolUpwelling" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#16C7D9" stopOpacity="0.50" />
              <stop offset="55%" stopColor="#0284C7" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#071525" stopOpacity="0" />
            </radialGradient>

            {/* Chlorophyll-a Upwelling Plumes */}
            <radialGradient id="chlBloom" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.58" />
              <stop offset="50%" stopColor="#16C7D9" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            {/* Severe Swell / Depression Halo */}
            <radialGradient id="severeWaveHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Base Bathymetric Canvas */}
          <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#oceanDepth)" />

          {/* Lat/Lon Graticules */}
          <g stroke="#122B43" strokeWidth={0.75 / Math.sqrt(viewState.zoom)}>
            {lonTicks.map((lon) => {
              const [x] = project(10, lon);
              return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={SVG_H} />;
            })}
            {latTicks.map((lat) => {
              const [, y] = project(lat, 75);
              return <line key={`lat-${lat}`} x1={0} y1={y} x2={SVG_W} y2={y} />;
            })}
          </g>

          {/* Graticule Labels */}
          <g
            fill="#5E7B94"
            fontSize={10 / Math.sqrt(viewState.zoom)}
            fontFamily="JetBrains Mono, monospace"
          >
            {lonTicks.map((lon) => {
              const [x] = project(10, lon);
              return (
                <text key={`lon-lbl-${lon}`} x={x + 4} y={SVG_H - 8}>
                  {lon}°E
                </text>
              );
            })}
            {latTicks.map((lat) => {
              const [, y] = project(lat, 75);
              return (
                <text key={`lat-lbl-${lat}`} x={8} y={y - 4}>
                  {lat}°N
                </text>
              );
            })}
          </g>

          {/* Continental Shelf 200m Isobath */}
          <polyline
            points={shelfPolyline}
            fill="none"
            stroke="#16C7D9"
            strokeOpacity="0.22"
            strokeWidth={1.2 / Math.sqrt(viewState.zoom)}
            strokeDasharray="4 4"
          />

          {/* LAYER 1: SST THERMAL */}
          {activeLayer === 'sst' && (
            <g>
              {(() => {
                const [bx, by] = project(15.2, 85.2);
                const [kx, ky] = project(10.0, 75.3);
                const [gx, gy] = project(20.6, 69.2);
                const [ax, ay] = project(11.4, 92.2);
                return (
                  <>
                    <ellipse cx={bx} cy={by} rx={170} ry={130} fill="url(#sstWarmBob)" />
                    <ellipse cx={ax} cy={ay} rx={115} ry={100} fill="url(#sstWarmBob)" />
                    <ellipse cx={kx} cy={ky} rx={110} ry={125} fill="url(#sstCoolUpwelling)" />
                    <ellipse cx={gx} cy={gy} rx={105} ry={95} fill="url(#sstCoolUpwelling)" />
                  </>
                );
              })()}
            </g>
          )}

          {/* LAYER 2: CHLOROPHYLL-A */}
          {activeLayer === 'chlorophyll' && (
            <g>
              {[
                { lat: 10.2, lon: 75.5, rx: 95, ry: 115 },
                { lat: 18.6, lon: 71.8, rx: 85, ry: 95 },
                { lat: 20.5, lon: 69.3, rx: 90, ry: 80 },
                { lat: 16.8, lon: 82.6, rx: 70, ry: 65 },
                { lat: 11.4, lon: 93.1, rx: 60, ry: 70 },
              ].map((plume, idx) => {
                const [px, py] = project(plume.lat, plume.lon);
                return (
                  <ellipse
                    key={idx}
                    cx={px}
                    cy={py}
                    rx={plume.rx}
                    ry={plume.ry}
                    fill="url(#chlBloom)"
                  />
                );
              })}
            </g>
          )}

          {/* LAYER 4: WAVE & WIND VECTORS + CYCLONIC SYSTEM */}
          {(activeLayer === 'waves' || activeLayer === 'pfz') && (
            <g>
              {MARINE_ALERTS.map((alert) => {
                const [ax, ay] = project(alert.lat, alert.lon);
                const rPx = (alert.radiusNm / 60) * (SVG_W / 31) * 0.85;
                const isSelected =
                  selectedEntity?.type === 'alert' && selectedEntity.data.id === alert.id;
                const strokeColor =
                  alert.severity === 'Severe'
                    ? '#EF4444'
                    : alert.severity === 'Advisory'
                    ? '#F59E0B'
                    : '#16C7D9';
                return (
                  <g
                    key={alert.id}
                    onClick={() => setSelectedEntity({ type: 'alert', data: alert })}
                    className="cursor-pointer"
                  >
                    {activeLayer === 'waves' && alert.severity === 'Severe' && (
                      <circle cx={ax} cy={ay} r={rPx * 1.35} fill="url(#severeWaveHalo)" />
                    )}
                    <circle
                      cx={ax}
                      cy={ay}
                      r={rPx}
                      fill={strokeColor}
                      fillOpacity={isSelected ? 0.16 : 0.07}
                      stroke={strokeColor}
                      strokeOpacity={isSelected ? 0.95 : 0.55}
                      strokeWidth={(isSelected ? 2 : 1.1) / Math.sqrt(viewState.zoom)}
                      strokeDasharray={alert.severity === 'Severe' ? 'none' : '4 3'}
                    />
                    {alert.trackPoints && (
                      <g>
                        <polyline
                          points={alert.trackPoints
                            .map((pt) => {
                              const [tx, ty] = project(pt.lat, pt.lon);
                              return `${tx},${ty}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth={1.6 / Math.sqrt(viewState.zoom)}
                          strokeDasharray="5 3"
                        />
                        {alert.trackPoints.map((pt) => {
                          const [tx, ty] = project(pt.lat, pt.lon);
                          return (
                            <g key={pt.label}>
                              <circle
                                cx={tx}
                                cy={ty}
                                r={3.2 / Math.sqrt(viewState.zoom)}
                                fill={pt.label === 'Now' ? '#EF4444' : '#FCA5A5'}
                              />
                              <text
                                x={tx + 6 / Math.sqrt(viewState.zoom)}
                                y={ty - 4 / Math.sqrt(viewState.zoom)}
                                fill="#FCA5A5"
                                fontSize={9 / Math.sqrt(viewState.zoom)}
                                fontFamily="JetBrains Mono, monospace"
                              >
                                {pt.label}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    )}
                  </g>
                );
              })}

              {activeLayer === 'waves' &&
                windVectors.map((v, idx) => {
                  const [wx, wy] = project(v.lat, v.lon);
                  const rad = ((v.deg - 90) * Math.PI) / 180;
                  const len = (10 + v.kts * 0.45) / Math.sqrt(viewState.zoom);
                  const ex = wx + Math.cos(rad) * len;
                  const ey = wy + Math.sin(rad) * len;
                  const color = v.kts >= 25 ? '#F59E0B' : '#16C7D9';
                  return (
                    <g key={idx} stroke={color} strokeWidth={1.4 / Math.sqrt(viewState.zoom)}>
                      <line x1={wx} y1={wy} x2={ex} y2={ey} strokeOpacity="0.85" />
                      <circle cx={ex} cy={ey} r={2 / Math.sqrt(viewState.zoom)} fill={color} />
                    </g>
                  );
                })}
            </g>
          )}

          {/* Landmasses (India, Sri Lanka, Islands) */}
          <g fill="#0E2439" stroke="#284F73" strokeWidth={1.2 / Math.sqrt(viewState.zoom)}>
            <path d={indiaPath} />
            <path d={sriLankaPath} />
            {ANDAMAN_NICOBAR.map((isl, idx) => (
              <path key={`an-${idx}`} d={toPath(isl)} />
            ))}
          </g>

          {/* Lakshadweep Atolls */}
          <g fill="#16C7D9" fillOpacity="0.45">
            {LAKSHADWEEP.map(([lon, lat], idx) => {
              const [lx, ly] = project(lat, lon);
              return <circle key={`lk-${idx}`} cx={lx} cy={ly} r={2 / Math.sqrt(viewState.zoom)} />;
            })}
          </g>

          {/* Basin Typography Labels */}
          <g
            fill="#3C6282"
            fontSize={12 / Math.sqrt(viewState.zoom)}
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="600"
            letterSpacing="0.16em"
          >
            {(() => {
              const [ax, ay] = project(14.0, 68.5);
              const [bx, by] = project(13.8, 87.2);
              return (
                <>
                  <text x={ax} y={ay}>
                    ARABIAN SEA
                  </text>
                  <text x={bx} y={by}>
                    BAY OF BENGAL
                  </text>
                </>
              );
            })()}
          </g>

          {/* Potential Fishing Zone Polygons (Always accessible, highlighted in PFZ/SST/Chl) */}
          {PFZ_ZONES.map((zone) => {
            const [cx, cy] = project(zone.lat, zone.lon);
            const isSelected =
              selectedEntity?.type === 'pfz' && selectedEntity.data.id === zone.id;
            const polyPoints = zone.polygonOffsets
              .map(([dlon, dlat]) => {
                const [px, py] = project(zone.lat + dlat, zone.lon + dlon);
                return `${px.toFixed(1)},${py.toFixed(1)}`;
              })
              .join(' ');
            const isSuspended = zone.validUntil.includes('Suspended');
            const color = isSuspended ? '#F59E0B' : '#16C7D9';

            return (
              <g
                key={zone.id}
                onClick={() => setSelectedEntity({ type: 'pfz', data: zone })}
                className="cursor-pointer"
              >
                <polygon
                  points={polyPoints}
                  fill={color}
                  fillOpacity={
                    isSelected ? 0.36 : activeLayer === 'pfz' ? 0.22 : 0.1
                  }
                  stroke={color}
                  strokeWidth={(isSelected ? 2.2 : 1.2) / Math.sqrt(viewState.zoom)}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={(isSelected ? 4.5 : 3.2) / Math.sqrt(viewState.zoom)}
                  fill={color}
                />
                {(activeLayer === 'pfz' || isSelected || viewState.zoom > 1.5) && (
                  <text
                    x={cx + 7 / Math.sqrt(viewState.zoom)}
                    y={cy + 3 / Math.sqrt(viewState.zoom)}
                    fill="#E6F1F8"
                    fontSize={9.5 / Math.sqrt(viewState.zoom)}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {zone.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* OMNI Moored Buoys */}
          {OMNI_BUOYS.map((buoy) => {
            const [bx, by] = project(buoy.lat, buoy.lon);
            const isSelected =
              selectedEntity?.type === 'buoy' && selectedEntity.data.id === buoy.id;
            const color = buoy.status === 'Advisory' ? '#F59E0B' : '#10B981';
            const r = (isSelected ? 5 : 3.6) / Math.sqrt(viewState.zoom);
            return (
              <g
                key={buoy.id}
                onClick={() => setSelectedEntity({ type: 'buoy', data: buoy })}
                className="cursor-pointer"
              >
                <rect
                  x={bx - r}
                  y={by - r}
                  width={r * 2}
                  height={r * 2}
                  transform={`rotate(45 ${bx} ${by})`}
                  fill="#071525"
                  stroke={color}
                  strokeWidth={1.6 / Math.sqrt(viewState.zoom)}
                />
                <text
                  x={bx + 7 / Math.sqrt(viewState.zoom)}
                  y={by + 3 / Math.sqrt(viewState.zoom)}
                  fill={color}
                  fontSize={9 / Math.sqrt(viewState.zoom)}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {buoy.id}
                </text>
              </g>
            );
          })}

          {/* Major Coastal Ports */}
          {HARBORS.map((port) => {
            const [hx, hy] = project(port.lat, port.lon);
            return (
              <g key={port.name}>
                <circle
                  cx={hx}
                  cy={hy}
                  r={2.8 / Math.sqrt(viewState.zoom)}
                  fill="#E6F1F8"
                  stroke="#071525"
                  strokeWidth={1 / Math.sqrt(viewState.zoom)}
                />
                <text
                  x={hx + 6 / Math.sqrt(viewState.zoom)}
                  y={hy - 4 / Math.sqrt(viewState.zoom)}
                  fill="#9FB6C9"
                  fontSize={9.5 / Math.sqrt(viewState.zoom)}
                  fontFamily="DM Sans, sans-serif"
                >
                  {port.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Top-Left Live Cursor Coordinate HUD */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 rounded-lg border border-[#1A354F] bg-[#071525]/90 px-3 py-1.5 font-mono text-[11px] text-[#E6F1F8] tabular-nums backdrop-blur-sm">
          <Crosshair className="h-3.5 w-3.5 text-[#16C7D9]" aria-hidden="true" />
          {cursorInfo ? (
            <div className="flex items-center gap-2.5">
              <span>
                {cursorInfo.lat.toFixed(2)}° N, {cursorInfo.lon.toFixed(2)}° E
              </span>
              <span className="text-[#4B6B88]">·</span>
              <span className="text-[#9FB6C9]">SST {cursorInfo.sst.toFixed(1)} °C</span>
              <span className="text-[#4B6B88]">·</span>
              <span className="text-[#16C7D9]">Chl-a {cursorInfo.chl.toFixed(2)} mg/m³</span>
            </div>
          ) : (
            <span className="text-[#9FB6C9]">
              {activeRegion.name} · Move cursor to probe coordinates
            </span>
          )}
        </div>

        {/* Top-Right Zoom & Reset Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in map"
            onClick={() =>
              setManualZoom((z) => Math.min(3.4, (z ?? activeRegion.zoom) + 0.45))
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1A354F] bg-[#071525]/90 text-[#9FB6C9] hover:border-[#16C7D9] hover:text-[#E6F1F8]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out map"
            onClick={() =>
              setManualZoom((z) => Math.max(1, (z ?? activeRegion.zoom) - 0.45))
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1A354F] bg-[#071525]/90 text-[#9FB6C9] hover:border-[#16C7D9] hover:text-[#E6F1F8]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Reset map viewport"
            onClick={() => handleRegionChange('all-indian-ocean')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1A354F] bg-[#071525]/90 text-[#9FB6C9] hover:border-[#16C7D9] hover:text-[#E6F1F8]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bottom-Right Calibrated Legend */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-[#1A354F] bg-[#071525]/90 px-3 py-2 text-[11px] backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-4 font-mono text-[#9FB6C9]">
            <span>
              {activeLayer === 'sst'
                ? 'SST Scale (°C)'
                : activeLayer === 'chlorophyll'
                ? 'Chlorophyll-a (mg/m³)'
                : activeLayer === 'waves'
                ? 'Wave & Alert Severity'
                : 'PFZ & Buoy Markers'}
            </span>
          </div>
          {activeLayer === 'sst' && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#E6F1F8]">
              <span>25.5°</span>
              <div className="h-2 w-28 rounded-sm bg-gradient-to-r from-[#0284C7] via-[#16C7D9] to-[#F59E0B]" />
              <span>30.2°</span>
            </div>
          )}
          {activeLayer === 'chlorophyll' && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#E6F1F8]">
              <span>0.2</span>
              <div className="h-2 w-28 rounded-sm bg-gradient-to-r from-[#092742] via-[#16C7D9] to-[#10B981]" />
              <span>3.8+</span>
            </div>
          )}
          {activeLayer === 'pfz' && (
            <div className="flex items-center gap-3 text-[11px] text-[#9FB6C9]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 bg-[#16C7D9]/40 border border-[#16C7D9]" />
                Active PFZ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rotate-45 border border-[#10B981]" />
                OMNI Buoy
              </span>
            </div>
          )}
          {activeLayer === 'waves' && (
            <div className="flex items-center gap-3 text-[11px] text-[#9FB6C9]">
              <span className="text-[#EF4444]">● Severe (&gt;3m)</span>
              <span className="text-[#F59E0B]">▲ Advisory</span>
            </div>
          )}
        </div>

        {/* Selected Entity Telemetry Inspector Popover */}
        {selectedEntity && (
          <div className="absolute bottom-3 left-3 z-20 w-[calc(100%-24px)] max-w-sm rounded-lg border border-[#1A354F] bg-[#071525]/95 p-3.5 shadow-xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[11px] text-[#16C7D9]">
                  {selectedEntity.type === 'pfz'
                    ? `${selectedEntity.data.id} · ${selectedEntity.data.yieldRating} Yield`
                    : selectedEntity.type === 'buoy'
                    ? `${selectedEntity.data.id} · Moored OMNI Buoy`
                    : `${selectedEntity.data.id} · ${selectedEntity.data.severity} Alert`}
                </div>
                <h4 className="mt-0.5 text-sm font-semibold text-[#E6F1F8]">
                  {selectedEntity.type === 'pfz'
                    ? `${selectedEntity.data.nearestPort} Sector`
                    : selectedEntity.type === 'buoy'
                    ? selectedEntity.data.name
                    : selectedEntity.data.title}
                </h4>
              </div>
              <button
                type="button"
                aria-label="Close telemetry inspector"
                onClick={() => setSelectedEntity(null)}
                className="rounded p-1 text-[#9FB6C9] hover:bg-[#112840] hover:text-[#E6F1F8]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedEntity.type === 'pfz' && (
              <div className="mt-2.5 space-y-2 text-xs text-[#9FB6C9]">
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums text-[#E6F1F8]">
                  <div>
                    <div className="text-[#6F8CA4]">Distance</div>
                    <div>
                      {selectedEntity.data.distanceNm} NM ({selectedEntity.data.bearingDeg}°)
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6F8CA4]">SST / Chl-a</div>
                    <div>
                      {selectedEntity.data.sstC}°C / {selectedEntity.data.chlMgM3}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6F8CA4]">Depth</div>
                    <div>{selectedEntity.data.depthRangeM}</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#9FB6C9]">
                  Species: {selectedEntity.data.species.join(', ')}. {selectedEntity.data.advisoryNote}
                </p>
              </div>
            )}

            {selectedEntity.type === 'buoy' && (
              <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums text-[#E6F1F8]">
                <div>
                  <div className="text-[#6F8CA4]">SST / Salinity</div>
                  <div>
                    {selectedEntity.data.sstC}°C / {selectedEntity.data.salinityPsu} PSU
                  </div>
                </div>
                <div>
                  <div className="text-[#6F8CA4]">Swell (Hs)</div>
                  <div>
                    {selectedEntity.data.waveHeightM} m ({selectedEntity.data.wavePeriodSec}s)
                  </div>
                </div>
                <div>
                  <div className="text-[#6F8CA4]">Pressure / Wind</div>
                  <div>
                    {selectedEntity.data.pressureHpa} hPa / {selectedEntity.data.windKts} kt
                  </div>
                </div>
              </div>
            )}

            {selectedEntity.type === 'alert' && (
              <div className="mt-2.5 space-y-2 text-xs text-[#9FB6C9]">
                <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-[#E6F1F8]">
                  <span>Wave: {selectedEntity.data.waveHeightM} m</span>
                  <span className="text-[#4B6B88]">·</span>
                  <span>Gusts: {selectedEntity.data.windGustKts} kts</span>
                  <span className="text-[#4B6B88]">·</span>
                  <span>{selectedEntity.data.pressureHpa} hPa</span>
                </div>
                <p className="leading-relaxed">{selectedEntity.data.guidance}</p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[#1A354F] pt-2.5">
              <span className="font-mono text-[11px] tabular-nums text-[#6F8CA4]">
                <LocateFixed className="mr-1 inline h-3 w-3" />
                {selectedEntity.data.lat.toFixed(2)}° N, {selectedEntity.data.lon.toFixed(2)}° E
              </span>
              <button
                type="button"
                onClick={() => {
                  const entity = selectedEntity;
                  const prompt =
                    entity.type === 'pfz'
                      ? `Analyze PFZ ${entity.data.id} off ${entity.data.nearestPort} (${entity.data.lat}°N, ${entity.data.lon}°E) including target species, sea state safety, and optimal harvest window.`
                      : entity.type === 'buoy'
                      ? `Interpret current telemetry from OMNI buoy ${entity.data.id} (${entity.data.sstC}°C SST, ${entity.data.waveHeightM}m swell, ${entity.data.pressureHpa} hPa) and surrounding basin conditions.`
                      : `Provide operational guidance and diversion recommendations for marine alert ${entity.data.id} (${entity.data.title}).`;
                  onAskAboutEntity(prompt);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#112840] px-2.5 py-1 text-xs font-medium text-[#16C7D9] hover:bg-[#16C7D9] hover:text-[#071525] transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <span>Ask Samudra AI</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
