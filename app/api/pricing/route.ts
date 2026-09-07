import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getPublicClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public credentials not configured')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

interface Service {
  id: string
  slug: string
  name: string
  bay_pool: string
  duration_minutes: number
  active: boolean
}

interface ServicePrice {
  id: string
  service_id: string
  vehicle_type: string
  price: number
}

interface AddOn {
  id: string
  slug: string
  name: string
  price: number
  duration_minutes: number
  active: boolean
}

interface ShopItem {
  id: string
  slug: string
  name: string
  price: number
  category: string
  active: boolean
}

interface Promotion {
  id: string
  label: string
  service_id: string | null
  add_on_id: string | null
  shop_item_id: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  start_date: string
  end_date: string
  active: boolean
}

interface PromoInfo {
  active_promo_label: string | null
  active_promo_discount: number | null
  active_promo_type: 'percent' | 'fixed' | null
}

function isPromoActive(promo: Promotion, now: Date): boolean {
  if (!promo.active) return false
  const start = new Date(promo.start_date)
  const end = new Date(promo.end_date)
  return now >= start && now <= end
}

function findBestPromo(
  promos: Promotion[],
  now: Date,
  originalPrice: number
): { promo: Promotion | null; discount: number } {
  const activePromos = promos.filter(p => isPromoActive(p, now))
  if (activePromos.length === 0) return { promo: null, discount: 0 }

  let bestPromo = activePromos[0]
  let bestDiscount = bestPromo.discount_type === 'percent'
    ? (originalPrice * bestPromo.discount_value) / 100
    : bestPromo.discount_value

  for (let i = 1; i < activePromos.length; i++) {
    const promo = activePromos[i]
    const discount = promo.discount_type === 'percent'
      ? (originalPrice * promo.discount_value) / 100
      : promo.discount_value

    if (discount > bestDiscount) {
      bestDiscount = discount
      bestPromo = promo
    }
  }

  return { promo: bestPromo, discount: bestDiscount }
}

export async function GET() {
  try {
    const client = getPublicClient()
    const now = new Date()

    // Fetch all data in parallel
    const [servicesRes, pricesRes, addOnsRes, shopItemsRes, promosRes] = await Promise.all([
      client.from('services').select('*').eq('active', true),
      client.from('service_prices').select('*'),
      client.from('add_ons').select('*').eq('active', true),
      client.from('shop_items').select('*').eq('active', true),
      client.from('promotions').select('*'),
    ])

    const services: Service[] = servicesRes.data || []
    const prices: ServicePrice[] = pricesRes.data || []
    const addOns: AddOn[] = addOnsRes.data || []
    const shopItems: ShopItem[] = shopItemsRes.data || []
    const promotions: Promotion[] = promosRes.data || []
    const siteWidePromos = promotions.filter(p => !p.service_id && !p.add_on_id && !p.shop_item_id)

    // Build service pricing structure
    const servicesWithPrices = services.map(service => {
      const servicePrices = prices.filter(p => p.service_id === service.id)
      const servicePromos = [
        ...promotions.filter(p => p.service_id === service.id),
        ...siteWidePromos,
      ]

      const vehicleTypesPricing: Record<string, { price: number; effective_price: number; active_promo_label: string | null }> = {}

      const vehicleTypes = [
        'Compact/Hatch',
        'Sedan Type',
        'APV/AUV',
        'SUV/Pick-up',
        'Lifted/Van/L300',
      ]

      vehicleTypes.forEach(vehicleType => {
        const priceRow = servicePrices.find(p => p.vehicle_type === vehicleType)
        const price = priceRow?.price || 0

        const { promo, discount } = findBestPromo(servicePromos, now, price)
        const effective_price = Math.max(0, price - discount)

        vehicleTypesPricing[vehicleType] = {
          price,
          effective_price,
          active_promo_label: promo ? `${promo.discount_type === 'percent' ? promo.discount_value + '%' : '₱' + promo.discount_value} OFF` : null,
          active_promo_discount: promo ? promo.discount_value : null,
          active_promo_discount_type: promo ? promo.discount_type : null,
          promo_label: promo?.label || null,
          promo_end_date: promo?.end_date || null,
        }
      })

      return {
        id: service.id,
        slug: service.slug,
        name: service.name,
        bay_pool: service.bay_pool,
        duration_minutes: service.duration_minutes,
        prices: vehicleTypesPricing,
      }
    })

    // Build add-ons with promo pricing
    const addOnsWithPricing = addOns.map(addon => {
      const addonPromos = [
        ...promotions.filter(p => p.add_on_id === addon.id),
        ...siteWidePromos,
      ]
      const { promo, discount } = findBestPromo(addonPromos, now, addon.price)
      const effective_price = Math.max(0, addon.price - discount)

      return {
        id: addon.id,
        slug: addon.slug,
        name: addon.name,
        price: addon.price,
        effective_price,
        duration_minutes: addon.duration_minutes,
        active_promo_label: promo ? `${promo.discount_type === 'percent' ? promo.discount_value + '%' : '₱' + promo.discount_value} OFF` : null,
        active_promo_discount: promo ? promo.discount_value : null,
        active_promo_discount_type: promo ? promo.discount_type : null,
        promo_label: promo?.label || null,
        promo_end_date: promo?.end_date || null,
      }
    })

    // Build shop items with promo pricing
    const shopItemsWithPricing = shopItems.map(item => {
      const itemPromos = [
        ...promotions.filter(p => p.shop_item_id === item.id),
        ...siteWidePromos,
      ]
      const { promo, discount } = findBestPromo(itemPromos, now, item.price)
      const effective_price = Math.max(0, item.price - discount)

      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        price: item.price,
        effective_price,
        category: item.category,
        active_promo_label: promo ? `${promo.discount_type === 'percent' ? promo.discount_value + '%' : '₱' + promo.discount_value} OFF` : null,
        active_promo_discount: promo ? promo.discount_value : null,
        active_promo_discount_type: promo ? promo.discount_type : null,
        promo_label: promo?.label || null,
        promo_end_date: promo?.end_date || null,
      }
    })

    // Return response with cache headers (60 seconds)
    const response = NextResponse.json({
      services: servicesWithPrices,
      addOns: addOnsWithPricing,
      shopItems: shopItemsWithPricing,
      timestamp: now.toISOString(),
    })

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pricing'
    console.error('Pricing endpoint error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
