"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"

interface ServiceCardProps {
  id?: string
  title: string
  description: string
  price: string
  duration: string
  image: string
  features: string[]
  onBook: () => void
  index: number
  popular?: boolean
}

export function ServiceCard({ 
  id,
  title, 
  description, 
  price, 
  duration,
  image,
  features,
  onBook, 
  index,
  popular
}: ServiceCardProps) {
  const colorMap: Record<string, string> = {
    "bronze-pack": "#B9773D",
    "silver-pack": "#C0C0C0",
    "gold-pack": "#D4A843",
    "diamond-ceramic": "#B9F2FF",
    "ceramic-coating-3yr": "#B9F2FF",
    "titanium-ceramic-shield": "#9CA3AF",
    "ceramic-coating-5yr": "#9CA3AF",
  }

  const lookup = (id || title || "").toLowerCase()
  const cardColor = colorMap[lookup] ||
    (title.toLowerCase().includes("bronze") ? colorMap["bronze-pack"] : null) ||
    (title.toLowerCase().includes("silver") ? colorMap["silver-pack"] : null) ||
    (title.toLowerCase().includes("gold") ? colorMap["gold-pack"] : null) ||
    (title.toLowerCase().includes("diamond") ? colorMap["diamond-ceramic"] : null) ||
    (title.toLowerCase().includes("titanium") ? colorMap["titanium-ceramic-shield"] : null) ||
    null

  // interactive state to color the 'after' title on hover or click
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  const goldColor = "#D4A843"
  const goldBulletIds = new Set(["express-wash", "premium-wash", "paint-correction"])
  const normalizedTitleId = title.toLowerCase().replace(/\s+/g, "-")
  const isGoldBullet = goldBulletIds.has(lookup) || goldBulletIds.has(normalizedTitleId)

  // Color only the keyword word within the title if present (Bronze/Silver/Gold/Diamond/Titanium)
  const keywords = ["bronze", "silver", "gold", "diamond", "titanium"]
  let titleNode: React.ReactNode = title
  const lower = title.toLowerCase()
  for (const kw of keywords) {
    const idx = lower.indexOf(kw)
    if (idx !== -1) {
      const before = title.slice(0, idx)
      const match = title.slice(idx, idx + kw.length)
      const after = title.slice(idx + kw.length)
      // if hovered or active, color the remainder as well for the affected cards
      const shouldColor = cardColor && (hovered || active)
      const afterColor = shouldColor ? cardColor : undefined
      titleNode = (
        <>
          {before}
          <span style={{ color: shouldColor ? cardColor : undefined }}>{match}</span>
          <span style={{ color: afterColor }}>{after}</span>
        </>
      )
      break
    }
  }
  return (
    <motion.div
      className={`group relative flex h-full flex-col bg-[#111111] rounded-2xl overflow-hidden cursor-pointer ${cardColor ? 'special-card' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02, transition: { duration: 0.12, ease: "easeOut" } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setActive((v) => !v)}
      style={{
        boxShadow: "0 0 0 1px rgba(42, 42, 42, 1)",
      }}
    >
      {/* colored glow border on hover for specific cards */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-out pointer-events-none z-20 special-glow`}
        style={{
          boxShadow: cardColor
            ? (hovered || active)
              ? `0 0 48px ${cardColor}88, 0 0 88px ${cardColor}55, inset 0 0 0 2px ${cardColor}ff`
              : `0 0 28px ${cardColor}66, 0 0 48px ${cardColor}44, inset 0 0 0 1px ${cardColor}c0`
            : "0 0 18px rgba(212, 168, 67, 0.35), 0 0 28px rgba(212, 168, 67, 0.2), inset 0 0 0 1px rgba(212, 168, 67, 0.75)",
        }}
      />

      {/* Popular Badge */}
      {popular && (
        <div className="absolute top-4 right-4 z-10 bg-[#ED0407] text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-lg">
          Most Popular
        </div>
      )}

      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.03]"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 relative z-10 flex flex-1 flex-col">
        <h3 className="text-xl md:text-2xl font-bold mb-3 transition-colors duration-100 ease-out" style={{ color: cardColor ? undefined : "#FFFFFF" }}>
          {titleNode}
        </h3>
        <p className="text-white/60 text-sm leading-relaxed mb-5">
          {description}
        </p>

        {/* Features List */}
        <ul className="space-y-2.5 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-white/80">
              <span
                className="mt-1 flex-shrink-0 transition-colors duration-100 ease-out"
                style={{
                  color: (hovered || active) ? (isGoldBullet ? goldColor : cardColor) : undefined,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 0L6.12 3.88L10 5L6.12 6.12L5 10L3.88 6.12L0 5L3.88 3.88L5 0Z" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-5 mt-auto">
          <span className="text-white/50 text-xs tracking-wider uppercase">Starting at</span>
          <span className="text-[#D4A843] font-bold text-2xl">{price}</span>
        </div>
        <p className="text-[#D4A843] text-sm font-semibold mb-5">Duration: {duration}</p>

        {/* Book Button */}
        <motion.button
          onClick={onBook}
          className="w-full bg-[#ED0407] hover:bg-[#ED0407]/90 text-white py-3.5 rounded-md font-bold text-sm tracking-wider transition-colors duration-100"
          whileTap={{ scale: 0.98 }}
        >
          BOOK NOW
        </motion.button>
      </div>
    </motion.div>
  )
}
