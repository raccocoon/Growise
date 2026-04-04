import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Layers, Sprout, AlertTriangle, Droplets, Thermometer, CloudRain as CloudRainIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useCrisis } from "@/contexts/CrisisContext";
import { api } from "@/lib/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface PanelData {
  region: string;
  soil_profile: { dominant_soil: string };
  farming_snapshot: {
    avg_temp: number;
    total_rainfall_mm: number;
    avg_humidity: number;
    farming_score: number;
    farming_score_label: string;
  };
  risk_levels: { flood_risk: string; drought_risk: string };
  planting_insight: { next_suitable_window: string };
  suitable_crops: Array<{ crop_name: string; local_name: string }>;
  crisis_status: { crisis_flag: boolean; mode: string };
}

function riskColor(level: string) {
  const l = level?.toLowerCase();
  if (l === "high") return "text-destructive";
  if (l === "medium") return "text-warning";
  return "text-primary";
}

export default function MapPage() {
  const { crisisMode } = useCrisis();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [drawMode, setDrawMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [panelData, setPanelData] = useState<PanelData | null>(null);

  // Polygon drawing state (managed via refs to avoid stale closures in map listeners)
  const polygonPointsRef = useRef<L.LatLng[]>([]);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawModeRef = useRef(false);

  // Keep drawModeRef in sync with state
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  const clearDraw = useCallback(() => {
    if (markerLayerRef.current) markerLayerRef.current.clearLayers();
    if (polygonLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    polygonPointsRef.current = [];
  }, []);

  const analyzePolygon = useCallback(async (points: L.LatLng[]) => {
    if (points.length < 3) return;
    setAnalyzing(true);
    try {
      const polygon = points.map((p) => [p.lat, p.lng]);
      const result = await api.post("/api/map/analyze", { polygon });
      setPanelData(result);
    } catch {
      // silent — keep showing previous data
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([2.5, 111.5], 7);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Layer group for draw markers
    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!drawModeRef.current) return;
      const { lat, lng } = e.latlng;
      polygonPointsRef.current = [...polygonPointsRef.current, L.latLng(lat, lng)];

      // Small circle marker for each point
      L.circleMarker([lat, lng], { radius: 5, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 })
        .addTo(markerLayer);

      // Update preview polygon
      if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
      if (polygonPointsRef.current.length >= 2) {
        polygonLayerRef.current = L.polygon(polygonPointsRef.current, {
          color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 2,
        }).addTo(map);
      }
    });

    map.on("dblclick", (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      if (!drawModeRef.current) return;
      const points = polygonPointsRef.current;
      if (points.length >= 3) {
        drawModeRef.current = false;
        setDrawMode(false);
        analyzePolygon(points);
      }
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [analyzePolygon]);

  const handleDrawToggle = () => {
    if (drawMode) {
      // Finish — analyze if enough points
      const points = polygonPointsRef.current;
      if (points.length >= 3) {
        setDrawMode(false);
        analyzePolygon(points);
      } else {
        clearDraw();
        setDrawMode(false);
      }
    } else {
      clearDraw();
      setPanelData(null);
      setDrawMode(true);
    }
  };

  const loc = panelData;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Farm Map</h1>
          <p className="text-sm text-muted-foreground mt-1">Draw an area to analyze soil types & crop recommendations across Sarawak.</p>
        </div>

        {/* Crisis banner */}
        {crisisMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Crisis Mode Active</p>
              <p className="text-xs text-muted-foreground">Elevated flood & weather warnings are being monitored for your region.</p>
            </div>
          </motion.div>
        )}

        {/* Bento grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2 bg-card rounded-2xl card-shadow overflow-hidden relative" style={{ minHeight: "420px" }}>
            <div className="absolute top-3 left-3 z-[1000] flex gap-2">
              <button
                onClick={handleDrawToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shadow-md transition-all ${
                  drawMode ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {drawMode ? "Done Drawing" : "Draw Area"}
              </button>
            </div>
            {drawMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs text-muted-foreground shadow-md">
                Click to add points · Double-click to finish
              </div>
            )}
            {analyzing && (
              <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/40 backdrop-blur-sm">
                <div className="bg-card rounded-2xl px-6 py-4 card-shadow text-sm font-medium text-foreground flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Analyzing area...
                </div>
              </div>
            )}
            <div ref={mapRef} className="h-full w-full" style={{ minHeight: "420px" }} />
          </div>

          {/* Info panel */}
          <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
            {!loc ? (
              <div className="bg-card rounded-2xl p-5 card-shadow flex flex-col items-center justify-center text-center min-h-[200px] gap-3">
                <Layers className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">Draw an area on the map</p>
                <p className="text-xs text-muted-foreground">Click "Draw Area" then mark your farm boundary to get soil, weather, and crop insights.</p>
              </div>
            ) : (
              <>
                {/* Crisis banner in panel */}
                {loc.crisis_status?.crisis_flag && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-xs font-semibold text-destructive">Crisis Active — Extreme weather conditions</p>
                  </div>
                )}

                {/* Region header */}
                <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Region</p>
                    <h2 className="text-lg font-bold text-foreground">{loc.region}</h2>
                  </div>

                  {/* Soil */}
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">🌍 Soil Profile</p>
                    <p className="text-sm font-semibold text-foreground">Dominant Soil: {loc.soil_profile.dominant_soil}</p>
                  </div>

                  {/* Weather snapshot */}
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">🌤️ 6-Day Farming Snapshot</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Avg Temp:</span>
                        <span className="font-semibold text-foreground">{loc.farming_snapshot.avg_temp}°C</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CloudRainIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Rainfall:</span>
                        <span className="font-semibold text-foreground">{loc.farming_snapshot.total_rainfall_mm}mm</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Humidity:</span>
                        <span className="font-semibold text-foreground">{loc.farming_snapshot.avg_humidity}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sprout className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-semibold text-foreground">{loc.farming_snapshot.farming_score} ({loc.farming_snapshot.farming_score_label})</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk levels */}
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">⚠️ Risk Levels</p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Flood Risk: </span>
                        <span className={`font-semibold ${riskColor(loc.risk_levels.flood_risk)}`}>
                          {loc.risk_levels.flood_risk}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Drought Risk: </span>
                        <span className={`font-semibold ${riskColor(loc.risk_levels.drought_risk)}`}>
                          {loc.risk_levels.drought_risk}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Suitable planting window */}
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">📅 Suitable Planting Window</p>
                    <p className="text-sm text-muted-foreground">Create Farm Profile To Get More Info</p>
                  </div>
                </div>

                {/* Suitable crops */}
                <div className="bg-card rounded-2xl p-5 card-shadow">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">🌱 Suitable Crops (Regional)</h3>
                  <div className="space-y-2">
                    {loc.suitable_crops.slice(0, 3).map((crop, i) => (
                      <div key={crop.crop_name} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                        <Sprout className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{i + 1}. {crop.crop_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
