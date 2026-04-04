import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Sprout, Apple, Leaf, CloudRain, Sun, Cloud, CloudSun, AlertTriangle, ArrowRight } from "lucide-react";
import { EventLabel, EventType } from "@/components/EventLabel";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { safeArray } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useCrisis } from "@/contexts/CrisisContext";

const iconMap: Record<string, React.ElementType> = { Sprout, Apple, Leaf, CloudRain, Sun, Cloud, CloudSun };
const weatherIcons: Record<string, React.ElementType> = { Sun, Cloud, CloudRain, CloudSun };

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CROP_EMOJI: Record<string, string> = {
  kangkung: "🥬", bayam: "🌿", "bayam merah": "🌿", sawi: "🥗",
  "cili padi": "🌶️", cili: "🌶️", terung: "🍆", timun: "🥒",
  tomato: "🍅", jagung: "🌽", corn: "🌽", "sweet corn": "🌽",
  tapioca: "🌾", ubi: "🌾", pepper: "🌶️", pineapple: "🍍",
};
function cropEmoji(name: string) { return CROP_EMOJI[name?.toLowerCase()] ?? "🌱"; }

function emojiToIconKey(e: string) {
  if (!e) return "Sun";
  if (e.startsWith("☀") || e.startsWith("🌤")) return "Sun";
  if (e.startsWith("⛅")) return "CloudSun";
  if (e.startsWith("☁")) return "Cloud";
  return "CloudRain";
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function stageLabel(s: string) {
  const m: Record<string, string> = {
    not_planted: "Not Planted", seedling: "Seedling",
    vegetative: "Growing", flowering: "Flowering",
    fruiting: "Fruiting", maturity: "Maturity",
  };
  return m[s] ?? "Growing";
}

function fmtJoin(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function DashboardPage() {
  console.log('Dashboard rendered');
  const { user, activeProfile, isReady } = useAuth();
  const { farms } = useProfile();
  const { refreshKey } = useCrisis();
  const location = useLocation();
  const [showCrisis, setShowCrisis] = useState(false);
  const [crisisText, setCrisisText] = useState("Heavy Rain Advisory");
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [weather6, setWeather6] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [soilMoisture, setSoilMoisture] = useState<number | null>(null);

  useEffect(() => {
    console.log('useEffect fired', { isReady, activeProfile });
    if (!isReady || !activeProfile) return;

    const prefetched = (location.state as any)?.prefetched;

    // Load active planting logs
    if (prefetched?.logs) {
      setActiveLogs(prefetched.logs);
    } else {
      api.get("/api/planting-logs/active").then((res) => {
        console.log('Dashboard API response:', res);
        setActiveLogs(safeArray(res));
      }).catch(() => setActiveLogs([]));
    }

    // Load weather
    const applyWeather = (res: any) => {
      const arr: any[] = res.weather_array || [];
      const first6 = arr.slice(0, 6).map((d: any) => ({
        day: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
        temp: d.temp_max ?? "-",
        condition: d.weather_label ?? "Clear",
        icon: emojiToIconKey(d.weather_icon ?? ""),
        humidity: d.humidity ?? "-",
      }));
      setWeather6(first6);

      const day1 = arr[0];
      if (day1) {
        if (day1.soil_moisture) setSoilMoisture(Math.round((day1.soil_moisture as number) * 100));
        const crisis = (day1.flood_risk === "high") || (day1.drought_risk === "high");
        const warn = (day1.flood_risk === "medium") || (day1.drought_risk === "medium");
        if (crisis) { setShowCrisis(true); setCrisisText(`Flood risk high — protect sensitive crops in ${activeProfile.region_name}`); }
        else if (warn) { setShowCrisis(true); setCrisisText(`Weather advisory — monitor conditions in ${activeProfile.region_name}`); }
      }
    };

    if (prefetched?.weather) {
      applyWeather(prefetched.weather);
    } else {
      api.get(`/api/weather?profile_id=${activeProfile.id}`).then(applyWeather).catch(() => setWeather6([]));
    }
  }, [isReady, activeProfile, refreshKey]);

  // Derive upcoming events from active logs (harvest events)
  useEffect(() => {
    const events = activeLogs
      .filter((l: any) => l.estimated_harvest)
      .map((l: any) => ({
        id: l.id,
        type: "harvest" as EventType,
        title: `Harvest ${l.crop_name}`,
        date: l.estimated_harvest,
        time: "6:00 AM",
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(0, 4);
    setUpcomingEvents(events);
  }, [activeLogs]);

  const harvestReady = (Array.isArray(activeLogs) ? activeLogs : []).filter((l: any) => (l.growth_progress ?? 0) >= 80).length;

  const stats = [
    { label: "Active Crops", value: String(activeLogs.length || 0), change: "Currently growing", icon: "Sprout" as const },
    { label: "Harvest Ready", value: String(harvestReady), change: harvestReady > 0 ? "Ready to harvest" : "None ready yet", icon: "Apple" as const },
    { label: "Soil Health", value: activeProfile?.soil_type ? activeProfile.soil_type.split(" ")[0] : "—", change: soilMoisture !== null ? `Moisture ${soilMoisture}%` : "Good condition", icon: "Leaf" as const },
    { label: "Weather Alert", value: showCrisis ? "1" : "0", change: showCrisis ? "Advisory active" : "All clear", icon: "CloudRain" as const },
  ];

  const displayCrops = activeLogs.slice(0, 4).map((l: any) => ({
    id: l.id,
    emoji: cropEmoji(l.crop_name),
    name: l.crop_name,
    health: l.confidence ? (l.confidence >= 70 ? "Excellent" : l.confidence >= 50 ? "Good" : "Fair") : "Good",
    progress: l.growth_progress ?? 0,
    stage: stageLabel(l.growth_stage ?? ""),
    daysLeft: l.estimated_harvest ? Math.max(0, daysUntil(l.estimated_harvest)) : 0,
  }));

  const displayName = user?.user_metadata?.name ?? user?.email ?? "Farmer";
  const userLocation = activeProfile?.region_name ?? "—";
  const joinDate = fmtJoin(user?.created_at);

  const quickProfile = [
    { label: "Location", value: userLocation },
    { label: "Farms", value: String(farms.length || 0) },
    { label: "Member Since", value: joinDate },
    { label: "Active Crops", value: String(activeLogs.length || 0) },
  ];

  console.log('Render state:', { activeLogs, weather6, showCrisis });
  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-4">
        {/* Crisis banner */}
        {showCrisis && (
          <motion.div variants={anim} className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-warning">Weather Advisory</p>
                <p className="text-xs text-muted-foreground">{crisisText}</p>
              </div>
            </div>
            <button onClick={() => setShowCrisis(false)} className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0">Dismiss</button>
          </motion.div>
        )}

        {/* Welcome */}
        <motion.div variants={anim}>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {displayName.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening on your farm today.</p>
        </motion.div>

        {/* Bento grid - top stats */}
        <motion.div variants={anim} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => {
            const Icon = iconMap[s.icon] || Sprout;
            return (
              <div key={s.label} className="bg-card rounded-2xl p-4 card-shadow hover:card-shadow-hover transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                <p className="text-[10px] text-primary mt-1">{s.change}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Bento main section */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Active crops - 5 cols */}
          <motion.div variants={anim} className="lg:col-span-5 bg-card rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Active Crops</h2>
              <Link to="/my-crops" className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {displayCrops.length > 0 ? displayCrops.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{c.health}</span>
                    </div>
                    <Progress value={c.progress} className="h-1.5 mt-1.5" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{c.stage}</span>
                      <span className="text-[10px] text-muted-foreground">{c.daysLeft}d left</span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">No active crops yet. <Link to="/recommend" className="text-primary hover:underline">Get recommendations →</Link></p>
              )}
            </div>
          </motion.div>

          {/* Weather - 4 cols */}
          <motion.div variants={anim} className="lg:col-span-4 bg-card rounded-2xl p-5 card-shadow">
            <h2 className="font-semibold text-foreground mb-4">Weather Forecast</h2>
            <div className="grid grid-cols-3 gap-2">
              {(weather6.length > 0 ? weather6 : Array(6).fill(null)).map((w, i) => {
                const WIcon = w ? (weatherIcons[w.icon] || Sun) : Sun;
                return (
                  <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
                    <span className="text-[10px] font-medium text-muted-foreground">{w?.day ?? "—"}</span>
                    <WIcon className="h-5 w-5 text-primary my-1.5" />
                    <span className="text-sm font-bold text-foreground">{w?.temp ?? "—"}°</span>
                    <span className="text-[10px] text-muted-foreground">{w?.humidity ?? "—"}%</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Upcoming Events - 3 cols */}
          <motion.div variants={anim} className="lg:col-span-3 bg-card rounded-2xl p-5 card-shadow">
            <h2 className="font-semibold text-foreground mb-4">Upcoming Events</h2>
            <div className="space-y-2">
              {upcomingEvents.length > 0 ? upcomingEvents.map((e) => (
                <EventLabel key={e.id} type={e.type as EventType} label={e.title} date={`${e.date} • ${e.time}`} />
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom bento row */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div variants={anim} className="bg-card rounded-2xl p-5 card-shadow">
            <h2 className="font-semibold text-foreground mb-3">Soil Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Soil Type", value: activeProfile?.soil_type ?? "—" },
                { label: "pH Level", value: "6.2" },
                { label: "Moisture", value: soilMoisture !== null ? `${soilMoisture}%` : "—" },
                { label: "Nitrogen", value: "Medium" },
              ].map((item) => (
                <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={anim} className="bg-card rounded-2xl p-5 card-shadow">
            <h2 className="font-semibold text-foreground mb-3">Quick Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickProfile.map((item) => (
                <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
