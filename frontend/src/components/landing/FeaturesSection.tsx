import { motion } from "framer-motion";
import { Sprout, Bug, CalendarDays, CloudSun } from "lucide-react";

const featureCards = [
  {
    icon: Sprout,
    title: "AI Crop Recommendations",
    body: "Top 3 crops matched to your soil, weather, land size, water source, and experience level.",
    variant: "lime" as const,
  },
  {
    icon: Bug,
    title: "Pest & Disease Alerts",
    body: "Get early fungal and insect risk warnings with the optimal spray window — before it's too late.",
    variant: "dark" as const,
  },
  {
    icon: CalendarDays,
    title: "30-Day Farm Calendar",
    body: "A full day-by-day plan: planting windows, watering schedule, spray timing, and harvest alerts.",
    variant: "dark" as const,
  },
  {
    icon: CloudSun,
    title: "Weather Risk Intelligence",
    body: "Live 30-day forecasts transformed into flood, drought, and farming day scores for your exact location.",
    variant: "lime" as const,
  },
];

function FeatureCard({ icon: Icon, title, body, variant }: (typeof featureCards)[number]) {
  const isLime = variant === "lime";
  return (
    <div
      className="rounded-[20px] p-5 sm:p-7 flex flex-col"
      style={{ background: isLime ? "#A8D832" : "#243D2E" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={
          isLime
            ? { background: "#1B1B1B" }
            : { border: "1.5px solid rgba(255,255,255,0.3)" }
        }
      >
        <Icon className="w-4 h-4" style={{ color: isLime ? "#A8D832" : "white" }} />
      </div>
      <h3
        className="font-bold mt-4 sm:mt-5 text-base sm:text-lg"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: isLime ? "#111" : "white",
        }}
      >
        {title}
      </h3>
      <p
        className="mt-2 text-[13px] sm:text-[13.5px]"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.6,
          color: isLime ? "#333" : "rgba(255,255,255,0.6)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden mx-3 sm:mx-4"
      style={{
        background: "#1B3A2D",
        borderRadius: "28px",
      }}
    >
      <div className="p-6 sm:p-8 md:p-12">
        {/* Decorative diamond on left edge */}
        <div
          className="absolute hidden md:block"
          style={{
            left: "-10px",
            top: "50%",
            width: "40px",
            height: "40px",
            background: "#152E20",
            transform: "rotate(45deg)",
            borderRadius: "4px",
          }}
        />

        {/* PART 1 — Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8 mb-8 md:mb-10"
        >
          {/* Left */}
          <div className="w-full md:w-[55%]">
            <h2
              className="font-extrabold text-white"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(32px, 5vw, 64px)",
                lineHeight: 1.08,
                letterSpacing: "-1px",
              }}
            >
              Making Farming
              <br />
              Easier and Better
            </h2>
          </div>

          {/* Right */}
          <div className="w-full md:w-[40%] md:self-center">
            <p
              className="text-sm sm:text-[15px]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              GrowBuddy provides practical, localized tools that simplify every stage of the farming cycle — from knowing what to plant, to when to spray, water, and harvest — all powered by real-time Sarawak weather data and AI.
            </p>
          </div>
        </motion.div>

        {/* PART 2 — Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            <FeatureCard {...featureCards[0]} />
            <FeatureCard {...featureCards[1]} />
          </div>
          <div className="flex flex-col gap-3 sm:gap-4">
            <FeatureCard {...featureCards[2]} />
            <FeatureCard {...featureCards[3]} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
