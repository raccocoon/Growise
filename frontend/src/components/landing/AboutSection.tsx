import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[60px] pt-8 md:pt-[40px] pb-10 md:pb-[50px]">

        {/* PART 1 — Two-column text block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-start gap-8 md:gap-[24px]"
        >
          {/* Left column */}
          <div className="w-full md:w-[40%]">
            <h2
              className="font-extrabold text-black leading-[1.05]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(48px, 6vw, 80px)",
              }}
            >
              Bringing
              <br />
              AI To
              <br />
              Sarawak's
              <br />
              Farms
            </h2>
          </div>

          {/* Right column */}
          <div className="w-full md:w-[55%] md:self-center md:ml-12">
            <p
              className="text-[#222] text-lg md:text-[20px] leading-[1.6] mb-8"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              GrowBuddy is built for Sarawak's unique tropical conditions —
              peat soil, heavy rainfall, and rainforest microclimate. Whether
              you're planting your first kangkung or managing a commercial
              pepper farm, GrowBuddy gives you personalized, data-driven
              guidance every step of the way.
            </p>
            <a
              href="#features"
              className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-black font-semibold text-[15px] no-underline"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: "#A8D832",
              }}
            >
              Learn More
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-black">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </span>
            </a>
          </div>
        </motion.div>

        {/* PART 2 — 4-Column Bento Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-[60px]"
        >
          {/* Column 1 — Photo */}
          <div className="rounded-[20px] overflow-hidden aspect-square md:aspect-auto md:h-[220px]">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&q=80"
              alt="Farmer harvesting crops"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Column 2 — Stat card */}
          <div
            className="rounded-[20px] border border-[#E8E8E8] bg-white p-6 md:p-7 flex flex-col justify-end aspect-square md:aspect-auto md:h-[220px]"
          >
            <span
              className="text-[56px] md:text-[72px] font-extrabold text-black leading-none"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              7
            </span>
            <span
              className="text-[14px] md:text-[15px] font-semibold text-black mt-2"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Districts Covered
            </span>
            <span
              className="text-[12px] md:text-[13px] text-[#888] mt-1.5 leading-[1.5]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Serving all major farming regions across Sarawak
            </span>
          </div>

          {/* Column 3 — Photo */}
          <div className="rounded-[20px] overflow-hidden aspect-square md:aspect-auto md:h-[220px]">
            <img
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80"
              alt="Lush green paddy field"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Column 4 — Stat card (lime) */}
          <div
            className="rounded-[20px] p-6 md:p-7 flex flex-col justify-end aspect-square md:aspect-auto md:h-[220px]"
            style={{ background: "#A8D832" }}
          >
            <span
              className="inline-flex items-baseline text-[56px] md:text-[72px] font-extrabold text-black leading-none"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              10<span className="text-[28px] md:text-[36px] self-start mt-1">+</span>
            </span>
            <span
              className="text-[14px] md:text-[15px] font-semibold text-black mt-2"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Crops in Database
            </span>
            <span
              className="text-[12px] md:text-[13px] text-black/60 mt-1.5 leading-[1.5]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Sarawak-specific crops from beginner to expert level
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
