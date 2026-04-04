import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, Clock, Droplets, TrendingUp, Rocket, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

const CROP_EMOJI: Record<string, string> = {
  kangkung: "🥬", bayam: "🌿", "bayam merah": "🌿", sawi: "🥗",
  "cili padi": "🌶️", cili: "🌶️", terung: "🍆", timun: "🥒",
  tomato: "🍅", jagung: "🌽", "sweet corn": "🌽", tapioca: "🌾",
  pepper: "🌶️", pineapple: "🍍",
};
function cropEmoji(name: string) { return CROP_EMOJI[name?.toLowerCase()] ?? "🌱"; }

function guideText(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val || "—";
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return val.map((s: any) => (typeof s === "string" ? s : s.action ?? s.title ?? JSON.stringify(s))).join("\n\n");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const parts = Object.values(obj).map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
    return parts.join(" ") || "—";
  }
  return String(val);
}

export default function CropDetailPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { activeProfile, isReady } = useAuth();
  const { farms } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [crop, setCrop] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const [guideRateLimited, setGuideRateLimited] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Load crop from sessionStorage cache set by RecommendPage
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("recommendations");
      if (cached) {
        const recs = JSON.parse(cached);
        const found = recs.find((r: any) => String(r.id) === String(cropId));
        if (found) setCrop(found);
      }
    } catch { /* ignore */ }
  }, [cropId]);

  // Load guide when crop and profile are ready
  useEffect(() => {
    if (!isReady || !crop || !activeProfile) return;
    setGuideLoading(true);
    setGuideError(false);
    api.post("/api/guide", {
      profile_id: activeProfile.id,
      crop_name: crop.name,
      local_name: crop.season ?? "",
      growth_duration_days: parseInt(crop.growTime) || 30,
      main_concern: crop.tags?.[1] ?? "",
      confidence: crop.confidence ?? 0,
    }).then((res) => {
      setGuide(res.guide ?? {});
      setGuideRateLimited(!!(res.rate_limited || res.ai_source === "preset"));
    }).catch(() => {
      setGuideError(true);
    }).finally(() => {
      setGuideLoading(false);
    });
  }, [isReady, crop, activeProfile]);

  // Pre-select first farm
  useEffect(() => {
    if (farms.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms]);

  const handleStartGrowing = async () => {
    if (!selectedFarmId || !crop) return;
    setStartError("");
    setStarting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.post("/api/planting-logs/start", {
        profile_id: selectedFarmId,
        crop_name: crop.name,
        local_name: crop.season ?? "",
        growth_duration_days: parseInt(crop.growTime) || 30,
        planted_date: today,
        confidence: crop.confidence ?? 0,
        difficulty: crop.difficulty ?? "",
      });
      setModalOpen(false);
      navigate("/my-crops");
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : "Failed to start growing");
    } finally {
      setStarting(false);
    }
  };

  if (!crop) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Crop not found.</p>
          <Link to="/recommend" className="text-primary text-sm mt-2 hover:underline">← Back to Recommendations</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link to="/recommend" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Recommendations
        </Link>

        {/* Header card */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">
              {crop.emoji}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{crop.name}</h1>
              <p className="text-sm text-muted-foreground">{crop.season}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{crop.confidence}%</span>
              <p className="text-xs text-muted-foreground">Match</p>
            </div>
          </div>

          <Progress value={crop.confidence} className="h-2 mb-4" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-semibold text-foreground">{crop.growTime}</p>
              <p className="text-[10px] text-muted-foreground">Grow Time</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Droplets className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-semibold text-foreground">{crop.waterNeed}</p>
              <p className="text-[10px] text-muted-foreground">Water Need</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-semibold text-foreground">{crop.difficulty}</p>
              <p className="text-[10px] text-muted-foreground">Difficulty</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {crop.tags.map((t: string) => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{t}</span>
            ))}
          </div>
        </div>

        {/* How to Plant */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <h2 className="font-semibold text-foreground mb-4">How to Plant {crop.name}</h2>

          {/* Guide rate limit banner */}
          {guideRateLimited && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">AI rate limit reached. Showing standard planting guide.</p>
            </div>
          )}

          <Accordion type="single" collapsible defaultValue="prep">
            <AccordionItem value="prep">
              <AccordionTrigger className="text-sm py-3">🌍 Soil Preparation</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {guideLoading ? "Loading..." : guideError ? "Could not load guide. Please try again." : guideText(guide?.soil_preparation)}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="plant">
              <AccordionTrigger className="text-sm py-3">🌱 Planting Steps</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {guideLoading ? "Loading..." : guideError ? "Could not load guide. Please try again." : guideText(guide?.planting_steps)}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="text-sm py-3">💧 Care & Maintenance</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {guideLoading ? "Loading..." : guideError ? "Could not load guide. Please try again." : guideText(guide?.care_schedule)}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="harvest">
              <AccordionTrigger className="text-sm py-3">🌾 Harvesting</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {guideLoading ? "Loading..." : guideError ? "Could not load guide. Please try again." : guideText(guide?.harvest_signs)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Start Growing button */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Rocket className="h-4 w-4" /> Start Growing {crop.name}
        </button>
      </motion.div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{crop.emoji}</span> Start Growing {crop.name}
            </DialogTitle>
            <DialogDescription>Configure your new crop and add it to your farm.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="bg-muted/50 rounded-xl p-3 text-sm">
              <p><strong>Grow Time:</strong> {crop.growTime}</p>
              <p><strong>Water Need:</strong> {crop.waterNeed}</p>
              <p><strong>Best Season:</strong> {crop.season}</p>
            </div>
            <label className="block text-sm font-medium text-foreground">Select Plot</label>
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.region_name}, Sarawak</option>
              ))}
            </select>
            {startError && <p className="text-xs text-destructive">{startError}</p>}
            <button
              onClick={handleStartGrowing}
              disabled={starting || !selectedFarmId}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {starting ? "Adding..." : "🌱 Add to My Crops"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
