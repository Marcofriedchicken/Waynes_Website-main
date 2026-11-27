"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Info, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { services } from "./services-section"

// How many days ahead customers can book
const BOOKING_WINDOW_DAYS = 60
// Minimum notice before a same-day slot (minutes)
const MIN_NOTICE_MINUTES = 30

type Slot = {
  time: string // "HH:MM" Manila time
  available: boolean
  reason?: string
  overnight?: boolean
  completion?: string
  spotsLeft?: number
  capacity?: number
}

// Today's date in Manila as YYYY-MM-DD, plus the current Manila time in minutes
function manilaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date())
  const v: Record<string, string> = {}
  parts.forEach((p) => (v[p.type] = p.value))
  return { date: `${v.year}-${v.month}-${v.day}`, minutes: Number(v.hour) * 60 + Number(v.minute) }
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatTime12(time24: string) {
  const [h, m] = time24.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function formatDateLong(dateStr: string) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialServiceId?: string
  initialAddOnId?: string
  initialShopItemId?: string
}

// 1-3 are the visible steps; 4 is the "you're booked" screen.
type Step = 1 | 2 | 3 | 4
const TOTAL_STEPS = 3

const stepTitles: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "YOUR DETAILS", subtitle: "Contact Info" },
  2: { title: "SERVICE & VEHICLE", subtitle: "Choose Service" },
  3: { title: "PICK A DATE & TIME", subtitle: "Schedule" },
  4: { title: "YOU'RE BOOKED", subtitle: "Complete" },
}

const vehicleMakes = [
  "Select make", "Audi", "BMW", "Chevrolet", "Ford", "Honda", "Hyundai",
  "Isuzu", "Kia", "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan",
  "Subaru", "Suzuki", "Toyota", "Volkswagen", "Other",
]

const vehicleTypes = [
  "Compact/Hatch",
  "Sedan Type",
  "APV/AUV",
  "SUV/Pick-up",
  "Lifted/Van/L300",
]

const yearRange = Array.from({ length: 30 }, (_, i) => (2026 - i).toString())

// Which add-ons can go with which service (some are already included in a pack).
const addOnVisibilityByService: Record<string, string[]> = {
  "essential-wash": ["headlight-restoration", "engine-bay-cleaning", "back-to-zero", "water-spot-treatment", "hydrophobic-treatment"],
  "premium-wash": ["headlight-restoration", "engine-bay-cleaning", "back-to-zero", "water-spot-treatment", "hydrophobic-treatment"],
  "bronze-pack": ["headlight-restoration", "engine-bay-cleaning", "water-spot-treatment", "deluxe-interior-detail", "hydrophobic-treatment"],
  "silver-pack": ["headlight-restoration", "engine-bay-cleaning", "deluxe-interior-detail", "hydrophobic-treatment"],
  "gold-pack": ["headlight-restoration", "deluxe-interior-detail", "hydrophobic-treatment"],
  "paint-correction": ["headlight-restoration", "engine-bay-cleaning", "back-to-zero", "deluxe-interior-detail", "hydrophobic-treatment"],
  "ceramic-coating-3yr": ["headlight-restoration", "engine-bay-cleaning", "back-to-zero", "deluxe-interior-detail"],
  "ceramic-coating-5yr": ["headlight-restoration", "engine-bay-cleaning", "back-to-zero", "deluxe-interior-detail"],
}

type AddOn = {
  kind: "addon" | "merch"
  id: string
  name: string
  price: number
  durationMinutes: number
}

