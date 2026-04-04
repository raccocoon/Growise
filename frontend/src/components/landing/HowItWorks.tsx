import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Set Up Your Farm Profile",
    description:
      "Tell us your region, land size, soil type, water source, and farming goals. Takes under 2 minutes to complete.",
  },
  {
    title: "Get AI Crop Recommendations",
    description:
      "Receive personalised crop suggestions ranked by compatibility with your farm's unique conditions.",
  },
  {
    title: "Follow Your 30-Day Calendar",
    description:
      "A day-by-day plan covering planting, watering, spraying, and harvesting — tailored to your crops.",
  },
  {
    title: "Track, Rotate & Watch It Grow",
    description:
      "Monitor progress, plan crop rotations, and watch your farm thrive season after season.",
  },
];

const photos = [
  {
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
    alt: "Misty terraced farm",
    className: "row-span-2 col-span-1 min-h-[200px] sm:min-h-[320px]",
  },
  {
    url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
    alt: "Green tea plantation rows",
    className: "h-[140px] sm:h-[180px]",
  },
  {
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80",
    alt: "Sunset over farm field",
    className: "h-[140px] sm:h-[180px]",
  },
];

export function HowItWorks() {
  const [expandedIndex, setExpandedIndex] = useState(0);

  return (
    <section id="how-it-works" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 md:px-10 lg:px-[60px] py-12 sm:py-16">
        {/* PART 1 — Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 mb-10 lg:mb-[60px]"
        >
          {/* Left */}
          <div className="w-full lg:w-1/2">
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(36px, 6vw, 72px)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-2px",
                color: "#111",
              }}
            >
              Farming Smarter
              <br />
              Starts Here
            </h2>
          </div>

          {/* Right */}
          <div className="w-full lg:w-[45%] lg:pt-4 lg:pl-10">
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "15px",
                color: "#555",
                lineHeight: 1.75,
                fontWeight: 400,
              }}
            >
              No matter the size of your farm or your experience level,
              GrowBuddy is here to help you take the first step toward
              smarter, more efficient, and sustainable farming — with tools
              designed to guide you from day one.
            </p>
          </div>
        </motion.div>

        {/* PART 2 — Bottom 2-Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20"
        >
          {/* LEFT — Photo Mosaic */}
          <div
            className="grid grid-cols-2 gap-3"
            style={{ gridTemplateRows: "auto auto auto" }}
          >
            {photos.map((photo, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-[18px] ${photo.className}`}
              >
                <img
                  src={photo.url}
                  alt={photo.alt}
                  className="w-full h-full object-cover block"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* RIGHT — Step Accordion */}
          <div>
            {steps.map((step, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <div
                  key={i}
                  className="cursor-pointer"
                  style={{
                    borderTop: i === 0 ? "1px solid #E8E8E8" : undefined,
                    borderBottom: "1px solid #E8E8E8",
                    padding: "22px 0",
                  }}
                  onClick={() => setExpandedIndex(i)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "20px",
                          fontWeight: 700,
                          color: "#111",
                          lineHeight: 1.3,
                        }}
                      >
                        {step.title}
                      </h3>
                      <div
                        style={{
                          maxHeight: isExpanded ? "200px" : "0px",
                          opacity: isExpanded ? 1 : 0,
                          overflow: "hidden",
                          transition:
                            "max-height 0.35s ease, opacity 0.3s ease",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "13.5px",
                            color: "#777",
                            lineHeight: 1.65,
                            marginTop: "8px",
                            fontWeight: 400,
                          }}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-[#A8D832]"
                    >
                      {isExpanded ? (
                        <ArrowUpRight
                          className="w-[18px] h-[18px]"
                          style={{ color: "#111", strokeWidth: 2.5 }}
                        />
                      ) : (
                        <ArrowRight
                          className="w-[18px] h-[18px]"
                          style={{ color: "#111", strokeWidth: 2.5 }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
