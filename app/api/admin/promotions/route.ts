import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Fetch all promotions with joined data for display
    const { data: promotions, error } = await admin
      .from('promotions')
      .select(`
        id,
        label,
        service_id,
        add_on_id,
        shop_item_id,
        discount_type,
        discount_value,
        start_date,
        end_date,
        active
      `)
      .order('id', { ascending: true })

    if (error) throw error

    // Fetch service, add-on, and shop item names for display
    const promotionIds = (promotions || []).map(p => p.id)
    
    let enrichedPromotions = promotions || []

    if (promotionIds.length > 0) {
      const { data: services } = await admin.from('services').select('id, name')
      const { data: addOns } = await admin.from('add_ons').select('id, name')
      const { data: shopItems } = await admin.from('shop_items').select('id, name')

      enrichedPromotions = (promotions || []).map(p => {
        let targetName = 'Site-wide'
        if (p.service_id) {
          targetName = services?.find(s => s.id === p.service_id)?.name || p.service_id
        } else if (p.add_on_id) {
          targetName = addOns?.find(a => a.id === p.add_on_id)?.name || p.add_on_id
        } else if (p.shop_item_id) {
          targetName = shopItems?.find(s => s.id === p.shop_item_id)?.name || p.shop_item_id
        }
        return { ...p, targetName }
      })
    }

    return NextResponse.json(enrichedPromotions)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch promotions'
    console.error('Promotions GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface CreatePromotionPayload {
  label: string
  service_id?: string | null
  add_on_id?: string | null
  shop_item_id?: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  start_date: string
  end_date: string
  active: boolean
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreatePromotionPayload
    const {
      label,
      service_id,
      add_on_id,
      shop_item_id,
      discount_type,
      discount_value,
      start_date,
      end_date,
      active,
    } = payload

    if (!label || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: label, discount_type, discount_value' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    const { data, error } = await admin
      .from('promotions')
      .insert([
        {
          label,
          service_id: service_id || null,
          add_on_id: add_on_id || null,
          shop_item_id: shop_item_id || null,
          discount_type,
          discount_value,
          start_date,
          end_date,
          active,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data?.[0], { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create promotion'
    console.error('Promotions POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface UpdatePromotionPayload {
  id: string
  label?: string
  service_id?: string | null
  add_on_id?: string | null
  shop_item_id?: string | null
  discount_type?: 'percent' | 'fixed'
  discount_value?: number
  start_date?: string
  end_date?: string
  active?: boolean
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as UpdatePromotionPayload
    const { id, ...updateData } = payload

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID is required' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    // Filter out undefined values
    const cleanData: Record<string, unknown> = {}
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value
      }
    })

    const { error } = await admin
      .from('promotions')
      .update(cleanData)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update promotion'
    console.error('Promotions PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID is required' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    const { error } = await admin
      .from('promotions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete promotion'
    console.error('Promotions DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
