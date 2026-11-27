"use client"

import { motion } from "framer-motion"
import { Gift, Search, Percent } from "lucide-react"
import { decemberPromo, usePromoActive } from "@/lib/promo"

export function PromoSection() {
  const active = usePromoActive()
  if (!active) return null

  return (
    <section id="promo" className="py-16 bg-[#0A0A0A]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[#ED0407]/40 bg-gradient-to-br from-[#1A0505] via-[#111111] to-[#111111] p-8 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#ED0407]/20 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ED0407] px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-white">
              <Gift className="w-4 h-4" /> December Promo
            </span>

            <h2 className="mt-5 text-3xl md:text-5xl font-black text-white">
              Get a <span className="text-[#ED0407]">FREE</span> paint check
            </h2>
            <p className="mt-4 text-white/70 max-w-2xl">
              Visit our shop in San Miguel, Pasig for a free 10-minute paint check. We&apos;ll look at your paint
              under a swirl light and show you exactly what it needs. No obligation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-4 rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A]/60 p-5">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-[#D4A843]/15 flex items-center justify-center">
                  <Search className="w-5 h-5 text-[#D4A843]" />
                </div>
                <div>
                  <p className="text-white font-bold">Free 10-minute paint check</p>
                  <p className="text-white/60 text-sm">Only {decemberPromo.slots} slots this December</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A]/60 p-5">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-[#ED0407]/15 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-[#ED0407]" />
                </div>
                <div>
                  <p className="text-white font-bold">50% off Bronze, Silver &amp; Gold packs</p>
                  <p className="text-white/60 text-sm">Until December 31</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <a
                href={decemberPromo.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center px-8 py-4 rounded-xl bg-[#ED0407] text-white font-bold hover:bg-[#ED0407]/90 transition-colors shadow-lg shadow-[#ED0407]/20"
              >
                Claim your free paint check
              </a>
              <p className="text-white/50 text-sm">Takes less than a minute to fill out.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
