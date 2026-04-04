import { Leaf } from "lucide-react";

const links = [
  { label: "Home", href: "#hero" },
  { label: "About Us", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Benefits", href: "#benefits" },
  { label: "How To", href: "#how-it-works" },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#0d2010] py-14 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-[#7BC618]" />
            <span className="text-lg font-bold text-white">GrowBuddy</span>
          </div>
          <p className="text-sm text-white/40">Smart farming for Sarawak, powered by AI.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-white/50 hover:text-[#7BC618] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <p className="text-xs text-white/30">© 2026 GrowBuddy. All rights reserved.</p>
      </div>
    </footer>
  );
}
