import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Mail, MapPin, Calendar, Edit2, Trash2, Plus, X, User, Phone, Droplets, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, FarmProfile, Region } from "@/contexts/ProfileContext";
import { supabase } from "@/lib/supabase";

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const SIZE_UNITS = ["Hectares", "Acres", "Square Feet", "Square Meters"];
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Expert"];
const WATER_SOURCES = ["Rain-Fed", "Irrigation", "Both", "None"];

interface DisplayFarm {
  id: string;
  name: string;
  location: string;
  size: string;
  soilType: string;
  plots: number;
  waterSource: string;
  region_id: string;
}

function toDisplay(f: FarmProfile): DisplayFarm {
  return {
    id: f.id,
    name: f.region_name,
    location: `${f.region_name}, Sarawak`,
    size: `${f.land_size} ${f.land_size_unit}`,
    soilType: f.soil_type || "Mixed",
    plots: 1,
    waterSource: f.water_source,
    region_id: f.region_id,
  };
}

export default function ProfilePage() {
  const { user, activeProfile } = useAuth();
  const { farms, regions, refreshFarms } = useProfile();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showEditFarm, setShowEditFarm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<DisplayFarm | null>(null);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);

  const [profileForm, setProfileForm] = useState({
    name: user?.user_metadata?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    location: activeProfile?.region_name ?? "",
    experienceLevel: user?.user_metadata?.experience_level ?? "Intermediate",
  });

  const [farmForm, setFarmForm] = useState({ name: "", district: "", size: "", sizeUnit: "", waterSource: "" });
  const [editFarmForm, setEditFarmForm] = useState({ name: "", district: "", size: "", sizeUnit: "", waterSource: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/planting-logs/active").then((res) => setActiveLogs(res.data || [])).catch(() => setActiveLogs([]));
  }, []);

  useEffect(() => {
    setProfileForm({
      name: user?.user_metadata?.name ?? "",
      email: user?.email ?? "",
      phone: "",
      location: activeProfile?.region_name ?? "",
      experienceLevel: user?.user_metadata?.experience_level ?? "Intermediate",
    });
  }, [user, activeProfile]);

  const displayFarms = farms.map(toDisplay);

  const displayUser = {
    avatar: (user?.user_metadata?.name ?? user?.email ?? "U").charAt(0).toUpperCase(),
    name: user?.user_metadata?.name ?? user?.email ?? "Farmer",
    email: user?.email ?? "",
    location: activeProfile ? `${activeProfile.region_name}, Sarawak` : "—",
    joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
    farmCount: farms.length,
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { name: profileForm.name, experience_level: profileForm.experienceLevel },
      });
    } catch { /* silent */ } finally {
      setSaving(false);
      setShowEditProfile(false);
    }
  };

  const handleAddFarm = async () => {
    if (!farmForm.district || !farmForm.size) return;
    setSaving(true);
    try {
      await api.post("/api/profile/farms", {
        region_id: farmForm.district,
        land_size: parseFloat(farmForm.size),
        land_size_unit: farmForm.sizeUnit || "Hectares",
        water_source: farmForm.waterSource || "Rain-Fed",
        experience_level: user?.user_metadata?.experience_level ?? "Beginner",
      });
      await refreshFarms();
      setShowAddFarm(false);
      setFarmForm({ name: "", district: "", size: "", sizeUnit: "", waterSource: "" });
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleEditFarm = (farm: DisplayFarm) => {
    setEditingFarm(farm);
    const sizeParts = farm.size.split(" ");
    setEditFarmForm({
      name: farm.name,
      district: farm.region_id,
      size: sizeParts[0] || "",
      sizeUnit: sizeParts[1] || "Hectares",
      waterSource: farm.waterSource || "",
    });
    setShowEditFarm(true);
  };

  const handleSaveEditFarm = async () => {
    if (!editingFarm) return;
    setSaving(true);
    try {
      await api.put(`/api/profile/farms/${editingFarm.id}`, {
        region_id: editFarmForm.district,
        land_size: parseFloat(editFarmForm.size),
        land_size_unit: editFarmForm.sizeUnit,
        water_source: editFarmForm.waterSource,
      });
      await refreshFarms();
      setShowEditFarm(false);
      setEditingFarm(null);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleDeleteFarm = async (farmId: string) => {
    try {
      await api.delete(`/api/profile/farms/${farmId}`);
      await refreshFarms();
    } catch { /* silent */ }
  };

  return (
    <DashboardLayout>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-4">
        <motion.div variants={anim}>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* User card */}
          <motion.div variants={anim} className="lg:col-span-4 bg-card rounded-2xl p-6 card-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mb-4">
                {displayUser.avatar}
              </div>
              <h2 className="font-bold text-lg text-foreground">{displayUser.name}</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Mail className="h-3 w-3" /> {displayUser.email}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" /> {displayUser.location}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" /> Member since {displayUser.joinDate}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Award className="h-3 w-3" /> {profileForm.experienceLevel}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-5">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{displayUser.farmCount}</p>
                  <p className="text-[10px] text-muted-foreground">Farms</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{activeLogs.length}</p>
                  <p className="text-[10px] text-muted-foreground">Crops</p>
                </div>
              </div>

              <button
                onClick={() => setShowEditProfile(true)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit Profile
              </button>
            </div>
          </motion.div>

          {/* Farm profiles */}
          <div className="lg:col-span-8 space-y-4">
            <motion.div variants={anim} className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Farm Profiles</h2>
              <button
                onClick={() => setShowAddFarm(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3 w-3" /> Add Farm
              </button>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {displayFarms.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 py-4">No farm profiles yet.</p>
              )}
              {displayFarms.map((farm) => (
                <motion.div key={farm.id} variants={anim} className="bg-card rounded-2xl p-5 card-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{farm.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{farm.location}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditFarm(farm)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDeleteFarm(farm.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-foreground">{farm.size}</p>
                      <p className="text-[10px] text-muted-foreground">Size</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-foreground">{farm.soilType}</p>
                      <p className="text-[10px] text-muted-foreground">Soil</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-foreground">{farm.plots}</p>
                      <p className="text-[10px] text-muted-foreground">Plots</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowEditProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-md card-shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
                <button onClick={() => setShowEditProfile(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Experience Level</Label>
                  <Select value={profileForm.experienceLevel} onValueChange={(v) => setProfileForm({ ...profileForm, experienceLevel: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select experience level" /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowEditProfile(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Farm Modal */}
      <AnimatePresence>
        {showAddFarm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowAddFarm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-md card-shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">Add New Farm</h2>
                <button onClick={() => setShowAddFarm(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sarawak District</Label>
                  <Select value={farmForm.district} onValueChange={(v) => setFarmForm({ ...farmForm, district: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose district" /></SelectTrigger>
                    <SelectContent>
                      {regions.map((r: Region) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Farm Size</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="e.g. 5" value={farmForm.size} onChange={(e) => setFarmForm({ ...farmForm, size: e.target.value })} className="rounded-xl flex-1" />
                    <Select value={farmForm.sizeUnit} onValueChange={(v) => setFarmForm({ ...farmForm, sizeUnit: v })}>
                      <SelectTrigger className="rounded-xl w-[140px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        {SIZE_UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Water Source</Label>
                  <Select value={farmForm.waterSource} onValueChange={(v) => setFarmForm({ ...farmForm, waterSource: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select water source" /></SelectTrigger>
                    <SelectContent>
                      {WATER_SOURCES.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddFarm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleAddFarm} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
                    {saving ? "Adding..." : "Add Farm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Farm Modal */}
      <AnimatePresence>
        {showEditFarm && editingFarm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowEditFarm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-md card-shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">Edit Farm</h2>
                <button onClick={() => setShowEditFarm(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sarawak District</Label>
                  <Select value={editFarmForm.district} onValueChange={(v) => setEditFarmForm({ ...editFarmForm, district: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose district" /></SelectTrigger>
                    <SelectContent>
                      {regions.map((r: Region) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Farm Size</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="e.g. 5" value={editFarmForm.size} onChange={(e) => setEditFarmForm({ ...editFarmForm, size: e.target.value })} className="rounded-xl flex-1" />
                    <Select value={editFarmForm.sizeUnit} onValueChange={(v) => setEditFarmForm({ ...editFarmForm, sizeUnit: v })}>
                      <SelectTrigger className="rounded-xl w-[140px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        {SIZE_UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Water Source</Label>
                  <Select value={editFarmForm.waterSource} onValueChange={(v) => setEditFarmForm({ ...editFarmForm, waterSource: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select water source" /></SelectTrigger>
                    <SelectContent>
                      {WATER_SOURCES.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowEditFarm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleSaveEditFarm} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
