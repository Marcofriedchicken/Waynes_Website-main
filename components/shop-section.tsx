"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { PromoRibbon } from "./promo-ribbon"

// Static shop item metadata - prices will be fetched from API
const shopItemMetadata = [
  {
    id: "tshirt-black",
    name: "Wayne's Detailing T-Shirt",
    description: "Premium black performance tee with Wayne's Detailing front logo print.",
    image: "/images/shop-tshirt-waynes.png",
    category: "Apparel",
  },
  {
    id: "cap",
    name: "Snapback Cap",
    description: "Classic black cap with embroidered Wayne's Detailing logo and motto.",
    image: "/images/shop-cap-waynes.png",
    category: "Apparel",
  },
  {
    id: "microfiber-set",
    name: "Coffee Mug",
    description: "Matte black ceramic mug featuring Wayne's Detailing signature branding.",
    image: "/images/shop-mug-waynes.png",
    category: "Lifestyle",
  },
  {
    id: "cleaning-kit",
    name: "Umbrella",
    description: "Full-size black umbrella with Wayne's Detailing logo for all-weather use.",
    image: "/images/shop-umbrella-waynes.png",
    category: "Lifestyle",
  },
]

export let merchandise: any[] = []

function formatPromoEndDate(endDate?: string | null) {
  if (!endDate) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(endDate))
}

export function ShopSection() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await fetch('/api/pricing')
        const data = await res.json()

        // Merge API pricing with static metadata
        merchandise = shopItemMetadata.map(metadata => {
          const apiItem = data.shopItems.find((s: any) => s.slug === metadata.id)
          if (!apiItem) return { ...metadata, price: "₱0", priceValue: 0, apiData: null }

          return {
            ...metadata,
            price: `₱${apiItem.effective_price.toLocaleString()}`,
            priceValue: apiItem.effective_price,
            promoDiscount: apiItem.active_promo_label,
            originalPrice: apiItem.price,
            promoTitle: apiItem.promo_label,
            promoEndDate: apiItem.promo_end_date,
            apiData: apiItem,
          }
        })

        setLoading(false)
      } catch (err) {
        console.error('Failed to load pricing:', err)
        setLoading(false)
      }
    }

    loadPricing()
  }, [])
  return (
    <section id="shop" className="py-20 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.p
            className="text-[#D4A843] text-sm tracking-[0.3em] font-medium mb-4"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            OFFICIAL MERCHANDISE
          </motion.p>
          <motion.h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            WAYNE&apos;S <span className="text-[#ED0407]">SHOP</span>
          </motion.h2>
          <motion.p
            className="text-white/60 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            Rep the brand with our official merchandise and premium detailing products
          </motion.p>
        </motion.div>

        {/* Merchandise Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center text-white/50">Loading...</div>
          ) : (
            merchandise.map((item, index) => (
              <ShopCard key={item.id} item={item} index={index} />
            ))
          )}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Shop our official gear or collect it in person at the studio for a premium detailing experience and a brand you can rep with pride.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

function ShopCard({ item, index }: { item: any; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)
  const highlighted = hovered || active

  return (
    <motion.div
      className="group relative bg-[#111111] rounded-2xl overflow-visible transition-all duration-200 cursor-pointer"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setActive((value) => !value)}
      data-active={active}
      style={{
        boxShadow: "0 0 0 1px rgba(42, 42, 42, 1)",
      }}
    >
                {item.promoDiscount && (
                  <PromoRibbon
                    title={item.promoTitle || "SALE"}
                    discount={item.promoDiscount}
                    endDate={formatPromoEndDate(item.promoEndDate)}
                  />
                )}

                {/* Gold glow border on hover */}
                <div
                  className="absolute inset-0 rounded-2xl transition-opacity duration-150 pointer-events-none z-20"
                  style={{
                    opacity: highlighted ? 1 : 0,
                    boxShadow: "0 0 18px rgba(212, 168, 67, 0.35), 0 0 28px rgba(212, 168, 67, 0.2), inset 0 0 0 1px rgba(212, 168, 67, 0.75)",
                  }}
                />

                {/* Category Badge */}
                <div className="absolute top-3 left-3 z-10 bg-[#D4A843] text-black text-xs font-bold px-2 py-1 rounded">
                  {item.category}
                </div>

                {/* Image Container */}
                <div className="relative h-67 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#171717] to-[#0f0f0f]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    loading="eager"
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="p-5 relative z-10">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#D4A843] transition-colors duration-300">
                    {item.name}
                  </h3>
                  <p className="text-white/50 text-sm mb-4 line-clamp-2">
                    {item.description}
                  </p>

                  {item.promoDiscount && item.originalPrice !== undefined && item.originalPrice !== null ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-white/50 font-semibold text-sm line-through">₱{item.originalPrice.toLocaleString()}</span>
                      <span className="block text-[#D4A843] font-bold text-xl">{item.price}</span>
                    </div>
                  ) : (
                    <span className="block text-[#D4A843] font-bold text-xl">{item.price}</span>
                  )}
                </div>
    </motion.div>
  )
}
