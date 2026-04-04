import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "#home", sectionId: "home" },
  { label: "About Us", href: "#about", sectionId: "about" },
  { label: "Features", href: "#features", sectionId: "features" },
  { label: "Benefits", href: "#benefits", sectionId: "benefits" },
  { label: "How To", href: "#how-it-works", sectionId: "how-it-works" },
];

export function LandingNavbar() {
  const [activeSection, setActiveSection] = useState("home");
  const [show, setShow] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroCard = document.getElementById("hero-card");
      if (heroCard) {
        const heroBottom = heroCard.offsetTop + heroCard.offsetHeight;
        setShow(window.scrollY > heroBottom - 80);
      }
      const scrollY = window.scrollY + 120;
      let current = "home";
      for (const link of navLinks) {
        const el = document.getElementById(link.sectionId);
        if (el && el.offsetTop <= scrollY) {
          current = link.sectionId;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on scroll hide
  useEffect(() => {
    if (!show) setMobileOpen(false);
  }, [show]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md z-50 shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="#home" onClick={(e) => handleClick(e, "#home")} className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-[#7BC618]" />
              <span className="text-lg font-bold text-[#0d2010] tracking-tight">GrowBuddy</span>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => handleClick(e, l.href)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeSection === l.sectionId
                      ? "bg-[#0d2010] text-white"
                      : "text-[#1a1a1a] hover:text-[#0d2010]"
                  }`}
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="hidden md:inline-block px-5 py-2 bg-[#7BC618] text-white font-semibold text-sm rounded-full hover:bg-[#6ab015] transition-colors"
              >
                Get Started
              </Link>
              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden bg-white/95 border-t border-gray-100"
              >
                <div className="flex flex-col px-4 py-3 gap-1">
                  {navLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={(e) => handleClick(e, l.href)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === l.sectionId
                          ? "bg-[#0d2010] text-white"
                          : "text-[#1a1a1a] hover:bg-gray-100"
                      }`}
                    >
                      {l.label}
                    </a>
                  ))}
                  <Link
                    to="/auth"
                    className="mt-2 px-5 py-2.5 bg-[#7BC618] text-white font-semibold text-sm rounded-lg text-center hover:bg-[#6ab015] transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
