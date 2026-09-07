"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ServiceCard } from "./service-card"

// Static service metadata - prices will be fetched from API
const serviceMetadata = [
  {
    id: "essential-wash",
    title: "Essential Wash",
    description:
      "A quick, high-quality exterior wash that strips away dirt and buildup, delivering a crisp, spotless finish. (35 mins)",
    duration: "35 mins",
    durationMinutes: 35,
    canUpgradeTo: [
      "premium-wash",
      "bronze-pack",
      "silver-pack",
      "gold-pack",
      "paint-correction",
      "ceramic-coating-3yr",
      "ceramic-coating-5yr",
    ],
    image: "/images/premium-carwash.jpg",
    features: [
      "Premium body wash (Foam-Rinse-Foam)",
      "Streak-free cleaning of windows & mirrors",
      "Door jambs wiped down",
      "Microfiber towel and air dry",
      "Vacuum",
      "Tire dressing & rim clean",
    ],
  },
  {
    id: "premium-wash",
    title: "Premium Wash",
    description:
      "A complete interior and exterior cleaning in one visit-designed to quickly restore your vehicle's overall cleanliness inside and out. (1 hr)",
    duration: "1 hr",
    durationMinutes: 60,
    canUpgradeTo: [
      "bronze-pack",
      "silver-pack",
      "gold-pack",
      "paint-correction",
      "ceramic-coating-3yr",
      "ceramic-coating-5yr",
    ],
    image: "/images/interior-detailing.jpg",
    features: [
      "All Essential Wash",
      "Deluxe Interior Detail",
      "Interior Dressing",
      "Trim Restoration",
      "Cabin Fragrance",
    ],
  },
  {
    id: "bronze-pack",
    title: "Bronze Pack",
    description:
      "Upgrade to full detail with interior and exterior cleaning in one visit. (1 hr)",
    duration: "1 hr",
    durationMinutes: 60,
    canUpgradeTo: ["silver-pack", "gold-pack", "paint-correction", "ceramic-coating-3yr", "ceramic-coating-5yr"],
    image: "/images/shop-deluxe-detail.jpeg",
    features: [
      "All Essential Wash",
      "Interior Dressing",
      "Back to Zero Sanitation",
      "Trim Restoration",
      "Cabin Fragrance",
      "Iron Remover",
      "Machine Buff Wax",
    ],
  },
  {
    id: "silver-pack",
    title: "Silver Pack",
    description:
      "Advanced detailing package with stronger decontamination and enhanced finish. (1 hr 20 mins)",
    duration: "1 hr 20 mins",
    durationMinutes: 80,
    canUpgradeTo: ["gold-pack", "paint-correction", "ceramic-coating-3yr", "ceramic-coating-5yr"],
    image: "/images/shop-premium-detail.jpeg",
    features: [
      "All Essential Wash",
      "Interior Dressing",
      "Back to Zero Sanitation",
      "Trim Restoration",
      "Cabin Fragrance",
      "Iron Remover",
      "Water Spot Remover",
      "Machine Buff Wax",
    ],
  },
  {
    id: "gold-pack",
    title: "Gold Pack",
    description:
      "High-level detailing package with deeper interior and exterior restoration. (1 hr 45 mins)",
    duration: "1 hr 45 mins",
    durationMinutes: 105,
    canUpgradeTo: ["paint-correction", "ceramic-coating-3yr", "ceramic-coating-5yr"],
    image: "/images/engine-wash.jpg",
    features: [
      "All Essential Wash",
      "Interior Dressing",
      "Back to Zero Sanitation",
      "Trim Restoration",
      "Cabin Fragrance",
      "Iron Remover",
      "Water Spot Remover",
      "Machine Buff Wax",
      "Engine Bay Wash",
    ],
  },
  {
    id: "paint-correction",
    title: "Paint Correction",
    description:
      "A multi-stage polishing process that eliminates defects—restoring deep gloss, clarity, and a flawless finish.",
    duration: "2 hrs",
    durationMinutes: 120,
    canUpgradeTo: ["ceramic-coating-3yr", "ceramic-coating-5yr"],
    image: "/images/wax-buffing.jpg",
    features: [
      "All Express Carwash",
      "Full Paint Decontamination",
      "Clay bar treatment",
      "Trim Restoration",
      "Machine compounding, Machine polishing",
      "Paint sealant protection finish",
    ],
  },
  {
    id: "ceramic-coating-3yr",
    title: "Diamond Ceramic",
    description:
      "Advanced coating combines graphene and ceramic technology to deliver superior results. Hydrophobic properties and enhanced 3-year paint protection. (8 hrs)",
    duration: "8 hrs",
    durationMinutes: 480,
    canUpgradeTo: ["ceramic-coating-5yr"],
    image: "/images/ceramic-coating.jpeg",
    features: [
      "All Express Carwash",
      "Full Paint Decontamination",
      "Clay bar treatment",
      "Trim Restoration",
      "Machine polishing, Machine compounding",
      "Graphene Ceramic Coating + SiO2 mix",
    ],
  },
  {
    id: "ceramic-coating-5yr",
    title: "Titanium Ceramic Shield",
    description:
      "High-tech ceramic composite coating combines silicon dioxide (SiO2), SiN, and Polysilazane to give you durable hydrophobic 5-year ceramic protection. (8 hrs)",
    duration: "8 hrs",
    durationMinutes: 480,
    canUpgradeTo: [],
    image: "/images/shop-titanium-ceramic-shield.jpeg",
    features: [
      "All Express Carwash",
      "Full Paint Decontamination",
      "Clay bar treatment",
      "Trim Restoration",
      "Machine polishing, Machine compounding",
      "SiO2 Mix (Stronger Ceramic Base Layer)",
    ],
  },
]

