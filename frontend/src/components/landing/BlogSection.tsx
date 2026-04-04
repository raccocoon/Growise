import { motion } from "framer-motion";

const blogs = [
  {
    img: "/images/soil.png",
    tag: "Soil Science",
    title: "Understanding Sarawak's Peat Soil: What Every Farmer Must Know",
    excerpt: "Peat soil covers a significant portion of Sarawak's lowlands. Learn how to work with it, not against it.",
  },
  {
    img: "/images/crop.png",
    tag: "Beginner Guide",
    title: "A First-Time Grower's Journey: From Backyard to Harvest",
    excerpt: "Follow a new farmer's story of growing Kangkung in their Kuching backyard using GrowBuddy's step-by-step guides.",
  },
  {
    img: "/images/farmer.png",
    tag: "Technology",
    title: "How AI is Revolutionising Farming in Borneo",
    excerpt: "From smart weather prediction to crop rotation algorithms — discover how technology is transforming agriculture in Borneo.",
  },
];

export function BlogSection() {
  return (
    <section id="blog" className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0d2010] text-center mb-16"
        >
          We Explore The{" "}
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }} className="text-[#4CAF50]">
            Future of Agriculture
          </span>{" "}
          Through Our Blog
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogs.map((b, i) => (
            <motion.article
              key={b.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="group rounded-2xl overflow-hidden bg-[#f5f9f0] border border-[#e0ecd4] hover:shadow-xl hover:shadow-[#7BC618]/10 transition-all"
            >
              <div className="h-48 overflow-hidden">
                <img src={b.img} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-5">
                <span className="inline-block px-3 py-1 rounded-full bg-[#7BC618]/15 text-[#4CAF50] text-xs font-semibold mb-3">
                  {b.tag}
                </span>
                <h3 className="font-bold text-[#0d2010] mb-2 leading-snug">{b.title}</h3>
                <p className="text-sm text-[#0d2010]/55 leading-relaxed mb-3">{b.excerpt}</p>
                <a href="#" className="text-sm font-semibold text-[#7BC618] hover:text-[#5a9e10] transition-colors">
                  Learn More →
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
