"use client"

import { motion } from "framer-motion"
import { businessInfo } from "@/lib/site-info"

// Only facts customers can verify. Keep these true when things change.
const stats: { value: string; label: string; href?: string }[] = [
  { value: "5.0★", label: "Google Rating", href: businessInfo.googleReviewsUrl },
  { value: "7 Days", label: "Open Every Week" },
  { value: "7AM–7PM", label: "Daily Hours" },
  { value: "Pasig", label: "San Miguel Shop" },
]

export function StatsBar() {
  return (
    <section className="relative py-16 bg-gradient-to-r from-[#ED0407] to-[#ED0407]/90">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const content = (
              <>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 whitespace-nowrap">
                  {stat.value}
                </div>
                <div className="text-white/80 font-medium">
                  {stat.label}
                  {stat.href && <span className="block text-xs text-white/70 underline underline-offset-2 mt-1">See reviews</span>}
                </div>
              </>
            )
            return (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                {stat.href ? (
                  <a href={stat.href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
