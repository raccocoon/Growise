import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Droplets, Scissors, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn, safeArray } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCrisis } from "@/contexts/CrisisContext";
import { useNavigate } from "react-router-dom";

const stageColors: Record<string, string> = {
  Seedling: "bg-emerald-100 text-emerald-700",
  Growing: "bg-blue-100 text-blue-700",
  Flowering: "bg-purple-100 text-purple-700",
  Fruiting: "bg-amber-100 text-amber-700",
  Maturity: "bg-green-100 text-green-700",
};

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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

export default function MyCropsPage() {
  const { activeProfile, isReady } = useAuth();
  const { refreshKey } = useCrisis();
  const navigate = useNavigate();
  const [showHarvested, setShowHarvested] = useState(false);
  const [activeCrops, setActiveCrops] = useState<any[]>([]);
  const [harvestedCrops, setHarvestedCrops] = useState<any[]>([]);
  const [harvestingId, setHarvestingId] = useState<string | null>(null);

  const loadLogs = () => {
    api.get("/api/planting-logs").then((res) => {
      const logs: any[] = safeArray(res);
      setActiveCrops(logs.filter((l) => !l.actual_harvest));
      setHarvestedCrops(logs.filter((l) => !!l.actual_harvest));
    }).catch(() => {
      setActiveCrops([]);
      setHarvestedCrops([]);
    });
  };

  useEffect(() => {
    if (!isReady || !activeProfile) return;
    loadLogs();
  }, [isReady, activeProfile, refreshKey]);

  const handleHarvest = async (logId: string) => {
    setHarvestingId(logId);
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.patch(`/api/planting-logs/${logId}/harvest`, { actual_harvest: today });
      loadLogs();
    } catch {
      // silent
    } finally {
      setHarvestingId(null);
    }
  };

  const displayActive = activeCrops.map((l: any) => {
    const dl = l.estimated_harvest ? daysUntil(l.estimated_harvest) : 0;
    return {
      id: l.id,
      emoji: cropEmoji(l.crop_name),
      name: l.crop_name,
      area: l.farm_profiles?.region_name ?? l.local_name ?? "Farm",
      stage: stageLabel(l.growth_stage ?? ""),
      progress: l.growth_progress ?? 0,
      daysLeft: dl,
      health: l.confidence ? (l.confidence >= 70 ? "Excellent" : l.confidence >= 50 ? "Good" : "Fair") : "Good",
      overdue: dl < 0,
      nearHarvest: dl <= 5,
    };
  });

  const displayHarvested = harvestedCrops.map((l: any) => ({
    id: l.id,
    emoji: cropEmoji(l.crop_name),
    name: l.crop_name,
    area: l.farm_profiles?.region_name ?? "Farm",
    harvestDate: l.actual_harvest ?? "—",
    yield: l.notes ?? "",
  }));

  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-4">
        <motion.div variants={anim}>
          <h1 className="text-2xl font-bold text-foreground">My Crops</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your active plantings.</p>
        </motion.div>

        {/* Bento crop cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayActive.length === 0 && (
            <div className="col-span-3 text-center py-10 text-muted-foreground text-sm">
              No active crops. <a href="/recommend" className="text-primary hover:underline">Get recommendations →</a>
            </div>
          )}
          {displayActive.map((crop) => (
            <motion.div
              key={crop.id}
              variants={anim}
              className={cn("bg-card rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-shadow", crop.overdue && "border border-orange-300")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {crop.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{crop.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{crop.area}</p>
                  </div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", stageColors[crop.stage] || "bg-muted text-muted-foreground")}>
                  {crop.stage}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Growth</span>
                  <span className="font-medium text-foreground">{crop.progress}%</span>
                </div>
                <Progress value={crop.progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span className={cn(crop.overdue && "text-destructive font-medium")}>
                  {crop.overdue ? "Overdue" : `${crop.daysLeft}d to harvest`}
                </span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", crop.health === "Excellent" ? "bg-primary/10 text-primary" : crop.health === "Good" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>
                  {crop.health}
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 text-primary py-2 rounded-xl text-xs font-medium hover:bg-primary/20 transition-colors">
                  <Droplets className="h-3 w-3" /> Water
                </button>
                <button
                  onClick={() => navigate(`/crops/${crop.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-muted-foreground py-2 rounded-xl text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Eye className="h-3 w-3" /> Details
                </button>
                {(crop.nearHarvest || crop.overdue) && (
                  <button
                    onClick={() => handleHarvest(crop.id)}
                    disabled={harvestingId === crop.id}
                    className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    <Scissors className="h-3 w-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Harvested section */}
        <motion.div variants={anim} className="bg-card rounded-2xl card-shadow overflow-hidden">
          <button
            onClick={() => setShowHarvested(!showHarvested)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <span className="font-semibold text-sm text-foreground">Harvested ({displayHarvested.length})</span>
            {showHarvested ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showHarvested && (
            <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2">
              {displayHarvested.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No harvested crops yet.</p>
              )}
              {displayHarvested.map((crop) => (
                <div key={crop.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{crop.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{crop.name}</p>
                      <p className="text-[10px] text-muted-foreground">{crop.area} • {crop.harvestDate}</p>
                    </div>
                  </div>
                  {crop.yield && <span className="text-sm font-semibold text-primary">{crop.yield}</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
