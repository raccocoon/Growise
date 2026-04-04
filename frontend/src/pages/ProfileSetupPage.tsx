import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sprout, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SARAWAK_DISTRICTS = ["Kuching", "Miri", "Sibu", "Bintulu", "Mukah"];
const SIZE_UNITS = ["Hectares", "Acres", "Square Feet", "Square Meters"];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    farmName: "",
    district: "",
    size: "",
    sizeUnit: "",
  });

  const canSubmit = form.farmName && form.district && form.size && form.sizeUnit;

  const handleSubmit = () => {
    navigate("/profile");
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto py-6">
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Sprout className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Setup Farm</h2>
              <p className="text-xs text-muted-foreground">Add your farm details to get started.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Farm Name</Label>
              <Input
                placeholder="e.g. Kampung Hilir Farm"
                value={form.farmName}
                onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sarawak District</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose district" />
                </SelectTrigger>
                <SelectContent>
                  {SARAWAK_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Farm Size</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="rounded-xl flex-1"
                />
                <Select value={form.sizeUnit} onValueChange={(v) => setForm({ ...form, sizeUnit: v })}>
                  <SelectTrigger className="rounded-xl w-[140px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Check className="h-4 w-4" /> Save Farm
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
