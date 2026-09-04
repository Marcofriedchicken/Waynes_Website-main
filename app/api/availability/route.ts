import { NextResponse } from "next/server"
import { getCalendarClient, getCalendarId } from "@/lib/google-calendar"
import { getSheetsClient, getSheetId } from "@/lib/google-sheets"
import {
  OPERATING_HOURS,
  TIMEZONE,
  POOLS,
  computeTotalDurationMinutes,
  getPoolIdForService,
  isCeramicService,
  isPaintCorrection,
} from "@/lib/services.config"

const GOOGLE_ENV_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_CALENDAR_ID",
]

function toIso(dateStr: string, time: string) {
  return `${dateStr}T${time}:00+08:00`
}

function toMs(dateStr: string) {
  return new Date(dateStr).getTime()
}

function overlapsIso(startA: string, endA: string, startB: string, endB: string) {
  return toMs(startA) < toMs(endB) && toMs(startB) < toMs(endA)
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").toLowerCase().trim()
}

function findMatchedService(summary: string) {
  const normalizedSummary = normalizeText(summary)
  const allServices = [...POOLS.A.services, ...POOLS.B.services]
  return allServices.find((service) => normalizedSummary.includes(service.toLowerCase())) || null
}

function getEventDateTime(value: any) {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object") return value.dateTime || value.date || null
  return null
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function getRelativeDate(dateStr: string, offsetDays: number) {
  const date = new Date(`${dateStr}T00:00:00+08:00`)
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}

function toManilaIso(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const values = parts.reduce((acc: Record<string, string>, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+08:00`
}

function generateDaySlots() {
  const slots: string[] = []
  const { openHour, closeHour } = OPERATING_HOURS
  for (let h = openHour; h <= closeHour; h++) {
    slots.push(`${pad(h)}:00`)
    slots.push(`${pad(h)}:30`)
  }
  // dedupe and sort
  return Array.from(new Set(slots)).sort()
}

async function fetchCalendarEvents(calendar: any, calendarId: string, date: string) {
  const dayStart = `${date}T00:00:00+08:00`
  const dayEnd = `${date}T23:59:59+08:00`
  const res = await calendar.events.list({
    calendarId,
    timeMin: dayStart,
    timeMax: dayEnd,
    singleEvents: true,
    orderBy: "startTime",
  })
  return res.data.items || []
}

async function fetchSheetEvents(date: string) {
  try {
    const sheets = getSheetsClient()
    const sheetId = getSheetId()
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Sheet1!A:K" })
    const rows = res.data.values || []
    // Sheet columns in appendBookingToSheet: bookingId, dateSubmitted, customerName, customerEmail, customerPhone, service, addons, totalAmount, vehicle, appointmentDate, appointmentTime
    const events: Array<{ start: string; end: string; summary?: string }> = []
    for (const row of rows) {
      const appointmentDate = row[9]
      const appointmentTime = row[10]
      const service = row[5]
      if (!appointmentDate || !appointmentTime) continue
      // Try to parse "MMMM dd, yyyy" + "h:mm a"
      const dt = new Date(`${appointmentDate} ${appointmentTime} GMT+0800`)
      if (isNaN(dt.getTime())) continue
      const yr = dt.getFullYear()
      const mo = pad(dt.getMonth() + 1)
      const day = pad(dt.getDate())
      const hour = pad(dt.getHours())
      const minute = pad(dt.getMinutes())
      const start = `${yr}-${mo}-${day}T${hour}:${minute}:00+08:00`
      // We don't have duration in sheet reliably here; skip end and leave minimal 1hr end to prevent blocking everything
      const endDate = new Date(dt.getTime() + 60 * 60 * 1000)
      const endYr = endDate.getFullYear()
      const endMo = pad(endDate.getMonth() + 1)
      const endDay = pad(endDate.getDate())
      const endHour = pad(endDate.getHours())
      const endMinute = pad(endDate.getMinutes())
      const end = `${endYr}-${endMo}-${endDay}T${endHour}:${endMinute}:00+08:00`
      events.push({ start, end, summary: service })
    }
    return events
  } catch (err) {
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const serviceTitle = searchParams.get("serviceTitle") || ""
    const addonsParam = searchParams.get("addons") || ""
    const addonNames = addonsParam ? addonsParam.split(",").map((s) => decodeURIComponent(s)) : []

    if (!date) {
      return NextResponse.json({ error: "Missing date query parameter." }, { status: 400 })
    }

    const totalDuration = computeTotalDurationMinutes(serviceTitle, addonNames)
    const poolId = getPoolIdForService(serviceTitle)
    const isCeramic = isCeramicService(serviceTitle)
    const isPaint = isPaintCorrection(serviceTitle)

    const hasGoogleConfig = GOOGLE_ENV_KEYS.every((key) => Boolean(process.env[key]))
    const prevDate = getRelativeDate(date, -1)
    const nextDayMorningIso = `${date}T07:00:00+08:00`
    const nextDayNoonIso = `${date}T12:00:00+08:00`
    const prevDayCloseIso = `${prevDate}T${pad(OPERATING_HOURS.closeHour)}:00:00+08:00`

    let events: any[] = []
    const dayEvents: any[] = []
    const prevDayEvents: any[] = []

    if (hasGoogleConfig) {
      const calendar = getCalendarClient()
      const calendarId = getCalendarId()
      dayEvents.push(...await fetchCalendarEvents(calendar, calendarId, date))
      if (poolId === "B") {
        prevDayEvents.push(...await fetchCalendarEvents(calendar, calendarId, prevDate))
      }
    } else {
      // If calendar not configured try to read bookings from sheets
      try {
        dayEvents.push(...await fetchSheetEvents(date))
        if (poolId === "B") {
          prevDayEvents.push(...await fetchSheetEvents(prevDate))
        }
      } catch (err) {
        // fallback: show default slots like before
        const defaultSlots = generateDaySlots()
        return NextResponse.json({ date, slots: defaultSlots, fallback: true, message: "No calendar available." })
      }
    }

    events = [...dayEvents]
    if (poolId === "B") {
      for (const prevEvent of prevDayEvents) {
        const summary = prevEvent.summary || prevEvent.description || prevEvent["summary"] || ""
        const matchedService = findMatchedService(summary)
        const evPool = matchedService ? getPoolIdForService(matchedService) : null
        if (evPool !== "B") continue

        const evEnd = prevEvent.end?.dateTime || prevEvent.end || prevEvent.end?.date || null
        if (!evEnd) continue

        const evIsCeramic = isCeramicService(matchedService || "")
        if (!evIsCeramic) continue
        if (toMs(evEnd) <= toMs(prevDayCloseIso)) continue

        events.push({ start: nextDayMorningIso, end: nextDayNoonIso, summary: matchedService })
      }
    }

    const slots = generateDaySlots()
    const { openHour, closeHour } = OPERATING_HOURS
    const businessCloseIso = `${date}T${pad(closeHour)}:00:00+08:00`
    const businessCloseMs = toMs(businessCloseIso)

    const resultSlots = slots.map((slot) => {
      const startIso = toIso(date, slot)
      const startDate = new Date(`${date}T${slot}:00+08:00`)
      const completionDate = new Date(startDate.getTime() + totalDuration * 60 * 1000)
      const completionIso = toManilaIso(completionDate)

      // Determine overnight behavior
      const isOvernight = isCeramic && toMs(completionIso) > businessCloseMs

      // 6:00 PM grace rule
      const [slotHourStr, slotMinStr] = slot.split(":")
      const slotHour = Number(slotHourStr)
      const slotMin = Number(slotMinStr)

      // If duration > 80 mins, last allowed slot is 17:00
      if (totalDuration > 80 && (slotHour >= 18)) {
        return { time: slot, available: false, reason: "Exceeds operating hours" }
      }

      // If completion exceeds close and not overnight-allowed and not the 6pm grace allowed case, mark unavailable
      const isSixPmGrace = slotHour === 18 && slotMin === 0 && ( (poolId === "A") || isPaint ) && totalDuration <= 80
      if (!isOvernight && !isSixPmGrace && completionDate.getTime() > new Date(`${date}T${pad(closeHour)}:00:00+08:00`).getTime()) {
        return { time: slot, available: false, reason: "Exceeds operating hours" }
      }

      // For overlap checks, determine the effective occupied window for the proposed slot.
      const proposedStart = startIso
      const proposedEnd = isOvernight ? businessCloseIso : completionIso
      const proposedStartMs = toMs(proposedStart)
      const proposedEndMs = isOvernight ? businessCloseMs : toMs(completionIso)

      // Count overlapping events in the same pool.
      let overlappingCount = 0
      for (const ev of events) {
        const evStart = getEventDateTime(ev.start)
        const evEnd = getEventDateTime(ev.end)
        if (!evStart || !evEnd) continue

        // Determine existing event's pool by checking its summary for known service titles.
        const summary = ev.summary || ev.description || ev["summary"] || ""
        const matchedService = findMatchedService(summary)
        const evPool = matchedService ? getPoolIdForService(matchedService) : null
        if (poolId && evPool && evPool !== poolId) continue

        // Existing overnight ceramics reserve the bay through the end of the business day.
        const evIsCeramic = isCeramicService(matchedService || "")
        const evEndEffective =
          evIsCeramic && toMs(evEnd) > businessCloseMs
            ? businessCloseIso
            : evEnd

        const existingStartMs = toMs(evStart)
        const existingEndMs = toMs(evEndEffective)
        if (existingStartMs < proposedEndMs && proposedStartMs < existingEndMs) {
          overlappingCount += 1
        }
      }

      const poolCapacity = poolId === "A" ? POOLS.A.capacity : POOLS.B.capacity

      if (overlappingCount >= poolCapacity) {
        return { time: slot, available: false, reason: "No bays available" }
      }

      // Allowed slot
      if (isOvernight) {
        return { time: slot, available: true, overnight: true, completion: "Next-day pickup" }
      }

      // Format completion time hh:mm
      const compHours = String(completionDate.getHours()).padStart(2, "0")
      const compMins = String(completionDate.getMinutes()).padStart(2, "0")
      return { time: slot, available: true, overnight: false, completion: `${compHours}:${compMins}` }
    })

    return NextResponse.json({ date, slots: resultSlots })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load availability."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
