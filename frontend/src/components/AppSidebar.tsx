import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Lightbulb, CalendarDays, Map, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useCrisis } from "@/contexts/CrisisContext";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Recommendations", icon: Lightbulb, path: "/recommend" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "Map", icon: Map, path: "/map" },
  { label: "Leafy", icon: Leaf, path: "/leafy" },
];

export function AppSidebar() {
  const location = useLocation();
  const { isCrisis, toggleCrisis } = useCrisis();
  const { activeProfile } = useAuth();

  function handleToggle(enable: boolean) {
    toggleCrisis(enable, activeProfile?.id ?? "");
  }

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-sidebar text-sidebar-foreground fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <Leaf className="w-5 h-5 text-primary" />
        <span className="text-lg font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>GrowBuddy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Status card */}
      <div className="mx-3 mb-4 p-3 rounded-xl bg-sidebar-hover/60 border border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <Leaf className="h-3 w-3" /> Current Status
          </div>
          <Switch checked={isCrisis} onCheckedChange={handleToggle} />
        </div>
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          isCrisis ? "bg-destructive/20 text-red-400" : "bg-primary/20 text-green-400"
        )}>
          ● {isCrisis ? "Crisis" : "Normal"}
        </span>
      </div>
    </aside>
  );
}
