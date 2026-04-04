import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Lightbulb, CalendarDays, Map, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Recommend", icon: Lightbulb, path: "/recommend" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "Map", icon: Map, path: "/map" },
  { label: "Leafy", icon: Leaf, path: "/leafy" },
];

export function MobileNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex justify-around py-2 px-1">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
