import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function CTABanner() {
  return (
    <section className="bg-[#F9F9F2] py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto bg-[#0d2010] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2"
      >
        <div className="p-10 lg:p-14 flex flex-col justify-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            We Look Forward To{" "}
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }} className="text-[#7BC618]">
              Hear From You!
            </span>
          </h2>
          <p className="text-white/55 leading-relaxed mb-8">
            Ready to grow smarter? Set up your farm profile in under 2 minutes and get your first AI recommendation today.
          </p>
          <div>
            <Link
              to="/auth"
              className="inline-block px-8 py-3.5 bg-[#7BC618] text-[#0d2010] font-bold text-sm rounded-full hover:bg-[#8ed625] transition-all shadow-lg shadow-[#7BC618]/25"
            >
              Get Started Free
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <img src="/images/crop.png" alt="Sarawak farmland" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </motion.div>
    </section>
  );
}
