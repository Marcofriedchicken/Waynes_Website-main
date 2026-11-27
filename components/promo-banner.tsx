"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { decemberPromo, usePromoActive } from "@/lib/promo"

const DISMISS_KEY = "promo-banner-dismissed-dec-2026"

export function PromoBanner() {
  const active = usePromoActive()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true)
    } catch {}
  }, [])

  if (!active || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {}
  }

  return (
    <div className="relative bg-[#ED0407] text-white">
      <a
        href={decemberPromo.formUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-10 py-2 text-center text-xs sm:text-sm font-semibold hover:bg-black/10 transition-colors"
      >
        <span aria-hidden="true">🎁 </span>
        December only: <strong>FREE paint check</strong> + <strong>50% off</strong> Bronze, Silver &amp; Gold packs.{" "}
        <span className="hidden sm:inline">Only {decemberPromo.slots} slots — </span>
        <span className="underline underline-offset-2 whitespace-nowrap">Claim yours →</span>
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close promo banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
