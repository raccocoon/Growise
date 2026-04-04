import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  ArrowLeft, Scissors, Droplets, Bug, CalendarDays,
  TrendingUp, AlertTriangle, Sun, Cloud, CloudRain, CloudSun, Thermometer,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface CalendarDay {
  date: string;
  day_number: number;
  is_crisis: boolean;
  weather: {
    temp_max: number | null;
    humidity: number | null;
    weather_icon: string | null;
    rainfall_mm: number | null;
  };
  events: Array<{ type: string; best_time?: string; spray_time?: string; fertilizer_name?: string; message?: string; [key: string]: any }>;
  alerts: Array<{ type: string; message: string }>;
}

interface HarvestSummary {
  adjusted_harvest_date: string | null;
  base_harvest_date: string | null;
  readiness_status: string | null;
  readiness_message: string | null;
  stress_delay_days: number | null;
  harvest_confidence: number | null;
  harvest_confidence_label: string | null;
}

interface CalendarResponse {
  crisis_status: { crisis_flag: boolean; warning_flag: boolean; triggers: string[] };
  harvest_summary: HarvestSummary;
  calendar: CalendarDay[];
}

const CROP_EMOJI: Record<string, string> = {
  kangkung: "🥬", bayam: "🌿", "bayam merah": "🌿", sawi: "🥗",
  "cili padi": "🌶️", cili: "🌶️", terung: "🍆", timun: "🥒",
  tomato: "🍅", jagung: "🌽", corn: "🌽", "sweet corn": "🌽",
  tapioca: "🌾", ubi: "🌾", pepper: "🌶️", pineapple: "🍍",
};
function cropEmoji(name: string) { return CROP_EMOJI[name?.toLowerCase()] ?? "🌱"; }

