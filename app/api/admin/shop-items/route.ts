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

    const { data: shopItems, error } = await admin
      .from('shop_items')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json(shopItems || [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shop items'
    console.error('Shop items GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface UpdateShopItemPayload {
  id: string
  active?: boolean
  price?: number
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as UpdateShopItemPayload
    const { id, active, price } = payload

    if (!id) {
      return NextResponse.json(
        { error: 'Shop item ID is required' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    const updateData: Record<string, unknown> = {}
    if (active !== undefined) updateData.active = active
    if (price !== undefined) updateData.price = price

    const { error } = await admin
      .from('shop_items')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update shop item'
    console.error('Shop items PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
