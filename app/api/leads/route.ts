import { NextResponse } from "next/server"
import { upsertHubSpotContact } from "@/lib/hubspot"

// Called when the customer finishes the details steps, before they pick a
// time in Calendly. Saves them as a HubSpot contact so the lead isn't lost
// if they close the calendar without booking.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body?.customerEmail || !body?.customerPhone) {
      return NextResponse.json({ error: "Missing email or phone." }, { status: 400 })
    }

    const contactId = await upsertHubSpotContact({
      customerName: String(body.customerName || ""),
      customerEmail: String(body.customerEmail),
      customerPhone: String(body.customerPhone),
      vehicle: body.vehicle,
    })

    return NextResponse.json({ ok: true, synced: Boolean(contactId) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save lead."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
