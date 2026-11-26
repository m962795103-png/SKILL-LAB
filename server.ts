import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Content, FunctionDeclaration, GoogleGenAI, Part, Type } from '@google/genai';
import {
  MARINE_ALERTS,
  OMNI_BUOYS,
  PFZ_ZONES,
  REGIONS,
  ROLE_PERSONAS,
  queryMarineAlerts,
  queryPfzZones,
  queryTelemetryByRegion,
} from './src/data/marineData.ts';
import type { AgentToolTrace, MapControlDirective, MapLayer, UserRole } from './src/types/marine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable SAMUDRA AI.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const querySatelliteTelemetryTool: FunctionDeclaration = {
  name: 'query_satellite_telemetry',
  description:
    'Query ISRO EOS-06 (Oceansat-3), INSAT-3DR, and OMNI moored buoy oceanographic telemetry (SST, Chlorophyll-a, salinity, swell height, wind speed, and 48h forecast) for an Indian Ocean region.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      region_id: {
        type: Type.STRING,
        description:
          'Region identifier: kerala-malabar, konkan-mumbai, gujarat-saurashtra, andhra-coromandel, andaman-basin, or all-indian-ocean.',
      },
    },
    required: ['region_id'],
  },
};

const getPotentialFishingZonesTool: FunctionDeclaration = {
  name: 'get_potential_fishing_zones',
  description:
    'Retrieve calibrated Potential Fishing Zone (PFZ) coordinates, bearing, distance in nautical miles, SST gradient, Chlorophyll-a concentration, and target fish species.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      region_id: {
        type: Type.STRING,
        description:
          'Optional region ID (kerala-malabar, konkan-mumbai, gujarat-saurashtra, andhra-coromandel, andaman-basin, or all-indian-ocean).',
      },
      target_species: {
        type: Type.STRING,
        description: 'Optional target species filter (e.g., Tuna, Mackerel, Sardine, Pomfret, Ribbonfish).',
      },
      max_distance_nm: {
        type: Type.NUMBER,
        description: 'Optional maximum distance from shore in nautical miles.',
      },
    },
  },
};

const getMarineSafetyAlertsTool: FunctionDeclaration = {
  name: 'get_marine_safety_alerts',
  description:
    'Retrieve active marine safety alerts, cyclonic depression tracks, high swell advisories, port warning signals, and algal bloom watches.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      region_id: {
        type: Type.STRING,
        description: 'Optional region ID or all-indian-ocean.',
      },
      severity_filter: {
        type: Type.STRING,
        description: 'Optional severity filter: Severe, Advisory, Watch, or all.',
      },
    },
  },
};

const controlCommandMapTool: FunctionDeclaration = {
  name: 'control_command_map',
  description:
    'Synchronize the SAMUDRA AI geospatial command map viewport to focus on a specific region, switch the active satellite EO layer, or highlight a PFZ/alert zone.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      focus_region_id: {
        type: Type.STRING,
        description:
          'Region ID to pan/zoom to: all-indian-ocean, kerala-malabar, konkan-mumbai, gujarat-saurashtra, andhra-coromandel, or andaman-basin.',
      },
      active_layer: {
        type: Type.STRING,
        description: 'Satellite layer to activate: sst, chlorophyll, pfz, or waves.',
      },
      highlight_zone_id: {
        type: Type.STRING,
        description: 'Optional PFZ ID (e.g. PFZ-KER-01) or Alert ID (e.g. ALT-BOB-994) to highlight.',
      },
    },
  },
};

const SYSTEM_TOOLS = [
  {
    functionDeclarations: [
      querySatelliteTelemetryTool,
      getPotentialFishingZonesTool,
      getMarineSafetyAlertsTool,
      controlCommandMapTool,
    ],
  },
];

