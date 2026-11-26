import React, { useMemo, useState } from 'react';
import { MapPin, MessageSquare, Search } from 'lucide-react';
import { PFZ_ZONES, REGIONS } from '../data/marineData';
import { PfzZone } from '../types/marine';

interface PfzForecastsViewProps {
  onLocateZone: (zone: PfzZone) => void;
  onAskAboutZone: (zone: PfzZone) => void;
}

export const PfzForecastsView: React.FC<PfzForecastsViewProps> = ({
  onLocateZone,
  onAskAboutZone,
}) => {
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredZones = useMemo(() => {
    return PFZ_ZONES.filter((z) => {
      const regionOk = regionFilter === 'all' || z.regionId === regionFilter;
      const q = searchTerm.trim().toLowerCase();
      const searchOk =
        !q ||
        z.id.toLowerCase().includes(q) ||
        z.nearestPort.toLowerCase().includes(q) ||
        z.species.some((s) => s.toLowerCase().includes(q));
      return regionOk && searchOk;
    });
  }, [regionFilter, searchTerm]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1A354F] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#E6F1F8]">
            Potential Fishing Zone Forecasts
          </h1>
          <p className="mt-1 text-sm text-[#9FB6C9]">
            EOS-06 OCM-3 chlorophyll plumes &amp; SSTM thermal boundary delineations across Indian coastal shelves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F8CA4]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter port, species, or ID..."
              className="w-60 rounded-lg border border-[#1A354F] bg-[#0D2033] py-2 pl-8 pr-3 text-xs text-[#E6F1F8] placeholder-[#6F8CA4] focus:border-[#16C7D9] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter PFZ by coastal region"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-lg border border-[#1A354F] bg-[#0D2033] px-3 py-2 text-xs font-medium text-[#E6F1F8] focus:border-[#16C7D9] focus:outline-none"
          >
            <option value="all">All Coastal Sectors ({PFZ_ZONES.length})</option>
            {REGIONS.filter((r) => r.id !== 'all-indian-ocean').map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* High-Density Tabular PFZ Grid */}
      <div className="overflow-x-auto rounded-xl border border-[#1A354F] bg-[#0D2033]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#1A354F] bg-[#09192A] text-[11px] font-semibold text-[#9FB6C9]">
              <th className="px-4 py-3">Zone ID</th>
              <th className="px-4 py-3">Harbour &amp; Sector</th>
              <th className="px-4 py-3">Coordinates</th>
              <th className="px-4 py-3 text-right">Bearing / Dist</th>
              <th className="px-4 py-3 text-right">SST / Chl-a</th>
              <th className="px-4 py-3">Target Species</th>
              <th className="px-4 py-3">Validity &amp; Yield</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A354F]">
            {filteredZones.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#9FB6C9]">
                  No Potential Fishing Zones match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredZones.map((zone) => {
                const isSuspended = zone.validUntil.includes('Suspended');
                return (
                  <tr
                    key={zone.id}
                    className="transition-colors hover:bg-[#112840]/60"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-[#16C7D9] whitespace-nowrap">
                      {zone.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#E6F1F8]">{zone.nearestPort}</div>
                      <div className="text-[11px] text-[#6F8CA4]">{zone.regionName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-[#E6F1F8] whitespace-nowrap">
                      {zone.lat.toFixed(2)}° N, {zone.lon.toFixed(2)}° E
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E6F1F8] whitespace-nowrap">
                      {zone.bearingDeg}° · {zone.distanceNm} NM
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span className="text-[#E6F1F8]">{zone.sstC.toFixed(1)} °C</span>
                      <span className="mx-1.5 text-[#4B6B88]">/</span>
                      <span className="text-[#10B981]">{zone.chlMgM3.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-[#D8E7F2]">
                      {zone.species.join(' · ')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className={`font-mono text-[11px] font-medium ${
                          isSuspended ? 'text-[#EF4444]' : 'text-[#10B981]'
                        }`}
                      >
                        {isSuspended ? '✖ Suspended' : `● ${zone.yieldRating} Yield`}
                      </div>
                      <div className="text-[11px] text-[#6F8CA4]">{zone.validUntil}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLocateZone(zone)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#1A354F] bg-[#071525] px-2.5 py-1.5 text-xs font-medium text-[#E6F1F8] hover:border-[#16C7D9] hover:text-[#16C7D9]"
                        >
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          <span>Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onAskAboutZone(zone)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#112840] px-2.5 py-1.5 text-xs font-medium text-[#16C7D9] hover:bg-[#16C7D9] hover:text-[#071525]"
                        >
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                          <span>Brief</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
