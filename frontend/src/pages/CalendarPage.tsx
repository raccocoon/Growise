import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSun, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, safeArray } from "@/lib/utils";
import { EventLabel, EventType } from "@/components/EventLabel";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCrisis } from "@/contexts/CrisisContext";

const weatherIcons: Record<string, React.ElementType> = { Sun, Cloud, CloudRain, CloudSun };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function emojiToIconKey(e: string) {
  if (!e) return "Sun";
  if (e.startsWith("☀") || e.startsWith("🌤")) return "Sun";
  if (e.startsWith("⛅")) return "CloudSun";
  if (e.startsWith("☁")) return "Cloud";
  return "CloudRain";
}

function calType(type: string): EventType {
  if (type === "plant") return "planting";
  if (type === "fertilize") return "fertilizing";
  if (type === "harvest") return "harvest";
  return "pesticide";
}

function calTitle(e: any, cropName?: string): string {
  const suffix = cropName ? ` ${cropName}` : "";
  if (e.type === "plant") return `Plant${suffix}`;
  if (e.type === "fertilize") return `Fertilize${suffix}`;
  if (e.type === "pesticide") return `Spray${suffix}`;
  if (e.type === "harvest") return `Harvest${suffix}`;
  if (e.type === "crisis_advisory") return "Crisis Advisory";
  return `Task${suffix}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { activeProfile, isReady } = useAuth();
  const { refreshKey } = useCrisis();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [eventsByDate, setEventsByDate] = useState<Record<string, Array<{ id: string; type: EventType; title: string; date: string; time: string; cropName: string }>>>({});
  const [weatherByDate, setWeatherByDate] = useState<Record<string, any>>({});
  const [weather6, setWeather6] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [crisisFlag, setCrisisFlag] = useState(false);
  const [warningFlag, setWarningFlag] = useState(false);
  const [crisisTriggers, setCrisisTriggers] = useState<string[]>([]);

  useEffect(() => {
    if (!isReady || !activeProfile) return;

    // Load active crops, then fetch calendar for each
    api.get("/api/planting-logs/active").then(async (res) => {
      const logs: any[] = safeArray(res);
      if (logs.length === 0) return;

      const results = await Promise.allSettled(
        logs.map((log: any) =>
          api.post("/api/calendar", {
            profile_id: activeProfile.id,
            crop_name: log.crop_name,
            planted_date: log.planted_date,
            growth_duration_days: log.growth_duration_days,
          }).then((r) => ({ ...r, cropName: log.crop_name }))
        )
      );

      const merged: typeof eventsByDate = {};
      const wByDate: typeof weatherByDate = {};
      let w6Set = false;
      let anycrisis = false;
      let anywarn = false;
      const triggers: string[] = [];
      const upcoming: any[] = [];

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const data = result.value;
        const cropName: string = data.cropName ?? "";

        if (data.crisis_status?.crisis_flag) { anycrisis = true; triggers.push(...(data.crisis_status.triggers || [])); }
        if (data.crisis_status?.warning_flag) anywarn = true;

        const calendar: any[] = data.calendar || [];
        if (!w6Set && calendar.length >= 6) {
          const strip = calendar.slice(0, 6).map((d: any) => ({
            day: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
            temp: d.weather?.temp_max ?? "—",
            icon: emojiToIconKey(d.weather?.weather_icon ?? ""),
            humidity: d.weather?.humidity ?? "—",
          }));
          setWeather6(strip);
          w6Set = true;
        }

        for (const day of calendar) {
          const dateStr: string = day.date;
          wByDate[dateStr] = day.weather;
          const events: any[] = (day.events || []).filter((e: any) => e.type !== "crisis_advisory");
          if (!merged[dateStr]) merged[dateStr] = [];
          for (const e of events) {
            const id = `${dateStr}-${cropName}-${e.type}`;
            const time = e.best_time ?? e.spray_time ?? "Morning";
            merged[dateStr].push({ id, type: calType(e.type), title: calTitle(e, cropName), date: dateStr, time, cropName });
          }
        }
      }

      // Build upcoming: next 5 events from today sorted
      const todayStr = today.toISOString().split("T")[0];
      const allFuture = Object.entries(merged)
        .filter(([d]) => d >= todayStr)
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([, evs]) => evs);
      setUpcomingEvents(allFuture.slice(0, 5));

      setEventsByDate(merged);
      setWeatherByDate(wByDate);
      setCrisisFlag(anycrisis);
      setWarningFlag(anywarn);
      setCrisisTriggers([...new Set(triggers)]);
    }).catch(() => { /* silent */ });
  }, [isReady, activeProfile, refreshKey]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDay, daysInMonth]);

  const getDateStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const getEventsForDate = (dateStr: string) => eventsByDate[dateStr] || [];
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selWeather = selectedDate ? weatherByDate[selectedDate] : null;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Farm Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Track planting, fertilizing, and harvest schedules.</p>
        </div>

        {/* Crisis banner */}
        {(crisisFlag || warningFlag) && (
          <div className={cn("border rounded-2xl p-4 flex items-center gap-3", crisisFlag ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30")}>
            <AlertTriangle className={cn("h-5 w-5 flex-shrink-0", crisisFlag ? "text-destructive" : "text-warning")} />
            <div>
              <p className={cn("font-semibold text-sm", crisisFlag ? "text-destructive" : "text-warning")}>
                {crisisFlag ? "Crisis Mode Active" : "Weather Advisory"}
              </p>
              <p className="text-xs text-muted-foreground">{crisisTriggers.join(", ") || "Extreme weather conditions detected"}</p>
            </div>
          </div>
        )}

        {/* Weather strip */}
        <div className="grid grid-cols-6 gap-2">
          {(weather6.length > 0 ? weather6 : Array(6).fill(null)).map((w, i) => {
            const WIcon = w ? (weatherIcons[w.icon] || Sun) : Sun;
            return (
              <div key={i} className="flex items-center gap-2 bg-card rounded-2xl px-3 py-2.5 card-shadow">
                <WIcon className="h-4 w-4 text-primary flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-foreground">{w?.day ?? "—"}</span>
                  <span className="text-xs text-muted-foreground ml-1">{w?.temp ?? "—"}°</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bento layout */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Calendar grid */}
          <div className="lg:col-span-8 bg-card rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="font-semibold text-foreground">{monthName}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 border-b border-border pb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-left text-xs font-medium text-muted-foreground pl-1.5">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className="aspect-square" />;
                const dateStr = getDateStr(day);
                const events = getEventsForDate(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "relative p-1 rounded-xl text-sm aspect-square flex flex-col items-start transition-colors",
                      isToday && "ring-2 ring-primary",
                      isSelected && "bg-primary/10",
                      !isSelected && "hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("text-xs font-medium", isToday ? "text-primary font-bold" : "text-foreground")}>{day}</span>
                    <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                      {events.slice(0, 2).map((e) => (
                        <EventLabel key={e.id} type={e.type as EventType} label={e.title} compact />
                      ))}
                      {events.length > 2 && <span className="text-[7px] text-muted-foreground">+{events.length - 2}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="lg:col-span-4 space-y-4">
            <AnimatePresence mode="wait">
              {selectedDate && (
                <motion.div
                  key={selectedDate}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-card rounded-2xl p-5 card-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-[#1a1a1a]">
                        {new Date(selectedDate + "T00:00:00").getDate()}
                      </span>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short" })}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2">
                      {(() => { const WIcon = selWeather ? (weatherIcons[emojiToIconKey(selWeather.weather_icon ?? "")] || Sun) : Sun; return <WIcon className="h-4 w-4 text-primary" />; })()}
                      <div>
                        <p className="text-xs font-medium">{selWeather ? `${selWeather.temp_max ?? "—"}°C — ${selWeather.weather_label ?? "—"}` : "31°C — Partly Cloudy"}</p>
                        <p className="text-[10px] text-muted-foreground">Humidity: {selWeather?.humidity ?? "—"}%</p>
                      </div>
                    </div>
                  </div>

                  {selectedEvents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvents.map((e) => (
                        <EventLabel key={e.id} type={e.type as EventType} label={e.title} date={e.time} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No events scheduled</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upcoming events */}
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <h3 className="font-semibold text-foreground text-sm mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {upcomingEvents.length > 0 ? upcomingEvents.map((e) => (
                  <EventLabel key={e.id} type={e.type as EventType} label={e.title} date={`${e.date} • ${e.time}`} />
                )) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No upcoming events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
