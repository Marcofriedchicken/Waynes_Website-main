"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { PromoRibbon } from "./promo-ribbon"

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
  promoDiscount?: string | null
  originalPrice?: string
  promoTitle?: string | null
  promoEndDate?: string | null
}

function withHexAlpha(color: string, alpha: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alpha}`
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const expanded = color.slice(1).split("").map((digit) => digit + digit).join("")
    return `#${expanded}${alpha}`
  }
  return color
}

function formatPromoEndDate(endDate?: string | null) {
  if (!endDate) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(endDate))
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
  popular,
  promoDiscount,
  originalPrice,
  promoTitle,
  promoEndDate,
}: ServiceCardProps) {
  const colorMap: Record<string, string> = {
    "bronze-pack": "#B9773D",
    "silver-pack": "#C0C0C0",
    "gold-pack": "#D4A843",
    "paint-correction": "#B7FF5A",
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

  const metallicGradients: Record<string, string> = {
    bronze: "linear-gradient(135deg, #fff4d6 0%, #f1c17b 18%, #d8933d 35%, #ffe6a7 52%, #9d5d1a 72%, #f7dfb0 100%)",
    silver: "linear-gradient(135deg, #ffffff 0%, #edf3f8 18%, #bec7d2 32%, #ffffff 48%, #8a98a8 62%, #ecf1f7 78%, #d9e0e8 100%)",
    gold: "linear-gradient(135deg, #fff9d8 0%, #fce9a6 18%, #d8b14c 35%, #fff4b0 52%, #b67d1a 70%, #f6d86a 100%)",
    paint: "linear-gradient(135deg, #f8ffe7 0%, #d7ff7a 18%, #b7ff5a 36%, #dfff94 52%, #6de82e 72%, #ecffd4 100%)",
    diamond: "linear-gradient(135deg, #f7ffff 0%, #dff7ff 18%, #9fe6ff 35%, #f7ffff 52%, #5dc7f4 70%, #dffcff 100%)",
    titanium: "linear-gradient(135deg, #ffffff 0%, #dfe8ef 18%, #aab8c9 35%, #f7fafc 52%, #7c8ca0 70%, #edf3f8 100%)",
  }

  const getPaintCorrectionTextStyle = () => ({
    color: (hovered || active) ? "#B7FF5A" : undefined,
    textShadow: (hovered || active) ? "0 0 16px rgba(183,255,90,0.9)" : undefined,
  })

  const getMetallicTextStyle = (keyword: string) => {
    const activeGlow = hovered || active
    const gradient = metallicGradients[keyword] || metallicGradients.silver

    if (!activeGlow) {
      return {}
    }

    return {
      backgroundImage: gradient,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      textShadow: `0 0 16px ${cardColor ?? "#ffffff"}99`,
      filter: "brightness(1.25)",
    } as React.CSSProperties
  }

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
      const shouldColor = Boolean(cardColor) && (hovered || active)
      const keywordStyle = shouldColor ? getMetallicTextStyle(kw) : {}
      const afterStyle = shouldColor ? getMetallicTextStyle(kw) : {}
      titleNode = (
        <>
          {before}
          <span style={keywordStyle}>{match}</span>
          <span style={afterStyle}>{after}</span>
        </>
      )
      break
    }
  }

  if (title.toLowerCase().includes("paint")) {
    const paintIndex = title.toLowerCase().indexOf("paint")
    const before = title.slice(0, paintIndex)
    const match = title.slice(paintIndex)
    titleNode = (
      <>
        {before}
        <span style={getPaintCorrectionTextStyle()}>{match}</span>
      </>
    )
  }
  return (
    <motion.div
      className={`group relative flex h-full flex-col bg-[#111111] rounded-2xl overflow-visible cursor-pointer ${cardColor ? 'special-card' : ''}`}
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
        ...(cardColor
          ? ({
              "--special-color": cardColor,
              "--special-color-88": withHexAlpha(cardColor, "88"),
              "--special-color-55": withHexAlpha(cardColor, "55"),
            } as React.CSSProperties)
          : {}),
      }}
      data-active={active}
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

      {promoDiscount && (
        <PromoRibbon
          title={promoTitle || "SALE"}
          discount={promoDiscount}
          endDate={formatPromoEndDate(promoEndDate)}
        />
      )}

      {/* Image Container */}
      <div className="relative h-56 overflow-hidden rounded-t-2xl">
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
                  color: (hovered || active)
                    ? (() => {
                        if (title.toLowerCase().includes("essential")) return goldColor
                        if (title.toLowerCase().includes("paint")) return "#B7FF5A"
                        return cardColor ?? goldColor
                      })()
                    : undefined,
                  textShadow: (hovered || active) && (title.toLowerCase().includes("paint") || title.toLowerCase().includes("essential"))
                    ? "0 0 12px rgba(255,255,255,0.2)"
                    : undefined,
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
          {promoDiscount && originalPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-white/50 font-semibold text-lg line-through">{originalPrice}</span>
              <span className="text-[#D4A843] font-bold text-2xl">{price}</span>
            </div>
          ) : (
            <span className="text-[#D4A843] font-bold text-2xl">{price}</span>
          )}
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
