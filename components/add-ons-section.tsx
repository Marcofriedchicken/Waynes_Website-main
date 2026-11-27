"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Clock } from "lucide-react"
import { PromoRibbon } from "./promo-ribbon"

// Short descriptions shown on each card. Names, prices and durations
// come live from /api/pricing (the admin pricing page).
const addOnDescriptions: Record<string, string> = {
  "headlight-restoration": "Removes yellowing and haze so your headlights look clear and shine brighter at night.",
  "engine-bay-cleaning": "Safe degrease and dressing of the engine bay for a clean, like-new look under the hood.",
  "back-to-zero": "Cabin sanitation that kills odors and germs on seats, vents and touch points.",
  "water-spot-treatment": "Lifts stubborn mineral water spots from paint and glass.",
  "hydrophobic-treatment": "Water-repellent coating on glass so rain beads up and rolls right off.",
  "deluxe-interior-detail": "Deep interior clean of seats, carpets, panels and dashboard.",
}

export type AddOnItem = {
  id: string
  name: string
  price: number
  originalPrice?: number
  durationMinutes: number
  promoDiscount?: string | null
  promoTitle?: string | null
  promoEndDate?: string | null
}

function formatDuration(totalMinutes: number) {
  if (!totalMinutes) return ""
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} mins`
  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`
}

function formatPromoEndDate(endDate?: string | null) {
  if (!endDate) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(endDate))
}

interface AddOnsSectionProps {
  onBookAddOn: (addOnId: string) => void
}

export function AddOnsSection({ onBookAddOn }: AddOnsSectionProps) {
  const [addOns, setAddOns] = useState<AddOnItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pricing")
        const data = await res.json()
        setAddOns(
          (data.addOns || []).map((addon: any) => ({
            id: addon.slug,
            name: addon.name,
            price: addon.effective_price ?? addon.price ?? 0,
            originalPrice: addon.price,
            durationMinutes: addon.duration_minutes ?? 0,
            promoDiscount: addon.active_promo_label,
            promoTitle: addon.promo_label,
            promoEndDate: addon.promo_end_date,
          })),
        )
      } catch (err) {
        console.error("Failed to load add-ons:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (!loading && addOns.length === 0) return null

  return (
    <section id="add-ons" className="py-20 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-[0.2em] uppercase">Extras</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-4">
            Add-On <span className="text-[#ED0407]">Services</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            Take your detail further. Add any of these to your service when you book.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center text-white/50">Loading add-ons...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addon, index) => (
              <motion.div
                key={addon.id}
                className="relative flex flex-col rounded-2xl border border-white/10 bg-[#141414] p-6 hover:border-[#D4A843]/60 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                {addon.promoDiscount && (
                  <PromoRibbon
                    title={addon.promoTitle || "SALE"}
                    discount={addon.promoDiscount}
                    endDate={formatPromoEndDate(addon.promoEndDate)}
                  />
                )}
                <h3 className="text-xl font-bold text-white pr-16">{addon.name}</h3>
                <p className="text-white/60 text-sm mt-2 flex-1">
                  {addOnDescriptions[addon.id] || "Add this to any service when you book."}
                </p>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      {addon.promoDiscount && addon.originalPrice != null && addon.originalPrice !== addon.price && (
                        <span className="text-sm text-white/40 line-through">₱{addon.originalPrice.toLocaleString()}</span>
                      )}
                      <span className="text-2xl font-black text-[#D4A843]">+₱{addon.price.toLocaleString()}</span>
                    </div>
                    {addon.durationMinutes > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                        <Clock className="w-3.5 h-3.5" /> {formatDuration(addon.durationMinutes)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookAddOn(addon.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#D4A843] px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-[#D4A843]/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> ADD & BOOK
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
