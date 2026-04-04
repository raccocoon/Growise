import { ReactNode, useState, useRef, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Bell, User, Sprout, Leaf, ChevronDown, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName: string =
    user?.user_metadata?.name || user?.email || "User";
  const avatarInitial: string = displayName.charAt(0).toUpperCase();

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="md:hidden flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>GrowBuddy</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-warning rounded-full" />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:bg-muted rounded-xl px-2 py-1 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {avatarInitial}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl border border-border shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <User className="h-4 w-4 text-muted-foreground" /> Profile
                  </Link>
                  <Link to="/my-crops" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Sprout className="h-4 w-4 text-muted-foreground" /> My Crops
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full text-left">
                    <LogOut className="h-4 w-4 text-muted-foreground" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
