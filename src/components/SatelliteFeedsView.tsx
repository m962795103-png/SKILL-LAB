import React, { useState } from 'react';
import { Radio, Satellite } from 'lucide-react';
import { SATELLITE_PASSES } from '../data/marineData';

interface SatelliteFeedsViewProps {
  onQuerySatelliteMission: (missionName: string) => void;
}

export const SatelliteFeedsView: React.FC<SatelliteFeedsViewProps> = ({
  onQuerySatelliteMission,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <div className="border-b border-[#1A354F] pb-5">
        <h1 className="font-display text-2xl font-semibold text-[#E6F1F8]">
          ISRO Earth Observation Constellation &amp; In-Situ Feeds
        </h1>
        <p className="mt-1 text-sm text-[#9FB6C9]">
          Active orbital passes, spectral ocean-color payloads, and moored telemetry anchors powering SAMUDRA AI.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {SATELLITE_PASSES.map((sat) => {
          const imgFailed = failedImages[sat.id];
          return (
            <article
              key={sat.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[#1A354F] bg-[#0D2033]"
            >
              <div className="relative aspect-video w-full bg-[#071525] overflow-hidden">
                {!imgFailed ? (
                  <img
                    src={sat.imagePath}
                    alt={`${sat.name} Earth observation pass over the Indian Ocean`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [sat.id]: true }))
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#071525] via-[#0D2033] to-[#112840] p-6 text-center">
                    <Satellite className="h-8 w-8 text-[#16C7D9]" aria-hidden="true" />
                    <span className="mt-2 font-display text-sm font-semibold text-[#E6F1F8]">
                      {sat.name}
                    </span>
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0D2033] via-[#0D2033]/25 to-transparent"
                />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#16C7D9]">{sat.id}</span>
                  <span className="font-mono text-[#10B981]">● {sat.calibrationStatus}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#E6F1F8]">
                    {sat.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#9FB6C9]">
                    {sat.agency} · {sat.orbit}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#D8E7F2]">
                    {sat.description}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-[#1A354F] pt-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#6F8CA4]">Payloads</dt>
                      <dd className="text-right font-medium text-[#E6F1F8]">
                        {sat.sensors.join(' · ')}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#6F8CA4]">Resolution / Swath</dt>
                      <dd className="text-right font-mono tabular-nums text-[#E6F1F8]">
                        {sat.resolution} · {sat.swathKm} km
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#6F8CA4]">Next Pass / Cadence</dt>
                      <dd className="text-right font-mono text-[#16C7D9]">{sat.nextPassIst}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 border-t border-[#1A354F] pt-3">
                  <button
                    type="button"
                    onClick={() => onQuerySatelliteMission(sat.name)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1A354F] bg-[#071525] px-4 py-2 text-xs font-medium text-[#E6F1F8] transition-colors hover:border-[#16C7D9] hover:text-[#16C7D9]"
                  >
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Analyze Latest {sat.id} Telemetry</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
