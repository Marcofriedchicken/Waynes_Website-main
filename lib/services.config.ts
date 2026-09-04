// Central services and scheduling configuration
export const TIMEZONE = "Asia/Manila"

export const OPERATING_HOURS = {
  openHour: 7, // 7:00
  closeHour: 19, // 19:00 (7:00 PM)
}

export const POOLS = {
  A: {
    id: "A",
    capacity: 3,
    services: [
      "Essentail Wash",
      "Premium Wash",
      "Bronze Pack",
      "Silver Pack",
      "Gold Pack",
      "Elite Detail",
    ],
  },
  B: {
    id: "B",
    capacity: 2,
    services: [
      "Paint Correction",
      "Diamond Ceramic",
      "Titanium Ceramic Shield",
      "Ceramic Coating 3yr",
      "Ceramic Coating 5yr",
    ],
  },
}

export const ADDON_DURATIONS: Record<string, number> = {
  "Headlight Restoration": 120,
  "Engine Bay Cleaning": 30,
  "Back to Zero Sanitation": 5,
  "Water Spot Treatment": 10,
  "Hydrophobic Treatment": 10,
  "Deluxe Interior Detail": 30,
}

export const SERVICE_DURATIONS: Record<string, number> = {
  "Essentail Wash": 35,
  "Premium Wash": 60,
  "Bronze Pack": 60,
  "Silver Pack": 80,
  "Gold Pack": 105,
  "Elite Detail": 105,
  "Paint Correction": 120,
  "Ceramic Coating 3yr": 480,
  "Ceramic Coating 5yr": 480,
  "Diamond Ceramic": 480,
  "Titanium Ceramic Shield": 480,
}

export function normalizeAddonName(addonName: string) {
  return addonName.split("(")[0].trim()
}

export function getServiceDuration(serviceTitle: string) {
  return SERVICE_DURATIONS[serviceTitle] || 60
}

export function getAddonDuration(addonName: string) {
  const normalized = normalizeAddonName(addonName)
  return ADDON_DURATIONS[normalized] || 0
}

export function getPoolIdForService(serviceTitle: string): "A" | "B" | null {
  if (POOLS.A.services.includes(serviceTitle)) return "A"
  if (POOLS.B.services.includes(serviceTitle)) return "B"
  return null
}

export function isCeramicService(serviceTitle: string) {
  return ["Diamond Ceramic", "Titanium Ceramic Shield", "Ceramic Coating 3yr", "Ceramic Coating 5yr"].includes(
    serviceTitle,
  )
}

export function isPaintCorrection(serviceTitle: string) {
  return serviceTitle === "Paint Correction"
}

export function computeTotalDurationMinutes(serviceTitle: string, addonNames: string[] = []) {
  const base = getServiceDuration(serviceTitle)
  const addons = addonNames.reduce((sum, a) => sum + getAddonDuration(a), 0)
  return base + addons
}
