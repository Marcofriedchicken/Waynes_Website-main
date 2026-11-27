"use client"

import { useEffect, useState } from "react"

// December promo. Everything promo-related on the site reads from here.
// After `endsAt` the banner, promo card and popup option hide themselves.
export const decemberPromo = {
  formUrl: "https://airtable.com/applY8zwbtyCiKysT/pag24OK5Lq4VRsPv2/form",
  endsAt: "2026-12-31T23:59:59+08:00", // Manila time
  slots: 20,
}

export function usePromoActive() {
  // Start hidden so server and browser render the same thing, then check the date.
  const [active, setActive] = useState(false)
  useEffect(() => {
    setActive(Date.now() < new Date(decemberPromo.endsAt).getTime())
  }, [])
  return active
}
