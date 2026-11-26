import React, { useMemo, useState } from 'react';
import { MapPin, MessageSquare } from 'lucide-react';
import { MARINE_ALERTS, OMNI_BUOYS } from '../data/marineData';
import { AlertSeverity, MarineAlert } from '../types/marine';

interface SafetyAdvisoriesViewProps {
  onLocateAlert: (alert: MarineAlert) => void;
  onAskAboutAlert: (alert: MarineAlert) => void;
}

const SEVERITIES: Array<'All' | AlertSeverity> = ['All', 'Severe', 'Advisory', 'Watch'];

export const SafetyAdvisoriesView: React.FC<SafetyAdvisoriesViewProps> = ({
  onLocateAlert,
  onAskAboutAlert,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | AlertSeverity>('All');

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'All') return MARINE_ALERTS;
    return MARINE_ALERTS.filter((a) => a.severity === severityFilter);
  }, [severityFilter]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1A354F] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#E6F1F8]">
            Marine Safety Advisories &amp; Buoy Synoptics
          </h1>
          <p className="mt-1 text-sm text-[#9FB6C9]">
            INSAT-3DR cyclonic vortex tracking, INCOIS high-swell warnings, and real-time OMNI buoy barometric telemetry.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter marine alerts by severity"
          className="flex items-center gap-1 rounded-lg border border-[#1A354F] bg-[#0D2033] p-1"
        >
          {SEVERITIES.map((sev) => {
            const active = severityFilter === sev;
            return (
              <button
                key={sev}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#16C7D9] text-[#071525] font-semibold'
                    : 'text-[#9FB6C9] hover:text-[#E6F1F8]'
                }`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Advisories List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredAlerts.map((alert) => {
          const sevColor =
            alert.severity === 'Severe'
              ? 'text-[#EF4444]'
              : alert.severity === 'Advisory'
              ? 'text-[#F59E0B]'
              : 'text-[#16C7D9]';
          const sevGlyph =
            alert.severity === 'Severe' ? '✖' : alert.severity === 'Advisory' ? '▲' : '●';

          return (
            <article
              key={alert.id}
              className="flex flex-col justify-between rounded-xl border border-[#1A354F] bg-[#0D2033] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className={`font-mono font-semibold ${sevColor}`}>
                    {sevGlyph} {alert.severity} · {alert.category}
                  </span>
                  <span className="font-mono text-[#6F8CA4]">{alert.id}</span>
                </div>

                <h2 className="mt-2 font-display text-lg font-semibold text-[#E6F1F8]">
                  {alert.title}
                </h2>
                <p className="mt-1 text-xs text-[#9FB6C9]">
                  {alert.regionName} · Issued {alert.issuedAt} · Valid through {alert.validThrough}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-[#D8E7F2]">{alert.guidance}</p>

                <div className="mt-4 grid grid-cols-4 gap-3 border-t border-[#1A354F] pt-3 font-mono text-xs tabular-nums">
                  <div>
                    <div className="text-[11px] text-[#6F8CA4]">Max Swell</div>
                    <div className="font-semibold text-[#E6F1F8]">{alert.waveHeightM} m</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6F8CA4]">Wind Gusts</div>
                    <div className="font-semibold text-[#E6F1F8]">{alert.windGustKts} kts</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6F8CA4]">Pressure</div>
                    <div className="font-semibold text-[#E6F1F8]">{alert.pressureHpa} hPa</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6F8CA4]">Radius</div>
                    <div className="font-semibold text-[#E6F1F8]">{alert.radiusNm} NM</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#1A354F] pt-3">
                <span className="font-mono text-[11px] text-[#6F8CA4]">{alert.source}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLocateAlert(alert)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#1A354F] bg-[#071525] px-3 py-1.5 text-xs font-medium text-[#E6F1F8] hover:border-[#16C7D9] hover:text-[#16C7D9]"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>View Track</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskAboutAlert(alert)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#112840] px-3 py-1.5 text-xs font-medium text-[#16C7D9] hover:bg-[#16C7D9] hover:text-[#071525]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Diversion Plan</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* OMNI Buoy Synoptic Table */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-[#E6F1F8]">
          OMNI Moored Buoy Synoptic Network
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[#1A354F] bg-[#0D2033]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#1A354F] bg-[#09192A] text-[11px] font-semibold text-[#9FB6C9]">
                <th className="px-4 py-3">Buoy ID</th>
                <th className="px-4 py-3">Station &amp; Basin</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-right">SST</th>
                <th className="px-4 py-3 text-right">Wave Hs / Period</th>
                <th className="px-4 py-3 text-right">Wind</th>
                <th className="px-4 py-3 text-right">Salinity</th>
                <th className="px-4 py-3 text-right">Pressure</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A354F] font-mono tabular-nums">
              {OMNI_BUOYS.map((buoy) => (
                <tr key={buoy.id} className="hover:bg-[#112840]/60">
                  <td className="px-4 py-3 font-semibold text-[#16C7D9]">{buoy.id}</td>
                  <td className="px-4 py-3 font-sans">
                    <div className="font-medium text-[#E6F1F8]">{buoy.name}</div>
                    <div className="text-[11px] text-[#6F8CA4]">{buoy.basin}</div>
                  </td>
                  <td className="px-4 py-3 text-[#D8E7F2]">
                    {buoy.lat.toFixed(1)}° N, {buoy.lon.toFixed(1)}° E
                  </td>
                  <td className="px-4 py-3 text-right text-[#E6F1F8]">{buoy.sstC.toFixed(1)} °C</td>
                  <td className="px-4 py-3 text-right text-[#E6F1F8]">
                    {buoy.waveHeightM.toFixed(1)} m / {buoy.wavePeriodSec.toFixed(1)} s
                  </td>
                  <td className="px-4 py-3 text-right text-[#E6F1F8]">{buoy.windKts} kts</td>
                  <td className="px-4 py-3 text-right text-[#9FB6C9]">{buoy.salinityPsu.toFixed(1)} PSU</td>
                  <td className="px-4 py-3 text-right text-[#E6F1F8]">{buoy.pressureHpa} hPa</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      buoy.status === 'Advisory' ? 'text-[#F59E0B]' : 'text-[#10B981]'
                    }`}
                  >
                    {buoy.status === 'Advisory' ? '▲ Advisory' : '● Nominal'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