export let services: any[] = []

const CERAMIC_SERVICE_IDS = new Set<string>(["ceramic-coating-3yr", "ceramic-coating-5yr"])

interface ServicesSectionProps {
  onBookService: (serviceId: string) => void
}

export function ServicesSection({ onBookService }: ServicesSectionProps) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await fetch('/api/pricing')
        const data = await res.json()

        // Merge API pricing with static metadata
        services = serviceMetadata.map(metadata => {
          const apiService = data.services.find((s: any) => s.slug === metadata.id)
          if (!apiService) return metadata

          // Build prices and priceValue
          const prices = Object.entries(apiService.prices).reduce(
            (acc, [vehicleType, pricing]: any) => {
              acc[vehicleType] = pricing.effective_price
              return acc
            },
            {} as Record<string, number>
          )

          const firstVehicleType = 'Compact/Hatch'
          const priceValue = prices[firstVehicleType] || 0
          const priceDisplay = priceValue > 0 ? `₱${priceValue.toLocaleString()}` : ''

          return {
            ...metadata,
            price: priceDisplay,
            priceValue,
            prices,
            apiPricing: apiService.prices, // Store full promo info
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

  const firstRowServices = services.filter((s) => ["essential-wash", "premium-wash"].includes(s.id))
  const secondRowServices = services.filter((s) => ["bronze-pack", "silver-pack", "gold-pack"].includes(s.id))
  const thirdRowServices = services.filter((s) =>
    ["paint-correction", "ceramic-coating-3yr", "ceramic-coating-5yr"].includes(s.id),
  )

  if (loading) {
    return (
      <section id="services" className="py-24 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white/50">Loading services...</div>
        </div>
      </section>
    )
  }

  return (
    <section id="services" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-[0.2em] uppercase">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-4">
            Choose Your <span className="text-[#ED0407]">Auto Care</span> Package
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            From basic washes to complete transformations, we offer a full range of
            professional auto detailing services.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          {firstRowServices.map((service, index) => {
            const firstVehicleType = 'Compact/Hatch'
            const promoInfo = service.apiPricing?.[firstVehicleType]
            const originalPrice = service.apiPricing?.[firstVehicleType]?.price

            return (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                description={service.description}
                price={service.price}
                duration={service.duration}
                image={service.image}
                features={service.features}
                onBook={() => onBookService(service.id)}
                index={index}
                promoLabel={promoInfo?.active_promo_label}
                originalPrice={originalPrice ? `₱${originalPrice.toLocaleString()}` : undefined}
                promoCampaignLabel={promoInfo?.promo_label}
                promoEndDate={promoInfo?.promo_end_date}
              />
            )
          })}
        </div>

        <div className="mx-auto mb-8 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {secondRowServices.map((service, index) => {
            const firstVehicleType = 'Compact/Hatch'
            const promoInfo = service.apiPricing?.[firstVehicleType]
            const originalPrice = service.apiPricing?.[firstVehicleType]?.price

            return (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                description={service.description}
                price={service.price}
                duration={service.duration}
                image={service.image}
                features={service.features}
                onBook={() => onBookService(service.id)}
                index={firstRowServices.length + index}
                promoLabel={promoInfo?.active_promo_label}
                originalPrice={originalPrice ? `₱${originalPrice.toLocaleString()}` : undefined}
                promoCampaignLabel={promoInfo?.promo_label}
                promoEndDate={promoInfo?.promo_end_date}
              />
            )
          })}
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {thirdRowServices.map((service, index) => {
            const firstVehicleType = 'Compact/Hatch'
            const promoInfo = service.apiPricing?.[firstVehicleType]
            const originalPrice = service.apiPricing?.[firstVehicleType]?.price

            return (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                description={service.description}
                price={service.price}
                duration={service.duration}
                image={service.image}
                features={service.features}
                onBook={() => onBookService(service.id)}
                index={firstRowServices.length + secondRowServices.length + index}
                promoLabel={promoInfo?.active_promo_label}
                originalPrice={originalPrice ? `₱${originalPrice.toLocaleString()}` : undefined}
                promoCampaignLabel={promoInfo?.promo_label}
                promoEndDate={promoInfo?.promo_end_date}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
