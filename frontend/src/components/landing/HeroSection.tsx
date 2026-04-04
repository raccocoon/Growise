import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "HOME", href: "#home", sectionId: "home" },
  { label: "ABOUT US", href: "#about", sectionId: "about" },
  { label: "FEATURES", href: "#features", sectionId: "features" },
  { label: "BENEFITS", href: "#benefits", sectionId: "benefits" },
  { label: "HOW TO", href: "#how-it-works", sectionId: "how-it-works" },
];

type Phase = "fullscreen" | "shrinking" | "settled";

export function HeroSection() {
  const [phase, setPhase] = useState<Phase>("fullscreen");
  const [contentVisible, setContentVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shrinkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
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

  // Lock scroll during intro
  useEffect(() => {
    if (phase === "fullscreen" || phase === "shrinking") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  const shrinkVideo = useCallback(() => {
    if (phase !== "fullscreen") return;

    const imageArea = heroCardRef.current?.querySelector('.hero-image-area') as HTMLElement;
    const el = imageArea || heroCardRef.current;
    if (!el || !wrapperRef.current) return;

    const rect = el.getBoundingClientRect();
    const w = wrapperRef.current;

    w.style.setProperty('--hero-top', `${rect.top}px`);
    w.style.setProperty('--hero-left', `${rect.left}px`);
    w.style.setProperty('--hero-width', `${rect.width}px`);
    w.style.setProperty('--hero-height', `${rect.height}px`);

    requestAnimationFrame(() => {
      setPhase("shrinking");
    });

    const transitionMs = isMobile ? 900 : 1200;
    setTimeout(() => {
      setPhase("settled");
      if (wrapperRef.current) {
        wrapperRef.current.style.removeProperty('--hero-top');
        wrapperRef.current.style.removeProperty('--hero-left');
        wrapperRef.current.style.removeProperty('--hero-width');
        wrapperRef.current.style.removeProperty('--hero-height');
      }
      setTimeout(() => setContentVisible(true), 100);
    }, transitionMs + 50);
  }, [phase, isMobile]);

  // Auto-shrink after delay
  useEffect(() => {
    const delay = isMobile ? 1800 : 2500;
    shrinkTimerRef.current = setTimeout(shrinkVideo, delay);
    return () => {
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
    };
  }, [shrinkVideo, isMobile]);

  // Handle video error — skip intro
  const handleVideoError = () => {
    if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
    setPhase("settled");
    setContentVisible(true);
  };

  // Compute wrapper className based on phase
  const transitionDuration = isMobile ? "0.9s" : "1.2s";
  const transitionTiming = "cubic-bezier(0.7, 0, 0.2, 1)";

  const getWrapperStyle = (): React.CSSProperties => {
    if (phase === "fullscreen") {
      return {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        borderRadius: 0,
        zIndex: 9000,
        overflow: "hidden",
        background: "#000",
        transition: [
          `top ${transitionDuration} ${transitionTiming}`,
          `left ${transitionDuration} ${transitionTiming}`,
          `width ${transitionDuration} ${transitionTiming}`,
          `height ${transitionDuration} ${transitionTiming}`,
          `border-radius ${transitionDuration} ${transitionTiming}`,
        ].join(", "),
        willChange: "top, left, width, height, border-radius",
      };
    }
    if (phase === "shrinking") {
      return {
        position: "fixed",
        top: "var(--hero-top)",
        left: "var(--hero-left)",
        width: "var(--hero-width)",
        height: "var(--hero-height)",
        borderRadius: 24,
        zIndex: 9000,
        overflow: "hidden",
        background: "#000",
        transition: [
          `top ${transitionDuration} ${transitionTiming}`,
          `left ${transitionDuration} ${transitionTiming}`,
          `width ${transitionDuration} ${transitionTiming}`,
          `height ${transitionDuration} ${transitionTiming}`,
          `border-radius ${transitionDuration} ${transitionTiming}`,
        ].join(", "),
        willChange: "top, left, width, height, border-radius",
      };
    }
    // settled
    return {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: 24,
      zIndex: 1,
      overflow: "hidden",
      transition: "none",
    };
  };

  return (
    <>
      <section
        id="home"
        className="w-full bg-white"
        style={{
          paddingTop: 12,
          pointerEvents: phase === "settled" ? "all" : "none",
        }}
      >
        {/* Hero card container */}
        <div
          id="hero-card"
          ref={heroCardRef}
          style={{
            overflow: "hidden",
            position: "relative",
            width: "100%",
            height: "auto",
            borderRadius: 24,
            zIndex: 1,
            margin: "0 12px",
            marginRight: 12,
            maxWidth: "calc(100% - 24px)",
          }}
        >
          {/* IMAGE AREA */}
          <div
            className="hero-image-area"
            style={{
              position: "relative",
              marginTop: -40,
              overflow: "hidden",
              borderRadius: 24,
            }}
          >
            {/* ===== SINGLE VIDEO WRAPPER — never moved in DOM ===== */}
            <div ref={wrapperRef} style={getWrapperStyle()}>
              <video
                src="/intro-video.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onPlaying={() => setVideoLoaded(true)}
                onError={handleVideoError}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
              {/* Dark overlay on video */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: phase === "fullscreen"
                    ? "rgba(0,0,0,0.3)"
                    : "linear-gradient(to bottom, rgba(10,30,18,0.65) 0%, rgba(10,30,18,0.35) 40%, rgba(10,30,18,0.60) 100%)",
                  pointerEvents: "none",
                  transition: "background 0.8s ease",
                }}
              />
            </div>

            {/* Loader during fullscreen */}
            <AnimatePresence>
              {phase === "fullscreen" && !videoLoaded && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9001,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: "3px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#A8D832",
                      borderRadius: "50%",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Concave notch SVG — slides down from above */}
            <motion.div
              initial={{ opacity: 0, y: -60 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -60 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden md:block"
              style={{
                position: "absolute",
                top: 16,
                left: 0,
                width: "100%",
                zIndex: 5,
                lineHeight: 0,
              }}
            >
              <svg
                viewBox="0 0 1440 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "100%", height: 80, display: "block" }}
                preserveAspectRatio="none"
              >
                <path
                  d="M320,0 Q360,0 380,40 Q400,80 440,80 L1000,80 Q1040,80 1060,40 Q1080,0 1120,0 L320,0 Z"
                  fill="#ffffff"
                />
              </svg>
            </motion.div>

            {/* Navbar inside the notch — slides down from above */}
            <motion.div
              initial={{ opacity: 0, y: -60 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -60 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden md:flex"
              style={{
                position: "absolute",
                top: 22,
                left: 0,
                right: 0,
                zIndex: 6,
                alignItems: "center",
                justifyContent: "center",
                height: 80,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(l.sectionId)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: activeSection === l.sectionId ? 600 : 500,
                      fontSize: 13,
                      color: activeSection === l.sectionId ? "#fff" : "#1a1a1a",
                      background: activeSection === l.sectionId ? "#1a2e1a" : "none",
                      padding: activeSection === l.sectionId ? "5px 16px" : "5px 0",
                      borderRadius: activeSection === l.sectionId ? 9999 : 0,
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Logo — slides down from above */}
            <motion.a
              href="#home"
              initial={{ opacity: 0, y: -40 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute z-10 flex items-center gap-2 no-underline top-[22px] left-4 md:top-[50px] md:left-5"
            >
              <Leaf className="w-5 h-5" style={{ color: "#7BC618" }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>
                GrowBuddy
              </span>
            </motion.a>

            {/* Mobile hamburger — slides down */}
            <motion.button
              initial={{ opacity: 0, y: -40 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute top-[22px] right-[120px] z-10 md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>

            {/* CTA — slides down from above */}
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute z-10 top-[18px] right-4 md:top-[50px] md:right-5"
            >
              <Link
                to="/auth"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  background: "#7BC618",
                  color: "#fff",
                  borderRadius: 9999,
                  padding: "9px 20px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Get Started
              </Link>
            </motion.div>

            {/* Hero text — appears after video settles */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute top-0 left-0 w-full h-full z-[2] flex flex-col items-center justify-center text-center pb-10 md:pb-[60px] px-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.7, delay: 1.0, ease: "easeOut" }}
              >
                <span className="text-2xl sm:text-3xl md:text-[40px]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400, color: "#fff", marginRight: 10 }}>Growing</span>
                <span className="text-2xl sm:text-3xl md:text-[40px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#fff" }}>a Smarter Future</span>
              </motion.div>
              <motion.div
                className="mt-1 md:mt-1.5"
                initial={{ opacity: 0, y: 20 }}
                animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.7, delay: 1.2, ease: "easeOut" }}
              >
                <span className="text-2xl sm:text-3xl md:text-[40px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#fff" }}>Through Intelligent </span>
                <span className="text-2xl sm:text-3xl md:text-[40px]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400, color: "#fff" }}>Farming</span>
              </motion.div>
            </motion.div>

            {/* Mobile menu dropdown */}
            {mobileMenuOpen && contentVisible && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-[54px] left-0 w-full z-20 bg-[#0a1f0a]/95 backdrop-blur-sm md:hidden"
              >
                <div className="flex flex-col items-center py-4 gap-2">
                  {navLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium py-2 px-4"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: activeSection === l.sectionId ? "#7BC618" : "#fff",
                        textDecoration: "none",
                      }}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Bottom-left concave cutout */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden md:block"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "calc(100% / 2.95)",
                height: 50,
                background: "#ffffff",
                borderRadius: "0 16px 0 24px",
                zIndex: 3,
              }}
            />

            {/* Bottom-right concave cutout */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden md:block"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "calc(100% / 2.95)",
                height: 50,
                background: "#ffffff",
                borderRadius: "16px 0 24px 0",
                zIndex: 3,
              }}
            />
          </div>
        </div>

        {/* 3-column row below hero */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr_1fr] gap-4 md:gap-0 px-3 w-full relative z-[4] md:-mt-[30px] mt-4"
        >
          {/* Left feature card */}
          <div
            className="flex flex-col justify-between h-auto md:h-[130px]"
            style={{
              background: "#f0f0e6",
              borderRadius: "16px",
              padding: 16,
            }}
          >
            <div className="flex justify-between items-start">
              <div className="w-[65%]">
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 4 }}>
                  AI Crop Recommendations
                </h3>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 11, color: "#777", lineHeight: 1.4 }}>
                  GrowBuddy analyses your soil, weather and location to recommend the best crops to plant right now.
                </p>
              </div>
              <img
                src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200"
                alt="Soil health"
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0"
              />
            </div>
            <a href="#features" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, color: "#5aaa1a", textTransform: "uppercase", letterSpacing: 0.6, textDecoration: "none" }}>
              LEARN MORE ↗
            </a>
          </div>

          {/* Center text */}
          <div className="py-8 md:py-10 px-4 md:px-6 flex flex-col justify-center items-center text-center">
            <div style={{ lineHeight: 1.2 }}>
              <span className="text-xl md:text-[28px] font-bold text-[#1a1a1a] block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Transforming{" "}
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
                  Agriculture
                </span>
              </span>
              <span className="text-xl md:text-[28px] font-bold text-[#1a1a1a] block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                with AI Intelligence For
              </span>
              <span className="text-xl md:text-[28px] text-[#1a1a1a] block" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
                Sarawak's Future
              </span>
            </div>
          </div>

          {/* Right feature card */}
          <div
            className="flex flex-col justify-between h-auto md:h-[130px]"
            style={{
              background: "#f0f0e6",
              borderRadius: "16px",
              padding: 16,
            }}
          >
            <div className="flex justify-between items-start">
              <div className="w-[65%]">
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 4 }}>
                  Pest & Flood Alerts
                </h3>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 11, color: "#777", lineHeight: 1.4 }}>
                  Real-time weather analysis detects pest outbreak and flood risk windows before they damage your crops.
                </p>
              </div>
              <img
                src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200"
                alt="Crop monitoring"
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0"
              />
            </div>
            <a href="#features" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, color: "#5aaa1a", textTransform: "uppercase", letterSpacing: 0.6, textDecoration: "none" }}>
              LEARN MORE ↗
            </a>
          </div>
        </motion.div>

        {/* Responsive hero image height */}
        <style>{`
          .hero-image-area {
            height: 400px;
          }
          @media (min-width: 640px) {
            .hero-image-area {
              height: 500px;
            }
          }
          @media (min-width: 768px) {
            .hero-image-area {
              height: 620px;
            }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </section>

      {/* Skip button during fullscreen */}
      <AnimatePresence>
        {phase === "fullscreen" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => {
              if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
              shrinkVideo();
            }}
            className="fixed z-[10000] cursor-pointer"
            style={{
              bottom: isMobile ? 20 : 36,
              right: isMobile ? 20 : 36,
              background: "rgba(255,255,255,0.15)",
              color: "white",
              border: "1.5px solid rgba(255,255,255,0.4)",
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 13,
              fontWeight: 500,
              backdropFilter: "blur(8px)",
              fontFamily: "'DM Sans', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            Skip Intro ↓
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
