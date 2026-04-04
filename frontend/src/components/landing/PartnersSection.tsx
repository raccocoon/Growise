import { motion } from "framer-motion";
import { Heart, Brain, Database, Triangle, Server, Route, Sparkles } from "lucide-react";

const partners = [
  { name: "Lovable", icon: Heart },
  { name: "Anthropic", icon: Brain },
  { name: "Supabase", icon: Database },
  { name: "Vercel", icon: Triangle },
  { name: "Render", icon: Server },
  { name: "Openrouter", icon: Route },
  { name: "Gemini", icon: Sparkles },
];

export function PartnersSection() {
  return (
    <section className="bg-white py-16 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm text-[#0d2010]/40 uppercase tracking-widest font-semibold mb-8"
        >
          Built With Support From
        </motion.p>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
          {partners.map(({ name, icon: Icon }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-2 text-[#0d2010]/25 hover:text-[#0d2010]/50 transition-colors"
            >
              <Icon size={20} strokeWidth={2} />
              <span className="text-lg font-bold tracking-wide">{name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
