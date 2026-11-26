/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { TopNav } from './components/TopNav';
import { OceanMap } from './components/OceanMap';
import { TelemetryStrip } from './components/TelemetryStrip';
import { SamudraAssistant } from './components/SamudraAssistant';
import { PfzForecastsView } from './components/PfzForecastsView';
import { SafetyAdvisoriesView } from './components/SafetyAdvisoriesView';
import { SatelliteFeedsView } from './components/SatelliteFeedsView';
import {
  MARINE_ALERTS,
  PFZ_ZONES,
  REGIONS,
  ROLE_PERSONAS,
} from './data/marineData';
import {
  MapControlDirective,
  MapLayer,
  MarineAlert,
  NavView,
  PfzZone,
  UserRole,
} from './types/marine';

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('command');
  const [role, setRole] = useState<UserRole>('fishermen');
  const [activeRegionId, setActiveRegionId] = useState<string>('all-indian-ocean');
  const [activeLayer, setActiveLayer] = useState<MapLayer>('pfz');
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | undefined>(undefined);
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRegion = useMemo(
    () => REGIONS.find((r) => r.id === activeRegionId) ?? REGIONS[0],
    [activeRegionId]
  );

  const severeAlert = useMemo(
    () => MARINE_ALERTS.find((a) => a.severity === 'Severe'),
    []
  );

  const handleApplyMapDirective = (directive: MapControlDirective) => {
    if (directive.focusRegionId) {
      setActiveRegionId(directive.focusRegionId);
    }
    if (directive.activeLayer) {
      setActiveLayer(directive.activeLayer);
    }
    if (directive.highlightZoneId) {
      setHighlightedZoneId(directive.highlightZoneId);
    }
  };

  const handleAskInCommand = (prompt: string, focusRegion?: string, layer?: MapLayer) => {
    if (focusRegion) setActiveRegionId(focusRegion);
    if (layer) setActiveLayer(layer);
    setActiveView('command');
    setExternalPrompt(prompt);
  };

  const handleLocatePfz = (zone: PfzZone) => {
    setActiveRegionId(zone.regionId);
    setActiveLayer('pfz');
    setHighlightedZoneId(zone.id);
    setActiveView('command');
  };

  const handleLocateAlert = (alert: MarineAlert) => {
    setActiveRegionId(alert.regionId);
    setActiveLayer('waves');
    setHighlightedZoneId(alert.id);
    setActiveView('command');
  };

  const handleExportBriefing = () => {
    const regionZones = PFZ_ZONES.filter(
      (z) => activeRegionId === 'all-indian-ocean' || z.regionId === activeRegionId
    );
    const regionAlerts = MARINE_ALERTS.filter(
      (a) => activeRegionId === 'all-indian-ocean' || a.regionId === activeRegionId
    );

    const lines = [
      `# SAMUDRA AI — Marine Intelligence Briefing`,
      `Generated: ${new Date().toISOString()}`,
      `Basin Focus: ${activeRegion.name}`,
      `Operator Persona: ${ROLE_PERSONAS.find((p) => p.id === role)?.label ?? role}`,
      ``,
      `## Oceanographic Summary`,
      `- Mean SST: ${activeRegion.meanSstC.toFixed(1)} °C (Anomaly: ${activeRegion.sstAnomalyC >= 0 ? '+' : ''}${activeRegion.sstAnomalyC.toFixed(2)} °C)`,
      `- Peak Chlorophyll-a: ${activeRegion.peakChlMgM3.toFixed(2)} mg/m³`,
      `- Max Swell Height: ${activeRegion.maxSwellM.toFixed(1)} m | Wind: ${activeRegion.windSpeedKts} kts (${activeRegion.windDirectionDeg}°)`,
      `- Sea Surface Salinity: ${activeRegion.salinityPsu} PSU`,
      ``,
      `## Potential Fishing Zones (${regionZones.length})`,
      ...regionZones.map(
        (z) =>
          `- ${z.id} (${z.nearestPort}): ${z.lat.toFixed(2)}°N, ${z.lon.toFixed(2)}°E | ${z.bearingDeg}° · ${z.distanceNm} NM | SST ${z.sstC}°C | Chl-a ${z.chlMgM3} mg/m³ | Species: ${z.species.join(', ')}`
      ),
      ``,
      `## Active Safety Advisories (${regionAlerts.length})`,
      ...regionAlerts.map(
        (a) =>
          `- [${a.severity}] ${a.id} — ${a.title}: Max Swell ${a.waveHeightM} m, Gusts ${a.windGustKts} kts, ${a.pressureHpa} hPa. ${a.guidance}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samudra-ai-briefing-${activeRegion.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMessage(`Exported operational briefing for ${activeRegion.name}`);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#071525] text-[#E6F1F8]">
      <TopNav
        activeView={activeView}
        onSelectView={setActiveView}
        onExportBriefing={handleExportBriefing}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-[#16C7D9]/40 bg-[#0D2033] px-4 py-2.5 text-xs font-medium text-[#E6F1F8] shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      <main>
        {activeView === 'command' && (
          <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 sm:px-6">
            {/* Workspace Context & Role Persona Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold tracking-tight text-[#E6F1F8] sm:text-2xl">
                  Indian Ocean Satellite Command
                </h1>
                <p className="mt-0.5 text-xs text-[#9FB6C9] truncate">
                  {activeRegion.summary}
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Operator Persona"
                className="flex items-center gap-1 rounded-lg border border-[#1A354F] bg-[#0D2033] p-1 overflow-x-auto"
              >
                {ROLE_PERSONAS.map((persona) => {
                  const isActive = role === persona.id;
                  return (
                    <button
                      key={persona.id}
                      role="tab"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => setRole(persona.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#112840] text-[#16C7D9] border border-[#16C7D9]/35'
                          : 'text-[#9FB6C9] hover:text-[#E6F1F8]'
                      }`}
                    >
                      {persona.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Severe Cyclone / Swell Ribbon */}
            {severeAlert && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EF4444]/35 bg-[#1B1622] px-4 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-[#FCA5A5]">
                  <span className="font-mono font-semibold text-[#EF4444]">✖ Severe Alert</span>
                  <span className="text-[#4B6B88]">·</span>
                  <span className="font-medium text-[#E6F1F8]">{severeAlert.title}</span>
                  <span className="text-[#9FB6C9]">
                    ({severeAlert.waveHeightM} m swell · {severeAlert.windGustKts} kts gusts ·{' '}
                    {severeAlert.pressureHpa} hPa)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLocateAlert(severeAlert)}
                  className="font-mono text-xs font-medium text-[#16C7D9] hover:underline whitespace-nowrap"
                >
                  Inspect Track on Map →
                </button>
              </div>
            )}

            {/* Split Geospatial Viewport + Agentic AI Assistant */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-stretch">
              <div className="flex flex-col gap-5 xl:col-span-8">
                <OceanMap
                  activeRegionId={activeRegionId}
                  activeLayer={activeLayer}
                  highlightedZoneId={highlightedZoneId}
                  onSelectRegion={setActiveRegionId}
                  onSelectLayer={setActiveLayer}
                  onAskAboutEntity={(prompt) => setExternalPrompt(prompt)}
                />
                <TelemetryStrip region={activeRegion} />
              </div>

              <div className="xl:col-span-4">
                <SamudraAssistant
                  role={role}
                  activeRegionId={activeRegionId}
                  activeLayer={activeLayer}
                  externalPrompt={externalPrompt}
                  onConsumeExternalPrompt={() => setExternalPrompt(null)}
                  onApplyMapDirective={handleApplyMapDirective}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'pfz' && (
          <PfzForecastsView
            onLocateZone={handleLocatePfz}
            onAskAboutZone={(zone) =>
              handleAskInCommand(
                `Provide an operational fishing plan for ${zone.id} off ${zone.nearestPort} (${zone.lat}°N, ${zone.lon}°E) targeting ${zone.species.join(', ')}. Include fuel-optimal bearing and sea-state clearance.`,
                zone.regionId,
                'pfz'
              )
            }
          />
        )}

        {activeView === 'safety' && (
          <SafetyAdvisoriesView
            onLocateAlert={handleLocateAlert}
            onAskAboutAlert={(alert) =>
              handleAskInCommand(
                `Assess vessel safety and recommended diversion corridor for ${alert.id} (${alert.title}, ${alert.waveHeightM}m swell, ${alert.windGustKts} kts gusts).`,
                alert.regionId,
                'waves'
              )
            }
          />
        )}

        {activeView === 'satellites' && (
          <SatelliteFeedsView
            onQuerySatelliteMission={(missionName) =>
              handleAskInCommand(
                `Summarize the latest ocean observation insights and sensor readings from ${missionName} across Arabian Sea and Bay of Bengal.`
              )
            }
          />
        )}
      </main>
    </div>
  );
}
