export type UserRole = 'fishermen' | 'researcher' | 'authority' | 'maritime';

export type NavView = 'command' | 'pfz' | 'safety' | 'satellites';

export type MapLayer = 'sst' | 'chlorophyll' | 'pfz' | 'waves';

export type AlertSeverity = 'Severe' | 'Advisory' | 'Watch' | 'Nominal';

export interface RegionProfile {
  id: string;
  name: string;
  basin: 'Arabian Sea' | 'Bay of Bengal' | 'Andaman Sea' | 'Laccadive Sea';
  center: { lat: number; lon: number };
  zoom: number;
  meanSstC: number;
  sstAnomalyC: number;
  peakChlMgM3: number;
  maxSwellM: number;
  windSpeedKts: number;
  windDirectionDeg: number;
  activePfzCount: number;
  salinityPsu: number;
  status: AlertSeverity;
  summary: string;
  forecast48h: Array<{
    hourOffset: string;
    sstC: number;
    waveHeightM: number;
    windKts: number;
    chlMgM3: number;
  }>;
}

export interface PfzZone {
  id: string;
  regionId: string;
  regionName: string;
  nearestPort: string;
  bearingDeg: number;
  distanceNm: number;
  lat: number;
  lon: number;
  depthRangeM: string;
  sstC: number;
  sstGradient: string;
  chlMgM3: number;
  species: string[];
  yieldRating: 'High' | 'Moderate-High' | 'Optimal';
  validUntil: string;
  satelliteSource: string;
  advisoryNote: string;
  polygonOffsets: Array<[number, number]>;
}

export interface MarineAlert {
  id: string;
  title: string;
  regionId: string;
  regionName: string;
  category: 'Cyclonic System' | 'High Swell' | 'Algal Bloom' | 'Port Warning' | 'Corridor Hazard';
  severity: AlertSeverity;
  lat: number;
  lon: number;
  radiusNm: number;
  waveHeightM: number;
  windGustKts: number;
  pressureHpa: number;
  issuedAt: string;
  validThrough: string;
  source: string;
  guidance: string;
  trackPoints?: Array<{ lat: number; lon: number; label: string }>;
}

export interface OmniBuoy {
  id: string;
  name: string;
  basin: string;
  lat: number;
  lon: number;
  sstC: number;
  waveHeightM: number;
  wavePeriodSec: number;
  windKts: number;
  salinityPsu: number;
  pressureHpa: number;
  lastTelemetry: string;
  status: 'Nominal' | 'Advisory';
}

export interface SatellitePass {
  id: string;
  name: string;
  agency: string;
  orbit: string;
  sensors: string[];
  resolution: string;
  swathKm: number;
  nextPassIst: string;
  targetBasin: string;
  calibrationStatus: 'Nominal' | 'Calibrating';
  imagePath: string;
  description: string;
}

export interface AgentToolTrace {
  toolName: string;
  summary: string;
  parameters: Record<string, unknown>;
}

export interface MapControlDirective {
  focusRegionId?: string;
  activeLayer?: MapLayer;
  highlightZoneId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolTraces?: AgentToolTrace[];
  mapDirective?: MapControlDirective;
  error?: boolean;
}