export function BookingModal({ isOpen, onClose, initialServiceId, initialAddOnId, initialShopItemId }: BookingModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [pricingLoaded, setPricingLoaded] = useState(false)
  const [allAddOns, setAllAddOns] = useState<AddOn[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [selectedServices, setSelectedServices] = useState<string[]>(initialServiceId ? [initialServiceId] : [])
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialAddOnId ? [initialAddOnId] : [])
  const [vehicleMake, setVehicleMake] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleYear, setVehicleYear] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState("")
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null)
  const [submitNotice, setSubmitNotice] = useState("")
  const dateStripRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Load add-on names/prices
  useEffect(() => {
    async function loadPricingData() {
      try {
        const res = await fetch("/api/pricing")
        const data = await res.json()
        setAllAddOns([
          ...(data.addOns || []).map((addon: any) => ({
            kind: "addon" as const,
            id: addon.slug,
            name: addon.name,
            price: addon.effective_price ?? 0,
            durationMinutes: addon.duration_minutes ?? 0,
          })),
          // Merch from the Shop section can be added to a booking too
          ...(data.shopItems || []).map((item: any) => ({
            kind: "merch" as const,
            id: item.slug,
            name: item.name,
            price: item.effective_price ?? 0,
            durationMinutes: 0,
          })),
        ])
      } catch (err) {
        console.error("Failed to load pricing data:", err)
      } finally {
        setPricingLoaded(true)
      }
    }
    loadPricingData()
  }, [])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [step, isOpen])

  // Pre-select whatever the customer clicked "Book" on
  useEffect(() => {
    if (!isOpen) return
    if (initialServiceId) {
      setSelectedServices((prev) => (prev.includes(initialServiceId) ? prev : [...prev, initialServiceId]))
    }
    const extras = [initialAddOnId, initialShopItemId].filter((id): id is string => Boolean(id))
    if (extras.length > 0) {
      setSelectedAddOns((prev) => [...prev, ...extras.filter((id) => !prev.includes(id))])
    }
  }, [isOpen, initialServiceId, initialAddOnId, initialShopItemId])

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const bookableServices = services.filter(
    (service) => service.prices && Object.keys(service.prices).length > 0,
  )
  // Customers can pick more than one service
  const selectedServicesData = selectedServices
    .map((id) => bookableServices.find((s) => s.id === id))
    .filter((s): s is (typeof bookableServices)[number] => Boolean(s))
  const servicesTitle = selectedServicesData.map((s) => s.title).join(" + ")

  const priceFor = (service: (typeof bookableServices)[number]): number | undefined =>
    vehicleType ? service.prices?.[vehicleType as keyof typeof service.prices] : service.priceValue

  // An add-on is allowed if any picked service allows it
  const isAddOnAllowed = (id: string) => {
    if (allAddOns.find((a) => a.id === id)?.kind === "merch") return true
    if (selectedServices.length === 0) return true
    return selectedServices.some((sid) => {
      const allowed = addOnVisibilityByService[sid]
      return !allowed || allowed.includes(id)
    })
  }
  const chosenAddOns = selectedAddOns
    .map((id) => allAddOns.find((a) => a.id === id))
    .filter((a): a is AddOn => Boolean(a))
  const activeAddOns = chosenAddOns.filter((a) => isAddOnAllowed(a.id))
  const blockedAddOns = chosenAddOns.filter((a) => !isAddOnAllowed(a.id))

  // Add-ons (not merch) can be booked on their own, without a service
  const bookedAddOns = activeAddOns.filter((a) => a.kind === "addon")
  const isAddOnOnly = selectedServicesData.length === 0 && bookedAddOns.length > 0
  const bookingTitle = isAddOnOnly ? bookedAddOns.map((a) => a.name).join(" + ") : servicesTitle

  const servicesPrice = selectedServicesData.reduce((sum, s) => sum + (priceFor(s) || 0), 0)

  const serviceUnavailable =
    pricingLoaded &&
    (selectedServicesData.length !== selectedServices.length ||
      selectedServicesData.some((s) => priceFor(s) === undefined))

  const toggleService = (id: string) =>
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const calculateTotal = () =>
    servicesPrice + activeAddOns.reduce((sum, a) => sum + a.price, 0)

  const calculateEstimatedDuration = () =>
    selectedServicesData.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) + activeAddOns.reduce((sum, a) => sum + a.durationMinutes, 0)

  const formatCurrency = (value: number | undefined) => {
    if (!value || isNaN(value)) return "₱0"
    return `₱${value.toLocaleString()}`
  }

  const formatDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} mins`
    if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
    return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`
  }

  const vehicleLabel = [vehicleMake !== "Select make" ? vehicleMake : "", vehicleModel, vehicleYear]
    .filter(Boolean)
    .join(" ")

  // Dates customers can pick: today (Manila) through the booking window
  const today = manilaNow().date
  const dateOptions = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i))

  // Load available times whenever the date (or what's being booked) changes
  const availabilityKey = [
    selectedDate,
    selectedServicesData.map((s) => s.title).join(","),
    activeAddOns.filter((a) => a.kind === "addon").map((a) => a.name).join(","),
  ].join("|")

  useEffect(() => {
    if (step !== 3 || !selectedDate) return
    let cancelled = false
    const load = async () => {
      setLoadingSlots(true)
      setSlotError("")
      setSelectedTime("")
      try {
        const params = new URLSearchParams()
        params.set("date", selectedDate)
        params.set("serviceTitles", selectedServicesData.map((s) => s.title).join(","))
        const addonNames = activeAddOns.filter((a) => a.kind === "addon").map((a) => a.name.split("(")[0].trim())
        if (addonNames.length > 0) params.set("addons", addonNames.join(","))
        const res = await fetch(`/api/availability?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Couldn't load times.")
        // The API returns plain "HH:MM" strings when the calendar isn't reachable
        const list: Slot[] = (Array.isArray(data.slots) ? data.slots : []).map((x: any) =>
          typeof x === "string" ? { time: x, available: true } : x,
        )
        if (!cancelled) setSlots(list)
      } catch (err) {
        if (!cancelled) {
          setSlots([])
          setSlotError(err instanceof Error ? err.message : "Couldn't load times.")
        }
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, availabilityKey])

  // Pick today by default when the customer reaches step 3
  useEffect(() => {
    if (step === 3 && !selectedDate) setSelectedDate(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Same-day times need at least MIN_NOTICE_MINUTES notice
  const isPastSlot = (time: string) => {
    if (selectedDate !== today) return false
    const [h, m] = time.split(":").map(Number)
    return h * 60 + m < manilaNow().minutes + MIN_NOTICE_MINUTES
  }
  const visibleSlots = slots.filter((slot) => !isPastSlot(slot.time))
  const selectedSlot = visibleSlots.find((s) => s.time === selectedTime)

  const scrollDates = (dir: number) => {
    dateStripRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" })
  }

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          serviceTitle: bookingTitle,
          serviceTitles: selectedServicesData.map((s) => s.title),
          serviceBasePrice: servicesPrice,
          vehicle: { make: vehicleMake, model: vehicleModel, year: vehicleYear, type: vehicleType },
          addons: activeAddOns.map((a) => ({ name: a.name, price: a.price })),
          appointmentDate: selectedDate,
          appointmentTime: selectedSlot.time,
          totalAmount: calculateTotal(),
          overnight: Boolean(selectedSlot.overnight),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Couldn't book this time. Please pick another.")
      setScheduleLabel(`${formatDateLong(selectedDate)} at ${formatTime12(selectedSlot.time)}`)
      if (result?.emailSent === false) {
        setSubmitNotice("You're booked. Your confirmation email may take a little longer to arrive.")
      }
      setStep(4)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Couldn't book this time. Please pick another.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setName("")
    setEmail("")
    setPhone("")
    setSelectedServices([])
    setSelectedAddOns([])
    setVehicleMake("")
    setVehicleModel("")
    setVehicleYear("")
    setVehicleType("")
    setSelectedDate("")
    setSelectedTime("")
    setSlots([])
    setSlotError("")
    setSubmitError("")
    setIsSubmitting(false)
    setScheduleLabel(null)
    setSubmitNotice("")
    onClose()
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return phone.trim().length >= 10 && name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim())
      case 2:
        return (
          (selectedServices.length > 0 || bookedAddOns.length > 0) &&
          !serviceUnavailable &&
          vehicleMake !== "" &&
          vehicleMake !== "Select make" &&
          vehicleType !== ""
        )
      default:
        return false
    }
  }

  const handleContinue = () => {
    if (!canProceed()) return

    // Save the lead in HubSpot right away (after step 1), then update it with
    // the vehicle after step 2, so nobody is lost if they leave before booking.
    if (step === 1 || step === 2) {
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          ...(step === 2
            ? { vehicle: { make: vehicleMake, model: vehicleModel, year: vehicleYear, type: vehicleType } }
            : {}),
        }),
      }).catch((err) => console.error("Lead capture failed:", err))
    }

    setStep((prev) => (prev + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1 && step < 4) setStep((prev) => (prev - 1) as Step)
  }

  const removeAddOn = (id: string) => setSelectedAddOns((prev) => prev.filter((a) => a !== id))

  const priceBreakdown = [
    ...selectedServicesData.map((s) => ({ label: s.title, value: formatCurrency(priceFor(s)) })),
    ...activeAddOns.map((a) => ({ label: `+ ${a.name}`, value: formatCurrency(a.price) })),
  ]

  const inputClass =
    "w-full px-4 py-4 text-lg border-2 border-[#D4A843] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 text-gray-900 placeholder-gray-400"

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            className={`relative bg-white rounded-2xl w-full ${
              step === 3 ? "max-w-xl" : "max-w-lg"
            } max-h-[92vh] overflow-auto shadow-2xl transition-[max-width] duration-300`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-gray-900">{stepTitles[step].title}</h2>
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {step <= TOTAL_STEPS && (
                <>
                  <p className="text-gray-500 text-sm">
                    Step {step} of {TOTAL_STEPS} — {stepTitles[step].subtitle}
                  </p>
                  <div className="flex gap-2 mt-4">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          s <= step ? "bg-[#D4A843]" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Selected service + price summary */}
              {(selectedServicesData.length > 0 || isAddOnOnly) && step === 3 && vehicleType && (
                <div className="mt-4 p-3 rounded-lg border-2 border-[#D4A843]/30 bg-[#D4A843]/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{bookingTitle}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {vehicleType}
                        {activeAddOns.length > 0 &&
                          ` · ${activeAddOns.length} extra${activeAddOns.length > 1 ? "s" : ""}`}
                        {` · ${formatDuration(calculateEstimatedDuration())}`}
                      </p>
                    </div>
                    <Popover>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D4A843] font-bold">{formatCurrency(calculateTotal())}</span>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="p-2 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors shadow-sm"
                            aria-label="Show price details"
                          >
                            <Info className="w-4 h-4 text-gray-600" />
                          </button>
                        </PopoverTrigger>
                      </div>
                      <PopoverContent side="bottom" align="end" sideOffset={12} className="w-80 p-0 overflow-hidden">
                        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
                          <div className="px-5 py-5">
                            <p className="text-lg font-bold text-gray-900">Price Breakdown</p>
                            <p className="text-sm text-gray-500 mt-1">For a {vehicleType}</p>
                          </div>
                          <div className="px-5 pb-4 space-y-3 text-sm">
                            {priceBreakdown.map((item) => (
                              <div key={item.label} className="flex justify-between items-center">
                                <span className="font-medium text-gray-900">{item.label}</span>
                                <span className={`font-semibold ${item.label.startsWith("+ ") ? "text-emerald-600" : "text-[#D4A843]"}`}>
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="font-semibold text-gray-900">Estimated Total</span>
                              <span className="font-bold text-[#D4A843]">{formatCurrency(calculateTotal())}</span>
                            </div>
                            <p className="text-xs text-gray-500">Prices are estimates. Final price confirmed on arrival.</p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Contact details */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Your details</h3>
                      <p className="text-gray-500 text-sm">We&apos;ll send your booking confirmation here.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" autoComplete="name" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 000 0000" autoComplete="tel" className={inputClass} />
                    </div>
                    <p className="text-gray-400 text-xs text-center">
                      By continuing you agree to receive texts & calls about our services.
                    </p>
                  </motion.div>
                )}

                {/* Step 2: Service + vehicle */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {/* Service */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Select your services</h3>
                        <p className="text-gray-500 text-sm">
                          {bookedAddOns.length > 0
                            ? "Pick one or more, or skip this if you only want add-ons."
                            : "Pick one or more. Tap again to remove."}
                        </p>
                      </div>
                      {serviceUnavailable && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          One of your picked services is unavailable for this vehicle. Please remove it or choose another.
                        </div>
                      )}
                      {bookableServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                            selectedServices.includes(service.id) ? "border-[#D4A843] bg-[#D4A843]/5" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-lg overflow-hidden ${selectedServices.includes(service.id) ? "ring-2 ring-[#D4A843]" : ""}`}>
                                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{service.title}</div>
                                <div className="flex items-baseline gap-2 text-sm text-gray-500">
                                  <span>Starting at</span>
                                  {service.apiPricing?.["Compact/Hatch"]?.active_promo_label ? (
                                    <>
                                      <span className="font-semibold text-gray-400 line-through">
                                        ₱{service.apiPricing["Compact/Hatch"].price.toLocaleString()}
                                      </span>
                                      <span className="font-bold text-[#D4A843]">{service.price}</span>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-gray-900">{service.price}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedServices.includes(service.id) && <Check className="w-5 h-5 text-[#D4A843]" />}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Add-ons: tap to add as many as you like */}
                    {allAddOns.some((a) => a.kind === "addon") && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-bold text-gray-700 tracking-wider">ADD-ONS (OPTIONAL)</p>
                          <p className="text-gray-500 text-xs mt-0.5">Tap to add. Pick as many as you like.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {allAddOns
                            .filter((a) => a.kind === "addon" && isAddOnAllowed(a.id))
                            .map((a) => {
                              const on = selectedAddOns.includes(a.id)
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => (on ? removeAddOn(a.id) : setSelectedAddOns((prev) => [...prev, a.id]))}
                                  aria-pressed={on}
                                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-all ${
                                    on
                                      ? "border-[#D4A843] bg-[#D4A843]/10 text-gray-900"
                                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                                  }`}
                                >
                                  {on ? <Check className="w-3.5 h-3.5 text-[#D4A843]" /> : <span className="text-gray-400">+</span>}
                                  {a.name}
                                  <span className="text-[#D4A843]">₱{a.price.toLocaleString()}</span>
                                </button>
                              )
                            })}
                        </div>
                        {blockedAddOns.length > 0 && selectedServicesData.length > 0 && (
                          <p className="text-xs text-amber-700">
                            {blockedAddOns.map((a) => a.name).join(", ")} {blockedAddOns.length > 1 ? "aren't" : "isn't"} available with{" "}
                            {servicesTitle} (it may already be included), so it won&apos;t be added.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Merch picked from the Shop section */}
                    {activeAddOns.some((a) => a.kind === "merch") && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-700 tracking-wider">MERCH IN YOUR BOOKING</p>
                        <div className="flex flex-wrap gap-2">
                          {activeAddOns
                            .filter((a) => a.kind === "merch")
                            .map((a) => (
                              <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-[#D4A843] bg-[#D4A843]/10 px-3 py-1.5 text-sm font-semibold text-gray-900">
                                {a.name} <span className="text-[#D4A843]">+₱{a.price.toLocaleString()}</span>
                                <button type="button" onClick={() => removeAddOn(a.id)} aria-label={`Remove ${a.name}`} className="text-gray-500 hover:text-gray-900">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Vehicle */}
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 pt-4">Your vehicle</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">
                            MAKE <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={vehicleMake}
                            onChange={(e) => setVehicleMake(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-[#D4A843] rounded-xl focus:outline-none text-gray-900 bg-white cursor-pointer"
                          >
                            {vehicleMakes.map((make) => (
                              <option key={make} value={make}>{make}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">YEAR</label>
                          <select
                            value={vehicleYear}
                            onChange={(e) => setVehicleYear(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4A843] text-gray-900 bg-white cursor-pointer"
                          >
                            <option value="">Select year</option>
                            {yearRange.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">MODEL</label>
                        <input
                          type="text"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          placeholder="e.g. Vios (optional)"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4A843] text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700 tracking-wider mb-2">
                          VEHICLE TYPE <span className="text-red-500">*</span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {vehicleTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setVehicleType(type)}
                              className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                                vehicleType === type ? "border-[#D4A843] bg-[#D4A843]/5 text-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {(selectedServicesData.length > 0 || isAddOnOnly) && vehicleType && !serviceUnavailable && (
                          <div className="mt-3 rounded-xl border border-[#D4A843]/30 bg-[#D4A843]/5 px-4 py-3 text-sm text-gray-700 space-y-1">
                            {selectedServicesData.map((s) => {
                              const tier = s.apiPricing?.[vehicleType]
                              return (
                                <div key={s.id} className="flex justify-between gap-3">
                                  <span>{s.title}</span>
                                  <span>
                                    {tier?.active_promo_label && (
                                      <span className="mr-2 text-gray-400 line-through">₱{tier.price.toLocaleString()}</span>
                                    )}
                                    <span className="font-bold text-[#D4A843]">{formatCurrency(priceFor(s))}</span>
                                  </span>
                                </div>
                              )
                            })}
                            {activeAddOns.map((a) => (
                              <div key={a.id} className="flex justify-between gap-3">
                                <span>+ {a.name}</span>
                                <span className="font-bold text-[#D4A843]">{formatCurrency(a.price)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between gap-3 border-t border-[#D4A843]/30 pt-1 font-semibold text-gray-900">
                              <span>Estimated total ({vehicleType})</span>
                              <span className="text-[#D4A843]">{formatCurrency(calculateTotal())}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Date & time */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {/* Date picker */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Pick a date</h3>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => scrollDates(-1)} aria-label="Earlier dates" className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-700 hover:border-[#D4A843]">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => scrollDates(1)} aria-label="Later dates" className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-700 hover:border-[#D4A843]">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div ref={dateStripRef} className="flex gap-2 overflow-x-auto pb-2 snap-x [scrollbar-width:thin]">
                        {dateOptions.map((d) => {
                          const dt = new Date(`${d}T12:00:00Z`)
                          const selected = d === selectedDate
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setSelectedDate(d)}
                              aria-pressed={selected}
                              className={`snap-start shrink-0 w-[68px] rounded-2xl border-2 py-3 text-center transition-all ${
                                selected ? "border-[#D4A843] bg-[#D4A843] text-gray-900" : "border-gray-200 bg-white text-gray-900 hover:border-[#D4A843]/60"
                              }`}
                            >
                              <div className={`text-xs font-bold uppercase ${selected ? "text-gray-900" : "text-gray-500"}`}>
                                {d === today ? "Today" : dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                              </div>
                              <div className="text-2xl font-black leading-tight">{dt.getUTCDate()}</div>
                              <div className={`text-xs font-semibold uppercase ${selected ? "text-gray-900" : "text-gray-500"}`}>
                                {dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    {selectedDate && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Pick a time</h3>
                        <p className="text-sm text-gray-500 mb-3">
                          {formatDateLong(selectedDate)} · Philippine time · about {formatDuration(calculateEstimatedDuration())}
                        </p>
                        {loadingSlots ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="h-[76px] rounded-xl bg-gray-100 animate-pulse" />
                            ))}
                          </div>
                        ) : slotError ? (
                          <p className="text-sm text-red-600">{slotError}</p>
                        ) : visibleSlots.length === 0 ? (
                          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                            No times left on this day. Please pick another date.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {visibleSlots.map((slot) => {
                              const selected = selectedTime === slot.time
                              const left = slot.spotsLeft ?? (slot.available ? 1 : 0)
                              const full = !slot.available
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={full}
                                  onClick={() => setSelectedTime(slot.time)}
                                  aria-pressed={selected}
                                  className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
                                    selected
                                      ? "border-[#D4A843] bg-[#D4A843]/10"
                                      : full
                                      ? "border-gray-100 bg-gray-50 cursor-not-allowed"
                                      : "border-gray-200 bg-white hover:border-[#D4A843]/60"
                                  }`}
                                >
                                  <div className={`text-base font-bold ${full ? "text-gray-400" : "text-gray-900"}`}>{formatTime12(slot.time)}</div>
                                  <div
                                    className={`mt-1 text-xs font-semibold ${
                                      full ? "text-gray-400" : left === 1 ? "text-amber-600" : "text-emerald-600"
                                    }`}
                                  >
                                    {full
                                      ? slot.reason === "Exceeds operating hours"
                                        ? "Too late to finish"
                                        : "Fully booked"
                                      : `${left} spot${left === 1 ? "" : "s"} left`}
                                  </div>
                                  {!full && (
                                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                                      <Clock className="w-3 h-3" />
                                      {slot.overnight ? "Next-day pickup" : slot.completion ? `Done by ${formatTime12(slot.completion)}` : ""}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {selectedSlot?.overnight && (
                          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            This job runs past closing, so your car will be ready for pickup the next day.
                          </p>
                        )}
                        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Done */}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <p className="text-gray-500">We&apos;ve emailed your confirmation. See you at the shop!</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                      {!isAddOnOnly && (
                        <Row label={selectedServicesData.length > 1 ? "Services" : "Service"} value={servicesTitle} />
                      )}
                      {activeAddOns.length > 0 && <Row label={isAddOnOnly ? "Add-ons" : "Extras"} value={activeAddOns.map((a) => a.name).join(", ")} />}
                      <Row label="Vehicle" value={vehicleLabel || vehicleType} />
                      {scheduleLabel && <Row label="Schedule" value={scheduleLabel} />}
                      <Row label="Estimated Duration" value={formatDuration(calculateEstimatedDuration())} />
                      <Row label="Phone" value={phone} />
                      <div className="pt-3 border-t border-gray-200 flex justify-between">
                        <span className="text-gray-900 font-bold">Estimated Total</span>
                        <span className="font-bold text-[#D4A843]">{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                    {submitNotice && <p className="text-sm text-amber-700">{submitNotice}</p>}
                    <p className="text-sm text-gray-400">Questions? Call us at 0917-376-3348</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-100">
              {step < 3 ? (
                <div className="flex items-center gap-4">
                  {step > 1 && (
                    <button onClick={handleBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium">
                      <ChevronLeft className="w-4 h-4" />
                      BACK
                    </button>
                  )}
                  <motion.button
                    onClick={handleContinue}
                    disabled={!canProceed()}
                    className={`flex-1 py-4 rounded-full font-bold text-lg transition-all ${
                      canProceed() ? "bg-[#D4A843] hover:bg-[#D4A843]/90 text-gray-900" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={canProceed() ? { scale: 1.02 } : {}}
                    whileTap={canProceed() ? { scale: 0.98 } : {}}
                  >
                    {step === 2 ? "PICK A DATE →" : "CONTINUE →"}
                  </motion.button>
                </div>
              ) : step === 3 ? (
                <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium">
                    <ChevronLeft className="w-4 h-4" />
                    BACK
                  </button>
                  <motion.button
                    onClick={handleConfirmBooking}
                    disabled={!selectedSlot || isSubmitting}
                    className={`flex-1 py-4 rounded-full font-bold text-lg transition-all ${
                      selectedSlot && !isSubmitting ? "bg-[#D4A843] hover:bg-[#D4A843]/90 text-gray-900" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={selectedSlot && !isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={selectedSlot && !isSubmitting ? { scale: 0.98 } : {}}
                  >
                    {isSubmitting ? "BOOKING..." : selectedSlot ? `BOOK ${formatTime12(selectedSlot.time)} →` : "PICK A TIME"}
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={handleClose}
                  className="w-full py-4 rounded-full font-bold text-lg bg-[#ED0407] hover:bg-[#ED0407]/90 text-white transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  DONE
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  )
}
