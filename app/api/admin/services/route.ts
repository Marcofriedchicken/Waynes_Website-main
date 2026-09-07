import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create service-role client for admin writes
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!supabaseAdminUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin credentials not configured')
  }
  return createClient(supabaseAdminUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}

export async function GET() {
  try {
    const admin = getAdminClient()

    // Fetch all services
    const { data: services, error: servicesError } = await admin
      .from('services')
      .select('*')
      .order('id', { ascending: true })

    if (servicesError) throw servicesError

    // Fetch all prices
    const { data: prices, error: pricesError } = await admin
      .from('service_prices')
      .select('*')
      .order('service_id', { ascending: true })

    if (pricesError) throw pricesError

    // Group prices by service
    const servicesWithPrices = (services || []).map((service) => ({
      ...service,
      prices: (prices || [])
        .filter((p) => p.service_id === service.id)
        .reduce(
          (acc, p) => {
            acc[p.vehicle_type] = p.price
            return acc
          },
          {} as Record<string, number>
        ),
    }))

    return NextResponse.json(servicesWithPrices)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch services'
    console.error('Services GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface UpdateServicePayload {
  id: string
  active: boolean
  prices?: {
    'Compact/Hatch': number
    'Sedan Type': number
    'APV/AUV': number
    'SUV/Pick-up': number
    'Lifted/Van/L300': number
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as UpdateServicePayload
    const { id, active, prices } = payload

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    // Update service active flag
    const { error: updateError } = await admin
      .from('services')
      .update({ active })
      .eq('id', id)

    if (updateError) throw updateError

    // Update prices if provided
    if (prices) {
      const vehicleTypes = [
        'Compact/Hatch',
        'Sedan Type',
        'APV/AUV',
        'SUV/Pick-up',
        'Lifted/Van/L300',
      ]

      for (const vehicleType of vehicleTypes) {
        const price = prices[vehicleType as keyof typeof prices]
        if (price !== undefined) {
          const { error: priceError } = await admin
            .from('service_prices')
            .upsert(
              {
                service_id: id,
                vehicle_type: vehicleType,
                price,
              },
              { onConflict: 'service_id,vehicle_type' }
            )

          if (priceError) throw priceError
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update service'
    console.error('Services PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
