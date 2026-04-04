import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import farmerImg from "@/assets/farmer-2.png";
import { ArrowRight, ArrowLeft } from "lucide-react";

const benefits = [
  {
    tag: "No Guesswork",
    img: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
    title: "AI Picks the Right Crop for You",
    body: "Crops scored and ranked against your exact soil, weather, land size — no farming knowledge needed.",
  },
  {
    tag: "Weather-Aware",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    title: "Farm Around the Weather, Not Against It",
    body: "Live 30-day forecasts power every recommendation — flood risk and best planting windows identified.",
  },
  {
    tag: "Pest Protection",
    img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    title: "Catch Pest Outbreaks Before They Hit",
    body: "Fungal and insect risk scores calculated daily with optimal spray windows and exact timing.",
  },
  {
    tag: "Save Time",
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80",
    title: "One Calendar Replaces All Your Guesswork",
    body: "Planting, watering, spraying, harvesting — all planned day by day in one 30-day calendar.",
  },
  {
    tag: "Built for Sarawak",
    img: farmerImg,
    title: "Made for Peat Soil & Tropical Rainfall",
    body: "Calibrated for Sarawak's 9 districts, rainforest climate and the crops that actually thrive here.",
  },
  {
    tag: "Long-Term Growth",
    img: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80",
    title: "Rotate Crops. Restore Soil. Repeat.",
    body: "After every harvest, GrowBuddy recommends what to plant next to keep soil healthy season after season.",
  },
];

export function BenefitsSection() {
  const [current, setCurrent] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [cardWidth, setCardWidth] = useState(420);
  const gap = 24;

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
      if (w < 480) setCardWidth(w - 80);
      else if (w < 768) setCardWidth(280);
      else if (w < 1024) setCardWidth(340);
      else setCardWidth(420);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const goTo = useCallback(
    (i: number) => setCurrent(Math.max(0, Math.min(i, benefits.length - 1))),
    []
  );

  const centerOffset = containerWidth / 2 - cardWidth / 2;
  const trackOffset = centerOffset - current * (cardWidth + gap);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const isTablet = typeof window !== "undefined" && window.innerWidth < 768;

  const getCardStyle = (i: number): React.CSSProperties => {
    const isActive = i === current;
    if (isMobile) {
      return {
        transform: "scale(1)",
        opacity: isActive ? 1 : 0.4,
        zIndex: isActive ? 10 : 1,
        boxShadow: isActive ? "0 24px 60px rgba(0,0,0,0.18)" : "none",
      };
    }
    if (isActive) {
      return {
        transform: `scale(${isTablet ? 1.05 : 1.08}) translateY(-12px)`,
        opacity: 1,
        zIndex: 10,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      };
    }
    return {
      transform: `scale(${isTablet ? 0.85 : 0.88})`,
      opacity: 0.55,
      zIndex: 1,
      boxShadow: "none",
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 60) {
      goTo(diff > 0 ? current + 1 : current - 1);
      setIsDragging(false);
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (Math.abs(diff) > 60) {
      goTo(diff > 0 ? current + 1 : current - 1);
      setIsDragging(false);
    }
  };

  return (
    <section
      id="benefits"
      className="bg-white px-4 sm:px-8 md:px-10 lg:px-[60px] py-12 sm:py-16 md:py-20"
      style={{ fontFamily: "'DM Sans', sans-serif", position: "relative", zIndex: 1, overflow: "hidden" }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-10 md:mb-14 gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-[58%]"
          >
            <h2 className="text-[clamp(32px,5vw,62px)] font-extrabold leading-[1.08] tracking-[-1.5px] text-foreground m-0">
              {"Farm with Smarter,"}
              <br />
              <span className="inline-flex items-center gap-3">
                <span>{"Simpler"}</span>
                <span className="inline-block bg-[#A8D832] text-foreground rounded-full px-4 sm:px-6 py-1 font-extrabold leading-[1.3]">
                  Solutions
                </span>
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full md:w-[36%] pt-0 md:pt-2 min-w-0"
          >
            <p className="text-[15px] text-muted-foreground leading-[1.75] mb-6">
              GrowBuddy brings you powerful, easy-to-use tools that help farmers monitor, manage, and grow better crops — with AI-powered insights built specifically for Sarawak's unique climate and soil.
            </p>
            <div className="flex gap-3 items-center">
              <button className="bg-[#A8D832] text-foreground rounded-full px-5 sm:px-6 py-3 text-sm font-semibold border-none cursor-pointer inline-flex items-center gap-2">
                Explore All Benefits
              </button>
              <span className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground text-lg cursor-pointer flex-shrink-0">
                →
              </span>
            </div>
          </motion.div>
        </div>

        {/* CAROUSEL */}
        <div className="relative">
          {/* Left Arrow — hidden on small screens, visible on lg+ */}
          <button
            onClick={() => goTo(current - 1)}
            aria-label="Previous"
            className="hidden lg:flex hover:bg-muted absolute -left-14 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-border bg-card text-foreground items-center justify-center transition-all z-20 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Carousel Track */}
          <div
            ref={containerRef}
            className="relative w-full overflow-x-hidden overflow-y-visible py-10 pb-6"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            <div
              className="flex items-center"
              style={{
                gap,
                transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "transform",
                cursor: isDragging ? "grabbing" : "grab",
                transform: `translateX(${trackOffset}px)`,
              }}
            >
              {benefits.map((card, i) => {
                const isActive = i === current;
                return (
                  <div
                    key={card.tag}
                    onClick={() => { if (i !== current) goTo(i); }}
                    style={{
                      position: "relative",
                      borderRadius: 24,
                      overflow: "visible",
                      flexShrink: 0,
                      width: cardWidth,
                      height: isMobile ? 280 : isTablet ? 320 : 360,
                      transition: "transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease",
                      cursor: isActive ? "default" : "pointer",
                      ...getCardStyle(i),
                    }}
                  >
                    <div className="absolute inset-0 rounded-3xl overflow-hidden">
                      <img
                        src={card.img}
                        alt={card.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/70" />
                      <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7 z-[2] text-white">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold leading-[1.25] mb-1 sm:mb-2">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-[13px] font-normal text-white/75 leading-[1.6] max-w-[300px] m-0">
                          {card.body}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
                      <span className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs sm:text-[13px] font-semibold text-foreground whitespace-nowrap">
                        {card.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Arrow — hidden on small screens, visible on lg+ */}
          <button
            onClick={() => goTo(current + 1)}
            aria-label="Next"
            className="hidden lg:flex hover:bg-[#A8D832] hover:text-foreground absolute -right-14 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#1A3C2A] text-white border-none items-center justify-center transition-all z-20 cursor-pointer"
          >
            <ArrowRight size={18} />
          </button>

          {/* Mobile arrows below carousel */}
          <div className="flex lg:hidden justify-center gap-4 mt-2">
            <button
              onClick={() => goTo(current - 1)}
              aria-label="Previous"
              className="w-11 h-11 rounded-full border border-border bg-card text-foreground flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => goTo(current + 1)}
              aria-label="Next"
              className="w-11 h-11 rounded-full bg-[#1A3C2A] text-white border-none flex items-center justify-center cursor-pointer"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
