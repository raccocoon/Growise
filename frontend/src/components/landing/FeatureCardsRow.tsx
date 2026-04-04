import { motion } from "framer-motion";

export function FeatureCardsRow() {
  return (
    <section className="bg-white px-4 pt-4 pb-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.1fr_1fr] gap-3 items-center">
        {/* Left card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-[#F5F5EE] rounded-2xl p-5 flex items-start gap-4"
        >
          <div className="flex-1">
            <h3 className="font-bold text-[#1a1a1a] text-[16px] leading-snug mb-2">
              AI Crop Recommendations For Smarter Planting
            </h3>
            <p className="text-[13px] text-[#666666] leading-relaxed mb-3">
              GrowBuddy analyses your soil, weather and location to recommend the best crops to plant right now.
            </p>
            <a href="#features" className="text-xs font-bold text-[#7BC618] uppercase tracking-wider flex items-center gap-1">
              Learn More <span>↗</span>
            </a>
          </div>
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
            <img src="/images/soil.png" alt="AI Crops" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Center text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center py-6"
        >
          <h3 className="text-[24px] sm:text-[28px] font-bold text-[#1a1a1a] leading-snug">
            Transforming{" "}
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }} className="font-normal text-[#1a1a1a]">
              Farming
            </span>
            <br />
            with AI Intelligence For
            <br />
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }} className="font-normal text-[#1a1a1a]">
              Sarawak's Future
            </span>
          </h3>
        </motion.div>

        {/* Right card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-[#F5F5EE] rounded-2xl p-5 flex items-start gap-4"
        >
          <div className="flex-1">
            <h3 className="font-bold text-[#1a1a1a] text-[16px] leading-snug mb-2">
              Pest & Flood Alerts Before They Strike
            </h3>
            <p className="text-[13px] text-[#666666] leading-relaxed mb-3">
              Real-time weather analysis detects risk windows for disease outbreaks and flooding before they damage your crops.
            </p>
            <a href="#features" className="text-xs font-bold text-[#7BC618] uppercase tracking-wider flex items-center gap-1">
              Learn More <span>↗</span>
            </a>
          </div>
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
            <img src="/images/crop.png" alt="Pest alerts" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