function stageLabel(s: string) {
  const m: Record<string, string> = {
    not_planted: "Not Planted", seedling: "Seedling",
    vegetative: "Growing", flowering: "Flowering",
    fruiting: "Fruiting", maturity: "Maturity",
  };
  return m[s] ?? "Growing";
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

const weatherIcons: Record<string, React.ElementType> = { Sun, Cloud, CloudRain, CloudSun };
function emojiToIconKey(e: string) {
  if (!e) return "Sun";
  if (e.startsWith("☀") || e.startsWith("🌤")) return "Sun";
  if (e.startsWith("⛅")) return "CloudSun";
  if (e.startsWith("☁")) return "Cloud";
  return "CloudRain";
}

function eventTypeLabel(type: string): string {
  if (type === "fertilize") return "Fertilize";
  if (type === "pesticide") return "Spray";
  if (type === "harvest") return "Harvest";
  if (type === "plant") return "Plant";
  return "Task";
}

function eventTypeBadge(type: string): string {
  if (type === "fertilize") return "bg-amber-100 text-amber-700";
  if (type === "pesticide") return "bg-purple-100 text-purple-700";
  if (type === "harvest") return "bg-primary/10 text-primary";
  if (type === "plant") return "bg-emerald-100 text-emerald-700";
  return "bg-muted text-muted-foreground";
}

export default function CropLogDetailPage() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const { activeProfile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [log, setLog] = useState<any>(null);
  const [calData, setCalData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvesting, setHarvesting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Load planting log
  useEffect(() => {
    if (!activeProfile) return;
    api.get("/api/planting-logs").then((res) => {
      const logs: any[] = res.data || [];
      const found = logs.find((l: any) => String(l.id) === String(logId));
      if (found) setLog(found);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeProfile, logId]);

  // Load calendar when log is ready
  useEffect(() => {
    if (!log || !activeProfile) return;
    setLoading(true);
    api.post("/api/calendar", {
      profile_id: log.farm_profile_id,
      crop_name: log.crop_name,
      planted_date: log.planted_date,
      growth_duration_days: log.growth_duration_days ?? 30,
    }).then((res: any) => {
      setCalData(res);
    }).catch(() => {
      setCalData(null);
    }).finally(() => setLoading(false));
  }, [log, activeProfile]);

  const handleHarvest = async () => {
    if (!log) return;
    setHarvesting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.patch(`/api/planting-logs/${log.id}/harvest`, { actual_harvest: today });
      navigate("/my-crops");
    } catch {
      // silent
    } finally {
      setHarvesting(false);
    }
  };

  if (!log && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Crop log not found.</p>
          <button onClick={() => navigate("/my-crops")} className="text-primary text-sm mt-2 hover:underline">
            ← Back to My Crops
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const daysLeft = log.estimated_harvest ? daysUntil(log.estimated_harvest) : 0;
  const overdue = daysLeft < 0;
  const todayStr = new Date().toISOString().split("T")[0];

  const weather6 = calData?.calendar?.slice(0, 6).map((d) => ({
    day: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    temp: d.weather?.temp_max ?? "—",
    icon: emojiToIconKey(d.weather?.weather_icon ?? ""),
  })) ?? [];

  const upcomingEvents = calData?.calendar
    ?.filter((d) => d.date >= todayStr)
    .flatMap((d) => d.events.filter((e) => e.type !== "crisis_advisory").map((e) => ({ ...e, date: d.date })))
    .slice(0, 5) ?? [];

  const fertilizeEvents = calData?.calendar
    ?.flatMap((d) => d.events.filter((e) => e.type === "fertilize").map((e) => ({ ...e, date: d.date })))
    .slice(0, 3) ?? [];

  const pesticideEvents = calData?.calendar
    ?.flatMap((d) => d.events.filter((e) => e.type === "pesticide").map((e) => ({ ...e, date: d.date })))
    .slice(0, 3) ?? [];

  const harvest = calData?.harvest_summary;
  const crisis = calData?.crisis_status;
  const cal = calData?.calendar ?? [];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate("/my-crops")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Crops
        </button>

        {/* Crisis banner */}
        {crisis?.crisis_flag && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Crisis Mode Active</p>
              <p className="text-xs text-muted-foreground">
                {crisis.triggers?.join(", ") || "Extreme weather conditions detected"}
              </p>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">
              {cropEmoji(log.crop_name)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground capitalize">{log.crop_name}</h1>
              <p className="text-sm text-muted-foreground">
                {log.farm_profiles?.region_name ?? log.local_name ?? "Farm"}
              </p>
            </div>
            <div className="text-right">
              <span className={cn("text-lg font-bold", overdue ? "text-destructive" : "text-primary")}>
                {overdue ? "Overdue" : `${daysLeft}d`}
              </span>
              <p className="text-xs text-muted-foreground">to harvest</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Growth Progress</span>
              <span className="font-medium text-foreground">{log.growth_progress ?? 0}%</span>
            </div>
            <Progress value={log.growth_progress ?? 0} className="h-2" />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {stageLabel(log.growth_stage ?? "")}
            </span>
            {log.planted_date && (
              <span className="text-xs text-muted-foreground">Planted: {log.planted_date}</span>
            )}
            {log.estimated_harvest && (
              <span className="text-xs text-muted-foreground ml-auto">Est. harvest: {log.estimated_harvest}</span>
            )}
          </div>
        </div>

        {/* Weather strip */}
        {weather6.length > 0 && (
          <div className="grid grid-cols-6 gap-2">
            {weather6.map((w, i) => {
              const WIcon = weatherIcons[w.icon] || Sun;
              return (
                <div key={i} className="flex items-center gap-2 bg-card rounded-2xl px-3 py-2.5 card-shadow">
                  <WIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-foreground">{w.day}</span>
                    <span className="text-xs text-muted-foreground ml-1">{w.temp}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Harvest prediction + Upcoming tasks */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Harvest Prediction
            </h2>
            {harvest ? (
              <div className="space-y-2 text-sm">
                <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected date</span>
                    <span className="font-semibold text-foreground">
                      {harvest.adjusted_harvest_date ?? harvest.base_harvest_date ?? "—"}
                    </span>
                  </div>
                  {harvest.stress_delay_days != null && harvest.stress_delay_days > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weather delay</span>
                      <span className="font-semibold text-amber-600">+{harvest.stress_delay_days}d</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold text-foreground">
                      {harvest.harvest_confidence_label ?? "—"}
                    </span>
                  </div>
                </div>
                {harvest.readiness_message && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                    {harvest.readiness_message}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No harvest prediction available.</p>
            )}
          </div>

          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Tasks
            </h2>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0", eventTypeBadge(e.type))}>
                      {eventTypeLabel(e.type)}
                    </span>
                    <span className="text-xs text-foreground flex-1">{e.date}</span>
                    {(e.best_time ?? e.spray_time) && (
                      <span className="text-[10px] text-muted-foreground">{e.best_time ?? e.spray_time}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No upcoming tasks.</p>
            )}
          </div>
        </div>

        {/* Fertilize & Pesticide */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" /> Fertilize Schedule
            </h2>
            {fertilizeEvents.length > 0 ? (
              <div className="space-y-2">
                {fertilizeEvents.map((e, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-amber-800">{e.date}</p>
                      {e.spray_time && <span className="text-[10px] text-amber-600">{e.spray_time}</span>}
                    </div>
                    {e.fertilizer_name && (
                      <p className="text-xs text-amber-700 mt-0.5">{e.fertilizer_name}</p>
                    )}
                    {e.message && (
                      <p className="text-[10px] text-amber-600 mt-0.5">{e.message}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No fertilize events scheduled.</p>
            )}
          </div>

          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" /> Pesticide Alerts
            </h2>
            {pesticideEvents.length > 0 ? (
              <div className="space-y-2">
                {pesticideEvents.map((e, i) => (
                  <div key={i} className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-purple-800">{e.date}</p>
                      {e.spray_time && <span className="text-[10px] text-purple-600">{e.spray_time}</span>}
                    </div>
                    {e.message && <p className="text-[10px] text-purple-600 mt-0.5">{e.message}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No pesticide alerts.</p>
            )}
          </div>
        </div>

        {/* 30-day scrollable strip */}
        {cal.length > 0 && (
          <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
            <h2 className="text-sm font-semibold text-foreground">30-Day Overview</h2>
            <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2">
              {cal.map((day, i) => {
                const WIcon = weatherIcons[emojiToIconKey(day.weather?.weather_icon ?? "")] || Sun;
                const hasEvents = day.events.filter((e) => e.type !== "crisis_advisory").length > 0;
                const isSelected = i === selectedDay;
                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl min-w-[52px] transition-colors",
                      isSelected ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/30 hover:bg-muted/60",
                      day.is_crisis && "ring-1 ring-destructive/40"
                    )}
                  >
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <WIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground">{day.weather?.temp_max ?? "—"}°</span>
                    {hasEvents && <div className="h-1 w-1 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Selected day detail */}
            {cal[selectedDay] && (() => {
              const d = cal[selectedDay];
              const dayEvents = d.events.filter((e) => e.type !== "crisis_advisory");
              return (
                <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{d.date}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> {d.weather?.temp_max ?? "—"}°C
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> {d.weather?.humidity ?? "—"}%
                      </span>
                    </div>
                  </div>
                  {d.alerts.length > 0 && (
                    <div className="space-y-1">
                      {d.alerts.map((a, ai) => (
                        <p
                          key={ai}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded-lg",
                            a.type === "CRITICAL" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {a.message}
                        </p>
                      ))}
                    </div>
                  )}
                  {dayEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dayEvents.map((e, ei) => (
                        <span key={ei} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", eventTypeBadge(e.type))}>
                          {eventTypeLabel(e.type)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No tasks today.</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Mark as Harvested */}
        {!log.actual_harvest && (
          <button
            onClick={handleHarvest}
            disabled={harvesting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Scissors className="h-4 w-4" />
            {harvesting ? "Recording harvest..." : "Mark as Harvested"}
          </button>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