function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  collectedTraces: AgentToolTrace[],
  mapDirective: MapControlDirective
): Record<string, unknown> {
  if (name === 'query_satellite_telemetry') {
    const regionId = typeof args.region_id === 'string' ? args.region_id : 'all-indian-ocean';
    const data = queryTelemetryByRegion(regionId);
    collectedTraces.push({
      toolName: 'Satellite Telemetry Query',
      summary: `Queried EOS-06 & OMNI buoy feeds for ${regionId}`,
      parameters: { regionId },
    });
    return { telemetry: data };
  }

  if (name === 'get_potential_fishing_zones') {
    const regionId = typeof args.region_id === 'string' ? args.region_id : undefined;
    const species = typeof args.target_species === 'string' ? args.target_species : undefined;
    const maxDist = typeof args.max_distance_nm === 'number' ? args.max_distance_nm : undefined;
    const zones = queryPfzZones(regionId, species, maxDist);
    collectedTraces.push({
      toolName: 'PFZ Delineation Matrix',
      summary: `Retrieved ${zones.length} calibrated PFZ polygons`,
      parameters: { regionId: regionId ?? 'all', species: species ?? 'all', maxDist },
    });
    return { pfzZones: zones };
  }

  if (name === 'get_marine_safety_alerts') {
    const regionId = typeof args.region_id === 'string' ? args.region_id : undefined;
    const severity = typeof args.severity_filter === 'string' ? args.severity_filter : 'all';
    const alerts = queryMarineAlerts(regionId, severity);
    collectedTraces.push({
      toolName: 'INCOIS / IMD Safety Feed',
      summary: `Evaluated ${alerts.length} active maritime alerts`,
      parameters: { regionId: regionId ?? 'all', severity },
    });
    return { alerts };
  }

  if (name === 'control_command_map') {
    const focusRegionId =
      typeof args.focus_region_id === 'string' ? args.focus_region_id : undefined;
    const activeLayer = typeof args.active_layer === 'string' ? (args.active_layer as MapLayer) : undefined;
    const highlightZoneId =
      typeof args.highlight_zone_id === 'string' ? args.highlight_zone_id : undefined;

    if (focusRegionId) mapDirective.focusRegionId = focusRegionId;
    if (activeLayer && ['sst', 'chlorophyll', 'pfz', 'waves'].includes(activeLayer)) {
      mapDirective.activeLayer = activeLayer;
    }
    if (highlightZoneId) mapDirective.highlightZoneId = highlightZoneId;

    collectedTraces.push({
      toolName: 'Geospatial Viewport Sync',
      summary: `Synced map focus → ${focusRegionId ?? 'current'} (${activeLayer ?? 'current layer'})`,
      parameters: { focusRegionId, activeLayer, highlightZoneId },
    });

    return { applied: true, focusRegionId, activeLayer, highlightZoneId };
  }

  return { error: `Unknown tool ${name}` };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/telemetry/overview', (_req, res) => {
    res.json({
      regions: REGIONS,
      pfzZones: PFZ_ZONES,
      alerts: MARINE_ALERTS,
      buoys: OMNI_BUOYS,
    });
  });

  app.post('/api/samudra/chat', async (req, res) => {
    try {
      const { message, role, activeRegionId, activeLayer, history } = req.body as {
        message?: string;
        role?: UserRole;
        activeRegionId?: string;
        activeLayer?: MapLayer;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Prompt message is required.' });
        return;
      }

      const ai = getGeminiClient();
      const persona = ROLE_PERSONAS.find((p) => p.id === role) ?? ROLE_PERSONAS[0];

      const systemInstruction = `You are SAMUDRA AI, an operational marine intelligence and satellite Earth Observation decision-support assistant built for Indian Ocean operations (ISRO EOS-06 / Oceansat-3, INSAT-3DR, Scatsat-1, and INCOIS OMNI buoys).

Current Operator Persona: ${persona.label} (Primary priority: ${persona.focus}).
Current Map Viewport Context: Region=${activeRegionId || 'all-indian-ocean'}, Active EO Layer=${activeLayer || 'pfz'}.

Operational Guidelines:
1. Always invoke your backend telemetry tools (query_satellite_telemetry, get_potential_fishing_zones, get_marine_safety_alerts) before quoting coordinates, SST, Chlorophyll-a, wave heights, or alerts—never invent numbers outside tool outputs.
2. Whenever your analysis focuses on a specific coastal basin or layer (sst, chlorophyll, pfz, waves), also call control_command_map so the operator's geospatial map synchronizes automatically.
3. Cross-check safety alerts whenever recommending fishing zones or vessel routes; if a region has a Severe alert (like Deep Depression BOB-04 in Bay of Bengal), prominently warn the operator.
4. Keep responses crisp, structured, scannable, and decision-ready with exact coordinates (°N, °E), bearings (°), distances (NM), and physical units (°C, mg/m³, m, kts, hPa). Avoid fluff.`;

      const contents: Content[] = [];
      if (Array.isArray(history)) {
        for (const turn of history.slice(-6)) {
          if (turn.content && (turn.role === 'user' || turn.role === 'assistant')) {
            contents.push({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content }],
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      });

      const toolTraces: AgentToolTrace[] = [];
      const mapDirective: MapControlDirective = {};

      let response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools: SYSTEM_TOOLS,
        },
      });

      // Multi-step agentic tool execution loop (up to 4 iterations)
      let stepCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && stepCount < 4) {
        stepCount += 1;
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent);
        }

        const functionResponseParts: Part[] = response.functionCalls.map((call) => {
          const result = executeToolCall(
            call.name ?? 'unknown',
            (call.args as Record<string, unknown>) ?? {},
            toolTraces,
            mapDirective
          );
          return {
            functionResponse: {
              id: call.id,
              name: call.name ?? 'unknown',
              response: result,
            },
          };
        });

        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });

        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            systemInstruction,
            tools: SYSTEM_TOOLS,
          },
        });
      }

      const replyText =
        response.text?.trim() ||
        'Telemetry retrieved. Inspect the synchronized map viewport and active layer readouts.';

      res.json({
        reply: replyText,
        toolTraces,
        mapDirective: Object.keys(mapDirective).length > 0 ? mapDirective : undefined,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unexpected failure contacting SAMUDRA AI.';
      console.error('SAMUDRA AI Error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAMUDRA AI command server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
