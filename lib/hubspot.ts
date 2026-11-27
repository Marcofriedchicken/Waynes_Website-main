// Shared HubSpot helpers used by /api/leads (early lead capture)
// and /api/bookings (confirmed Calendly booking -> deal).

type HubSpotContactInput = {
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicle?: {
    make?: string
    model?: string
    year?: string
    type?: string
  }
}

type HubSpotDealInput = HubSpotContactInput & {
  serviceTitle: string
  serviceTitles?: string[]
  addons: { name: string }[]
  totalAmount: number
  // ISO timestamp of the appointment start, if known
  appointmentStartIso?: string | null
}

const SERVICE_MAP: Record<string, string> = {
  "Essential Wash": "essential_wash",
  "Premium Wash": "premium_wash",
  "Bronze Pack": "bronze_pack",
  "Silver Pack": "silver_pack",
  "Gold Pack": "gold_pack",
  "Paint Correction": "paint_correction",
  "Diamond Ceramic": "diamond_ceramic",
  "Titanium Ceramic Shield": "titanium_ceramic_shield",
}

function getHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) return null
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function contactProperties(input: HubSpotContactInput) {
  const props: Record<string, string> = {
    firstname: input.customerName?.trim().split(" ")[0] || "",
    lastname: input.customerName?.trim().split(" ").slice(1).join(" ") || "",
    email: input.customerEmail,
    phone: input.customerPhone,
  }
  if (input.vehicle?.make) props.car_make = input.vehicle.make
  if (input.vehicle?.model) props.car_model = input.vehicle.model
  if (input.vehicle?.year) props.car_year = input.vehicle.year
  return props
}

/**
 * Finds a contact by email and updates it, or creates a new one.
 * Returns the contact id, or null if HubSpot isn't configured / the call failed.
 */
export async function upsertHubSpotContact(input: HubSpotContactInput): Promise<string | null> {
  const headers = getHeaders()
  if (!headers || !input.customerEmail) return null

  try {
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers,
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: input.customerEmail }] }],
      }),
    })
    const searchData = await searchRes.json()
    const existingId: string | undefined = searchData.results?.[0]?.id

    if (existingId) {
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties: contactProperties(input) }),
      })
      return existingId
    }

    const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ properties: contactProperties(input) }),
    })
    const contactData = await contactRes.json()
    return contactData.id || null
  } catch (err) {
    console.error("HubSpot contact upsert failed:", err)
    return null
  }
}

/** Creates a deal for a confirmed booking and links it to the contact. */
export async function syncBookingToHubSpot(input: HubSpotDealInput) {
  const headers = getHeaders()
  if (!headers) return

  try {
    const contactId = await upsertHubSpotContact(input)

    const firstService = input.serviceTitles?.[0] || input.serviceTitle
    const properties: Record<string, string | number> = {
      dealname: `${input.customerName} — ${input.serviceTitle}`,
      amount: input.totalAmount,
      dealstage: "appointmentscheduled",
      pipeline: "default",
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      // HubSpot's "service" field holds one value, so it gets the first pick;
      // the deal name and "addons" field list everything.
      service: SERVICE_MAP[firstService] || firstService.toLowerCase().replace(/ /g, "_"),
      addons: [
        ...(input.serviceTitles && input.serviceTitles.length > 1 ? input.serviceTitles.slice(1) : []),
        ...input.addons.map((a) => a.name),
      ].join(", "),
      car_make: input.vehicle?.make || "",
      car_model: input.vehicle?.model || "",
      car_year: input.vehicle?.year || "",
    }
    if (input.appointmentStartIso) {
      properties.closedate = input.appointmentStartIso
    }

    const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
      method: "POST",
      headers,
      body: JSON.stringify({ properties }),
    })
    const dealData = await dealRes.json()

    if (contactId && dealData.id) {
      await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealData.id}/associations/contacts/${contactId}/3`,
        { method: "PUT", headers },
      )
    }

    console.log("✓ HubSpot synced - deal:", dealData.id || JSON.stringify(dealData))
  } catch (err) {
    console.error("HubSpot sync failed:", err)
  }
}
