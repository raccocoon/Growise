import { motion } from "framer-motion";

const columns = [
  {
    photo: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80",
    alt: "Farmers using tablet in field",
    stat: "3",
    label: "Experience Levels Served",
  },
  {
    photo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
    alt: "Aerial farm field",
    stat: "9",
    label: "Districts in Sarawak",
  },
  {
    photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    alt: "Hands planting seedling",
    stat: "18+",
    label: "Crops in Our Database",
  },
  {
    photo: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&q=80",
    alt: "Team working in greenhouse",
    stat: "<3s",
    label: "Recommendation Speed",
  },
];

const rays = [
  { left: "15%", width: "40px" },
  { left: "45%", width: "80px" },
  { left: "75%", width: "30px" },
];

export function StatsSection() {
  return (
    <section
      id="impacts"
      className="relative overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%),
          linear-gradient(160deg, rgba(255,255,255,0.05) 20%, transparent 60%),
          radial-gradient(ellipse at 75% 30%, #2D5A3D 0%, #0F2518 100%)
        `,
        padding: "80px 60px",
      }}
    >
      {/* Light rays */}
      {rays.map((ray, i) => (
        <div
          key={i}
          className="absolute top-0 pointer-events-none z-0"
          style={{
            left: ray.left,
            width: ray.width,
            height: "100%",
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.07), transparent)",
            transform: "rotate(-20deg) scaleY(2)",
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-[1] max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
            }}
          >
            We Create Through
          </h2>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "#FFFFFF",
              opacity: 0.92,
              lineHeight: 1.2,
              marginTop: "4px",
            }}
          >
            Our Impact
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col, i) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-[20px] overflow-hidden"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <img
                src={col.photo}
                alt={col.alt}
                className="w-full object-cover block h-[160px] sm:h-[220px]"
                loading="lazy"
              />
              <div style={{ padding: "20px 16px 12px" }}>
                <span
                  className="block"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "clamp(32px, 4vw, 48px)",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    letterSpacing: "-1px",
                  }}
                >
                  {col.stat}
                </span>
                <span
                  className="block"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                    marginTop: "6px",
                  }}
                >
                  {col.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
