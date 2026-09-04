const TIMEZONE = 'Asia/Manila'
const OPERATING_HOURS = { openHour: 7, closeHour: 19 }
const POOLS = {
  A: {
    id: 'A',
    capacity: 3,
    services: ['Essentail Wash', 'Premium Wash', 'Bronze Pack', 'Silver Pack', 'Gold Pack', 'Elite Detail'],
  },
  B: {
    id: 'B',
    capacity: 2,
    services: ['Paint Correction', 'Diamond Ceramic', 'Titanium Ceramic Shield', 'Ceramic Coating 3yr', 'Ceramic Coating 5yr'],
  },
}
const isCeramicService = (s) => ['Diamond Ceramic', 'Titanium Ceramic Shield', 'Ceramic Coating 3yr', 'Ceramic Coating 5yr'].includes(s)
const getPoolIdForService = (s) => (POOLS.A.services.includes(s) ? 'A' : POOLS.B.services.includes(s) ? 'B' : null)
const toMs = (s) => new Date(s).getTime()
const pad = (n) => String(n).padStart(2, '0')
const getRelativeDate = (dateStr, offsetDays) => {
  const date = new Date(`${dateStr}T00:00:00+08:00`)
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const date = '2026-07-31'
const serviceTitle = 'Diamond Ceramic'
const totalDuration = 480
const poolId = getPoolIdForService(serviceTitle)
const prevDate = getRelativeDate(date, -1)
const nextDayMorningIso = `${date}T07:00:00+08:00`
const nextDayNoonIso = `${date}T12:00:00+08:00`
const prevDayCloseIso = `${prevDate}T${pad(OPERATING_HOURS.closeHour)}:00:00+08:00`
const businessCloseIso = `${date}T${pad(OPERATING_HOURS.closeHour)}:00:00+08:00`
const businessCloseMs = toMs(businessCloseIso)
const prevDayEvents = [
  { start: '2026-07-30T12:00:00+08:00', end: '2026-07-31T00:00:00+08:00', summary: 'Diamond Ceramic - Foo' },
  { start: '2026-07-30T13:00:00+08:00', end: '2026-07-31T01:00:00+08:00', summary: 'Diamond Ceramic - Bar' },
]
const events = [...[]]
if (poolId === 'B') {
  for (const prevEvent of prevDayEvents) {
    const summary = prevEvent.summary || prevEvent.description || ''
    const allServices = [...POOLS.A.services, ...POOLS.B.services]
    const matchedService = allServices.find((s) => summary && summary.includes(s))
    const evPool = matchedService ? getPoolIdForService(matchedService) : null
    if (evPool !== 'B') continue
    const evEnd = prevEvent.end || null
    if (!evEnd) continue
    const evIsCeramic = isCeramicService(summary || '')
    if (!evIsCeramic) continue
    if (toMs(evEnd) <= toMs(prevDayCloseIso)) continue
    events.push({ start: nextDayMorningIso, end: nextDayNoonIso, summary })
  }
}
const slots = []
for (let h = OPERATING_HOURS.openHour; h <= OPERATING_HOURS.closeHour; h++) {
  slots.push(`${pad(h)}:00`)
  slots.push(`${pad(h)}:30`)
}
const uniqueSlots = Array.from(new Set(slots)).sort()
const results = uniqueSlots.map((slot) => {
  const startIso = `${date}T${slot}:00+08:00`
  const startDate = new Date(startIso)
  const completionDate = new Date(startDate.getTime() + totalDuration * 60 * 1000)
  const completionIso = `${completionDate.getFullYear()}-${pad(completionDate.getMonth() + 1)}-${pad(completionDate.getDate())}T${pad(completionDate.getHours())}:${pad(completionDate.getMinutes())}:${pad(completionDate.getSeconds())}+08:00`
  const isOvernight = isCeramicService(serviceTitle) && toMs(completionIso) > businessCloseMs
  const proposedStartMs = toMs(startIso)
  const proposedEndMs = isOvernight ? businessCloseMs : toMs(completionIso)
  let overlappingCount = 0
  for (const ev of events) {
    const evStart = ev.start
    const evEnd = ev.end
    if (!evStart || !evEnd) continue
    const summary = ev.summary || ev.description || ''
    const allServices = [...POOLS.A.services, ...POOLS.B.services]
    const matchedService = allServices.find((s) => summary && summary.includes(s))
    const evPool = matchedService ? getPoolIdForService(matchedService) : null
    if (poolId && evPool && evPool !== poolId) continue
    const evIsCeramic = isCeramicService(summary || '')
    const evEndEffective = evIsCeramic && toMs(evEnd) > businessCloseMs ? businessCloseIso : evEnd
    const existingStartMs = toMs(evStart)
    const existingEndMs = toMs(evEndEffective)
    if (existingStartMs < proposedEndMs && proposedStartMs < existingEndMs) overlappingCount++
  }
  return { slot, available: overlappingCount < POOLS.B.capacity, overlappingCount, isOvernight }
})
console.log('events:', events)
console.log('results:', results.filter((r) => ['07:00', '07:30', '08:00', '09:00', '10:00', '11:00', '11:30', '12:00'].includes(r.slot)))
