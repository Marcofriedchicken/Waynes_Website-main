import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { Resend } from "resend"
import { getCalendarClient, getCalendarId } from "@/lib/google-calendar"
import {
  appendBookingToSheet,
  generateBookingId,
  formatAddons,
  formatVehicle,
  formatAppointmentDate,
  formatAppointmentTime,
  getSheetId,
} from "@/lib/google-sheets"

const defaultLogoUrl = "https://res.cloudinary.com/dbawywjzi/image/upload/f_auto,q_auto/w-logo_rsditi"

type Addon = {
  name: string
  price: number
}

type BookingPayload = {
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceTitle: string
  serviceBasePrice: number
  vehicle: {
    make: string
    model?: string
    year?: string
    type: string
  }
  addons: Addon[]
  appointmentDate: string
  appointmentTime: string
  totalAmount: number
  overnight?: boolean
}

const currency = (value: number) => `PHP ${value.toLocaleString()}`

function formatSlot(date: string, time: string) {
  const slotsDate = new Date(`${date}T${time}:00+08:00`)
  const formattedDate = slotsDate.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })
  return formattedDate
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes} mins`
  if (remainingMinutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes} mins`
}

const SERVICE_DURATIONS: Record<string, number> = {
  "Essential Wash": 35,
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

const ADDON_DURATIONS: Record<string, number> = {
  "Headlight Restoration": 120,
  "Engine Bay Cleaning": 30,
  "Back to Zero Sanitation": 5,
  "Water Spot Treatment": 10,
  "Hydrophobic Treatment": 10,
  "Deluxe Interior Detail": 30,
}

function normalizeAddonName(addonName: string) {
  return addonName.split("(")[0].trim()
}

function getServiceDuration(serviceTitle: string): number {
  return SERVICE_DURATIONS[serviceTitle] || 60
}

function getAddonDuration(addonName: string): number {
  const normalized = normalizeAddonName(addonName)
  return ADDON_DURATIONS[normalized] || 0
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB
}

async function syncToHubSpot(payload: BookingPayload) {
  try {
    const token = process.env.HUBSPOT_ACCESS_TOKEN
    if (!token) return

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    // Search for existing contact by email
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: payload.customerEmail,
          }]
        }]
      })
    })
    const searchData = await searchRes.json()

    let contactId: string | null = null

    if (searchData.results?.length > 0) {
      contactId = searchData.results[0].id
    } else {
      const contactRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: {
            firstname: payload.customerName?.split(' ')[0] || '',
            lastname: payload.customerName?.split(' ').slice(1).join(' ') || '',
            email: payload.customerEmail,
            phone: payload.customerPhone,
            car_make: payload.vehicle.make,
            car_model: payload.vehicle.model || '',
            car_year: payload.vehicle.year || '',
          }
        })
      })
      const contactData = await contactRes.json()
      contactId = contactData.id || null
    }

    // Create deal
    const serviceMap: Record<string, string> = {
  'Essential Wash': 'essential_wash',
  'Premium Wash': 'premium_wash',
  'Bronze Pack': 'bronze_pack',
  'Silver Pack': 'silver_pack',
  'Gold Pack': 'gold_pack',
  'Paint Correction': 'paint_correction',
  'Diamond Ceramic': 'diamond_ceramic',
  'Titanium Ceramic Shield': 'titanium_ceramic_shield',
  }
    
    const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: {
          dealname: `${payload.customerName} — ${payload.serviceTitle}`,
          amount: payload.totalAmount,
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          customer_name: payload.customerName,
          customer_email: payload.customerEmail,
          customer_phone: payload.customerPhone,
          service: serviceMap[payload.serviceTitle] || payload.serviceTitle.toLowerCase().replace(/ /g, '_'),
          addons: payload.addons.length > 0 ? payload.addons.map(a => a.name).join(', ') : '',
          car_make: payload.vehicle.make,
          car_model: payload.vehicle.model || '',
          car_year: payload.vehicle.year || '',
          closedate: new Date(`${payload.appointmentDate}T${payload.appointmentTime}:00+08:00`).toISOString(),
        }
      })
    })
    const dealData = await dealRes.json()
    console.log('Deal creation response:', JSON.stringify(dealData))

    // Associate deal with contact
    if (contactId && dealData.id) {
      await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealData.id}/associations/contacts/${contactId}/3`, {
        method: 'PUT',
        headers,
      })
    }

    console.log('✓ HubSpot synced - deal:', JSON.stringify(dealData))
  } catch (err) {
    console.error('HubSpot sync failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingPayload

    if (
      !payload.customerEmail ||
      !payload.customerPhone ||
      !payload.serviceTitle ||
      !payload.appointmentDate ||
      !payload.appointmentTime
    ) {
      return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 })
    }

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      BOOKING_OWNER_EMAIL,
      BOOKING_OWNER_EMAIL_ADDRESS,
      RESEND_API_KEY,
      RESEND_FROM_EMAIL,
      BUSINESS_LOGO_URL,
      NEXT_PUBLIC_SITE_URL,
      SITE_URL,
    } = process.env
    const FALLBACK_OWNER_EMAIL = "waynesdetailing2026@gmail.com"

    const addonsText =
      payload.addons.length > 0
        ? payload.addons.map((addon) => `- ${addon.name} (${currency(addon.price)})`).join("\n")
        : "None"

    const slotLabel = formatSlot(payload.appointmentDate, payload.appointmentTime)
    const serviceDuration = getServiceDuration(payload.serviceTitle)
    const addOnDuration = payload.addons
      .map((addon) => getAddonDuration(addon.name))
      .reduce((sum, minutes) => sum + minutes, 0)
    const totalDurationMinutes = serviceDuration + addOnDuration
    const durationLabel = formatDuration(totalDurationMinutes)

    const bookingText = [
      `Customer Name: ${payload.customerName || "N/A"}`,
      `Customer Email: ${payload.customerEmail}`,
      `Customer Phone: ${payload.customerPhone}`,
      "",
      `Vehicle: ${payload.vehicle.make} ${payload.vehicle.model || ""}`.trim(),
      `Year: ${payload.vehicle.year || "N/A"}`,
      `Service: ${payload.serviceTitle}`,
      `Add-ons:\n${addonsText}`,
      `Schedule: ${slotLabel}`,
      `Estimated Duration: ${durationLabel}`,
      payload.overnight ? `Overnight booking: Vehicle ready next day.` : null,
      `Total Amount: ${currency(payload.totalAmount)}`,
    ].join("\n")

    const resolvedLogoUrl = BUSINESS_LOGO_URL || defaultLogoUrl
    const logoHtml = `
      <div style="display:inline-block; text-align:center; margin:0 auto 12px;">
        <img src="${resolvedLogoUrl}" alt="Wayne's Detailing logo" style="height:72px; width:auto; display:block; margin:0 auto 8px;" />
        <div style="font-family:Arial,Helvetica,sans-serif; color:#ED0407; font-weight:800; font-size:18px; letter-spacing:0.14em; text-transform:uppercase;">WAYNE'S DETAILING</div>
        <div style="font-family:Arial,Helvetica,sans-serif; color:#F3F4F6; font-size:12px; letter-spacing:0.2em;">GET IT DONE</div>
      </div>
    `

    const emailShellStart = `
      <div style="background:#050505; padding:28px 14px; font-family:Arial,Helvetica,sans-serif; color:#F3F4F6;">
        <div style="max-width:640px; margin:0 auto; border:1px solid #262626; border-radius:16px; overflow:hidden; background:#111111;">
          <div style="padding:24px; text-align:center; background:linear-gradient(135deg,#111111 0%,#151515 60%,#1c1c1c 100%); border-bottom:1px solid #2a2a2a;">
            ${logoHtml}
    `

    const emailShellEnd = `
            <p style="margin:18px 0 0; color:#9CA3AF; font-size:13px;">Questions? Reply to this email or call <span style="color:#D4A843; font-weight:700;">0917-376-3348</span>.</p>
          </div>
        </div>
      </div>
    `

    const customerHtml = `
      ${emailShellStart}
            <p style="margin:0; color:#D4A843; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; font-weight:700;">Booking Confirmed</p>
            <h2 style="margin:8px 0 0; color:#FFFFFF; font-size:28px; line-height:1.2;">Thank you, ${payload.customerName || "there"}.</h2>
            <p style="margin:8px 0 0; color:#D1D5DB; font-size:14px;">Your appointment has been successfully scheduled.</p>
          </div>
          <div style="padding:20px;">
            <div style="border:1px solid #2F2F2F; border-radius:12px; padding:16px; background:#0F0F0F;">
              <p style="margin:0 0 8px; color:#D4A843; font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Booking Summary</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Vehicle:</strong> ${payload.vehicle.make} ${payload.vehicle.model || ""}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Year:</strong> ${payload.vehicle.year || "N/A"}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Service:</strong> ${payload.serviceTitle}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Add-ons:</strong> ${payload.addons.length > 0 ? "" : "None"}</p>
              ${payload.addons.length > 0 ? `<p style="margin:0 0 8px; white-space:pre-line; color:#FFFFFF;">${addonsText}</p>` : ""}
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Schedule:</strong> ${slotLabel}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Estimated Time:</strong> ${durationLabel}</p>
              ${payload.overnight ? `<div style="margin:8px 0; padding:10px; border-radius:8px; background:#FFF8E1; color:#6B4A00;">Your vehicle will be ready for pickup the following day. Our team will contact you to confirm your pickup time.</div>` : ""}
              <p style="margin:0; color:#D4A843; font-size:18px; font-weight:800;"><strong>Total:</strong> ${currency(payload.totalAmount)}</p>
            </div>
      ${emailShellEnd}
    `

    const ownerHtml = `
      ${emailShellStart}
            <p style="margin:0; color:#D4A843; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; font-weight:700;">New Booking Alert</p>
            <h2 style="margin:8px 0 0; color:#FFFFFF; font-size:28px; line-height:1.2;">${payload.serviceTitle}</h2>
            <p style="margin:8px 0 0; color:#D1D5DB; font-size:14px;">Customer: ${payload.customerName || "N/A"} · ${payload.customerPhone} · ${payload.customerEmail}</p>
          </div>
          <div style="padding:20px;">
            <div style="border:1px solid #2F2F2F; border-radius:12px; padding:16px; background:#0F0F0F;">
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Vehicle:</strong> ${payload.vehicle.make} ${payload.vehicle.model || ""}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Year:</strong> ${payload.vehicle.year || "N/A"}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Service:</strong> ${payload.serviceTitle}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Add-ons:</strong> ${payload.addons.length > 0 ? "" : "None"}</p>
              ${payload.addons.length > 0 ? `<p style="margin:0 0 8px; white-space:pre-line; color:#FFFFFF;">${addonsText}</p>` : ""}
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Schedule:</strong> ${slotLabel}</p>
              <p style="margin:0 0 8px;"><strong style="color:#FFFFFF;">Estimated Time:</strong> ${durationLabel}</p>
              ${payload.overnight ? `<div style="margin:8px 0; padding:10px; border-radius:8px; background:#FFF8E1; color:#6B4A00;">Overnight booking — vehicle will be ready next day.</div>` : ""}
              <p style="margin:0; color:#D4A843; font-size:18px; font-weight:800;"><strong>Total:</strong> ${currency(payload.totalAmount)}</p>
            </div>
      ${emailShellEnd}
    `

    const hasGoogleConfig =
      Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL) &&
      Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) &&
      Boolean(process.env.GOOGLE_CALENDAR_ID)

    let eventLink: string | null = null
    if (hasGoogleConfig) {
      try {
        const calendarId = getCalendarId()
        const calendar = getCalendarClient()
        const [startHourStr, startMinuteStr] = payload.appointmentTime.split(":")
        const startHour = Number(startHourStr)
        const startMinute = Number(startMinuteStr)

        const startDateTime = `${payload.appointmentDate}T${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00+08:00`

        const [year, month, day] = payload.appointmentDate.split("-").map(Number)
        const appointmentDateObj = new Date(year, month - 1, day)
        const endTotalMinutes = startHour * 60 + startMinute + totalDurationMinutes
        const endDayOffset = Math.floor(endTotalMinutes / 1440)
        const endMinuteOfDay = endTotalMinutes % 1440
        const endHour = Math.floor(endMinuteOfDay / 60)
        const endMinute = endMinuteOfDay % 60

        appointmentDateObj.setDate(appointmentDateObj.getDate() + endDayOffset)
        const endDate = `${appointmentDateObj.getFullYear()}-${String(appointmentDateObj.getMonth() + 1).padStart(2, "0")}-${String(appointmentDateObj.getDate()).padStart(2, "0")}`
        const endDateTime = `${endDate}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00+08:00`

        const dayStart = `${payload.appointmentDate}T00:00:00+08:00`
        const dayEnd = `${payload.appointmentDate}T23:59:59+08:00`
        const eventsResponse = await calendar.events.list({
          calendarId,
          timeMin: dayStart,
          timeMax: dayEnd,
          singleEvents: true,
          orderBy: 'startTime',
        })
        const events = eventsResponse.data.items || []

        const requestedHours = Math.ceil(totalDurationMinutes / 60)
        let isAvailable = true
        const appointmentStartHour = Number(payload.appointmentTime.split(":")[0])

        for (let hour = 0; hour < requestedHours; hour++) {
          const slotStartHour = appointmentStartHour + hour
          const slotStart = `${payload.appointmentDate}T${String(slotStartHour).padStart(2, "0")}:00:00+08:00`
          const slotEnd = `${payload.appointmentDate}T${String(slotStartHour + 1).padStart(2, "0")}:00:00+08:00`

          const overlappingEvents = events.filter((event) => {
            if (!event.start?.dateTime || !event.end?.dateTime) return false
            return slotStart < event.end.dateTime && slotEnd > event.start.dateTime
          })

          if (overlappingEvents.length >= 4) {
            isAvailable = false
            break
          }
        }

        if (!isAvailable) {
          return NextResponse.json({ error: "Selected time slot is not available for the full service duration." }, { status: 400 })
        }

        const event = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `${payload.serviceTitle} - ${payload.customerName}`,
            description: bookingText,
            start: {
              dateTime: startDateTime,
              timeZone: "Asia/Manila",
            },
            end: {
              dateTime: endDateTime,
              timeZone: "Asia/Manila",
            },
          },
        })
        eventLink = event.data.htmlLink || null
        console.log("✓ Google Calendar event created:", eventLink)
      } catch (calendarError) {
        const calendarErrorMsg = calendarError instanceof Error ? calendarError.message : "Unknown error"
        console.error("✗ Google Calendar API failed:", calendarErrorMsg)
      }
    } else {
      console.warn("⚠ Google Calendar not configured - skipping calendar sync")
    }

    const ownerEmail = BOOKING_OWNER_EMAIL || BOOKING_OWNER_EMAIL_ADDRESS || FALLBACK_OWNER_EMAIL
    const customerSubject = "Booking Confirmation - Wayne's Detailing"
    const ownerSubject = `New Booking: ${payload.serviceTitle} - ${payload.customerName || payload.customerPhone}`
    const customerText = `WAYNE'S DETAILING\nGET IT DONE\n\nBOOKING CONFIRMED\n\nThank you, ${payload.customerName || "there"}.\nYour appointment has been successfully scheduled.\n\n${bookingText}\n\nQuestions? Reply to this email or call 0917-376-3348.`

    let emailSent = false
    let ownerEmailSent = false
    let emailProvider = ""

    if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const customerEmailResult = await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: payload.customerEmail,
          subject: customerSubject,
          text: customerText,
          html: customerHtml,
        })
        if (!customerEmailResult.error) emailSent = true

        if (ownerEmail) {
          const ownerEmailResult = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: ownerEmail,
            replyTo: payload.customerEmail,
            subject: ownerSubject,
            text: bookingText,
            html: ownerHtml,
          })
          if (!ownerEmailResult.error) ownerEmailSent = true
        }

        emailProvider = "resend"

        const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
        if (hasGoogleSheetConfig) {
          const bookingId = generateBookingId()
          const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
          await appendBookingToSheet({
            bookingId,
            dateSubmitted: manilaTime,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone,
            service: payload.serviceTitle,
            addons: formatAddons(payload.addons),
            totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
            vehicle: formatVehicle(payload.vehicle),
            appointmentDate: formatAppointmentDate(payload.appointmentDate),
            appointmentTime: formatAppointmentTime(payload.appointmentTime),
          })
        }

        await syncToHubSpot(payload)

        return NextResponse.json({ ok: true, emailSent, ownerEmailSent, emailProvider: "resend", eventLink })
      } catch (resendError) {
        const errorMsg = resendError instanceof Error ? resendError.message : "Unknown error"
        console.error("✗ Resend API failed:", errorMsg)
      }
    }

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT),
          secure: Number(SMTP_PORT) === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        })

        const sends = [
          transporter.sendMail({
            from: SMTP_FROM,
            to: payload.customerEmail,
            subject: customerSubject,
            text: customerText,
            html: customerHtml,
          }),
        ]
        if (ownerEmail) {
          sends.push(
            transporter.sendMail({
              from: SMTP_FROM,
              to: ownerEmail,
              replyTo: payload.customerEmail,
              subject: ownerSubject,
              text: bookingText,
              html: ownerHtml,
            }),
          )
        }
        const results = await Promise.all(sends)
        emailSent = true
        ownerEmailSent = Boolean(ownerEmail && results.length > 1)
        emailProvider = "smtp"

        const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
        if (hasGoogleSheetConfig) {
          const bookingId = generateBookingId()
          const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
          await appendBookingToSheet({
            bookingId,
            dateSubmitted: manilaTime,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone,
            service: payload.serviceTitle,
            addons: formatAddons(payload.addons),
            totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
            vehicle: formatVehicle(payload.vehicle),
            appointmentDate: formatAppointmentDate(payload.appointmentDate),
            appointmentTime: formatAppointmentTime(payload.appointmentTime),
          })
        }

        await syncToHubSpot(payload)

        return NextResponse.json({ ok: true, emailSent: true, ownerEmailSent, emailProvider: "smtp", eventLink })
      } catch (smtpError) {
        const errorMsg = smtpError instanceof Error ? smtpError.message : "Unknown error"
        console.error("✗ SMTP failed:", errorMsg)
      }
    }

    const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
    if (hasGoogleSheetConfig) {
      const bookingId = generateBookingId()
      const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
      await appendBookingToSheet({
        bookingId,
        dateSubmitted: manilaTime,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        service: payload.serviceTitle,
        addons: formatAddons(payload.addons),
        totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
        vehicle: formatVehicle(payload.vehicle),
        appointmentDate: formatAppointmentDate(payload.appointmentDate),
        appointmentTime: formatAppointmentTime(payload.appointmentTime),
      })
    }

    await syncToHubSpot(payload)

    return NextResponse.json({
      ok: true,
      emailSent: false,
      ownerEmailSent: false,
      eventLink,
      message: "Booking saved, but no email provider is configured.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process booking."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}