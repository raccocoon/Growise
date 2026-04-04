import { DashboardLayout } from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCrisis } from "@/contexts/CrisisContext";
import { AlertCircle } from "lucide-react";

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CROP_EMOJI: Record<string, string> = {
  kangkung: "🥬", bayam: "🌿", "bayam merah": "🌿", sawi: "🥗",
  "cili padi": "🌶️", cili: "🌶️", terung: "🍆", timun: "🥒",
  tomato: "🍅", jagung: "🌽", corn: "🌽", "sweet corn": "🌽",
  tapioca: "🌾", ubi: "🌾", pepper: "🌶️", pineapple: "🍍",
};
function cropEmoji(name: string) { return CROP_EMOJI[name?.toLowerCase()] ?? "🌱"; }

export default function RecommendPage() {
  const { activeProfile, isReady } = useAuth();
  const { refreshKey } = useCrisis();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [crisisFlag, setCrisisFlag] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !activeProfile) return;
    setLoading(true);
    api.post("/api/recommend", { profile_id: activeProfile.id })
      .then((res) => {
        const recs = (res.recommendations || []).slice(0, 3).map((r: any, i: number) => ({
          id: i + 1,
          name: r.crop_name,
          emoji: cropEmoji(r.crop_name),
          confidence: r.confidence ?? 0,
          growTime: r.growth_duration_days ? `${r.growth_duration_days} days` : "30 days",
          waterNeed: "Medium",
          difficulty: r.difficulty ?? "Easy",
          season: r.local_name ?? "Year-round",
          tags: [r.difficulty, r.main_concern].filter(Boolean).slice(0, 2),
          raw: r,
        }));
        setRecommendations(recs);
        setCrisisFlag(res.crisis_status?.crisis_flag ?? false);
        setRateLimited(!!(res.rate_limited || res.ai_source === "preset"));
        // Cache for CropDetailPage
        sessionStorage.setItem("recommendations", JSON.stringify(recs));
      })
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, [isReady, activeProfile, refreshKey]);

  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-4">
        <motion.div variants={anim}>
          <h1 className="text-2xl font-bold text-foreground">Crop Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered suggestions based on your soil, weather, and location.</p>
        </motion.div>

        {/* Crisis banner */}
        {crisisFlag && (
          <motion.div variants={anim} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Crisis Mode Active</p>
              <p className="text-xs text-muted-foreground">Only survival crops shown — extreme weather conditions detected.</p>
            </div>
          </motion.div>
        )}

        {/* Rate limit banner */}
        {rateLimited && (
          <motion.div variants={anim} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">AI rate limit reached. Showing best-match suggestions based on your farm profile.</p>
          </motion.div>
        )}

        {/* Top banner */}
        <motion.div variants={anim} className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Smart Matching Active</p>
            <p className="text-xs text-muted-foreground">We analyzed your soil type, local weather patterns, and farm location to find the best crops for you.</p>
          </div>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-5 card-shadow animate-pulse">
                <div className="h-14 w-14 rounded-2xl bg-muted mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Bento crop cards grid */}
        {!loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((crop, index) => (
              <motion.div key={crop.id} variants={anim}>
                <Link to={`/recommend/${crop.id}`}>
                  <div className={`bg-card rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-all cursor-pointer group ${index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0">
                        {crop.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{crop.name}</h3>
                        <p className="text-xs text-muted-foreground">{crop.season}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence Score</span>
                        <span className="font-bold text-primary text-sm">{crop.confidence}%</span>
                      </div>
                      <Progress value={crop.confidence} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {crop.tags.slice(0, 2).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            {!loading && recommendations.length === 0 && !activeProfile && (
              <div className="col-span-3 text-center py-10 text-muted-foreground text-sm">
                Set up your farm profile to get personalized recommendations.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
