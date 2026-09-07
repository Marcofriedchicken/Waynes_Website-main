'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { AlertCircle, Trash2, Plus, ChevronDown } from 'lucide-react'

export default function AdminPricingPage() {
  const [services, setServices] = useState<any[]>([])
  const [addOns, setAddOns] = useState<any[]>([])
  const [shopItems, setShopItems] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [expandedSection, setExpandedSection] = useState<'services' | 'addons' | 'promotions'>('services')

  async function handleSignOut() {
    const response = await fetch('/api/admin-auth/logout', { method: 'POST' })
    if (response.ok) {
      window.location.href = '/admin-login'
    } else {
      setError('Failed to sign out')
    }
  }

  // New promo form
  const [promoForm, setPromoForm] = useState({
    label: '',
    target: 'site-wide',
    targetId: null as string | null,
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 0,
    startDate: '',
    endDate: '',
    active: true,
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      setError(null)

      const [servicesRes, addOnsRes, shopItemsRes, promosRes] = await Promise.all([
        fetch('/api/admin/services'),
        fetch('/api/admin/add-ons'),
        fetch('/api/admin/shop-items'),
        fetch('/api/admin/promotions'),
      ])

      if (!servicesRes.ok || !addOnsRes.ok || !shopItemsRes.ok || !promosRes.ok) {
        throw new Error('Failed to load admin data')
      }

      const [servicesData, addOnsData, shopItemsData, promosData] = await Promise.all([
        servicesRes.json(),
        addOnsRes.json(),
        shopItemsRes.json(),
        promosRes.json(),
      ])

      setServices(servicesData)
      setAddOns(addOnsData)
      setShopItems(shopItemsData)
      setPromotions(promosData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function updateService(serviceId: string, field: 'active' | 'prices', value: any) {
    try {
      setSaveStatus('saving')

      const updatedService = services.find(s => s.id === serviceId)
      if (!updatedService) return

      const payload = {
        id: serviceId,
        active: field === 'active' ? value : updatedService.active,
        prices: field === 'prices' ? value : updatedService.prices,
      }

      const res = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update service')

      setServices(services.map(s =>
        s.id === serviceId
          ? { ...s, ...(field === 'active' ? { active: value } : { prices: value }) }
          : s
      ))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function updateAddOn(addonId: string, field: 'active' | 'price', value: any) {
    try {
      setSaveStatus('saving')

      const payload = {
        id: addonId,
        [field]: value,
      }

      const res = await fetch('/api/admin/add-ons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update add-on')

      setAddOns(addOns.map(a =>
        a.id === addonId
          ? { ...a, [field]: value }
          : a
      ))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function updateShopItem(itemId: string, field: 'active' | 'price', value: any) {
    try {
      setSaveStatus('saving')

      const payload = {
        id: itemId,
        [field]: value,
      }

      const res = await fetch('/api/admin/shop-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update shop item')

      setShopItems(shopItems.map(i =>
        i.id === itemId
          ? { ...i, [field]: value }
          : i
      ))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function createPromotion() {
    try {
      if (!promoForm.label || !promoForm.startDate || !promoForm.endDate) {
        setError('Missing required fields')
        return
      }

      setSaveStatus('saving')

      const payload = {
        label: promoForm.label,
        service_id: promoForm.target === 'service' ? promoForm.targetId : null,
        add_on_id: promoForm.target === 'addon' ? promoForm.targetId : null,
        shop_item_id: promoForm.target === 'shop' ? promoForm.targetId : null,
        discount_type: promoForm.discountType,
        discount_value: promoForm.discountValue,
        start_date: promoForm.startDate,
        end_date: promoForm.endDate,
        active: promoForm.active,
      }

      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to create promotion')

      const newPromo = await res.json()
      setPromotions([...promotions, newPromo])

      // Reset form
      setPromoForm({
        label: '',
        target: 'site-wide',
        targetId: null,
        discountType: 'percent',
        discountValue: 0,
        startDate: '',
        endDate: '',
        active: true,
      })

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to create promotion')
    }
  }

  async function deletePromotion(promoId: string) {
    if (!confirm('Delete this promotion?')) return

    try {
      setSaveStatus('saving')

      const res = await fetch(`/api/admin/promotions?id=${promoId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete promotion')

      setPromotions(promotions.filter(p => p.id !== promoId))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to delete promotion')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  const vehicleTypes = ['Compact/Hatch', 'Sedan Type', 'APV/AUV', 'SUV/Pick-up', 'Lifted/Van/L300']

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 relative">
                <Image
                  src="/images/logo.png"
                  alt="Wayne's Detailing"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black">Pricing Management</h1>
                <p className="text-white/50 text-sm">Admin Panel</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="border border-[#ED0407] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#ED0407]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-900/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-900/20 border border-green-600 text-green-300 px-4 py-3 rounded-lg">
            ✓ Saved successfully
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Services Section */}
        <section className="mb-8">
          <button
            onClick={() => setExpandedSection(expandedSection === 'services' ? 'addons' : 'services')}
            className="w-full flex items-center justify-between bg-[#111111] border border-[#2a2a2a] p-4 rounded-lg hover:bg-[#161616] transition"
          >
            <h2 className="text-xl font-bold">Services</h2>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'services' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'services' && (
            <div className="mt-4 space-y-4">
              {services.map(service => (
                <div
                  key={service.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{service.name}</h3>
                      <p className="text-white/50 text-sm">{service.duration_minutes} mins</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={service.active}
                        onChange={e => updateService(service.id, 'active', e.target.checked)}
                        className="w-5 h-5 accent-[#ED0407]"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {vehicleTypes.map(vtype => (
                      <div key={vtype}>
                        <label className="block text-xs text-white/50 mb-1">{vtype}</label>
                        <input
                          type="number"
                          value={service.prices?.[vtype] || 0}
                          onChange={e => {
                            const newPrices = {
                              ...service.prices,
                              [vtype]: Number(e.target.value),
                            }
                            updateService(service.id, 'prices', newPrices)
                          }}
                          className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-2 py-1 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add-ons & Shop Items Section */}
        <section className="mb-8">
          <button
            onClick={() => setExpandedSection(expandedSection === 'addons' ? 'promotions' : 'addons')}
            className="w-full flex items-center justify-between bg-[#111111] border border-[#2a2a2a] p-4 rounded-lg hover:bg-[#161616] transition"
          >
            <h2 className="text-xl font-bold">Add-ons & Shop Items</h2>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'addons' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'addons' && (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-bold mb-3 text-white/70">Add-ons</h3>
                <div className="space-y-3">
                  {addOns.map(addon => (
                    <div
                      key={addon.id}
                      className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{addon.name}</h4>
                        <p className="text-white/50 text-sm">{addon.duration_minutes} mins</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={addon.price}
                          onChange={e => updateAddOn(addon.id, 'price', Number(e.target.value))}
                          className="w-20 bg-[#0F0F0F] border border-[#2a2a2a] rounded px-2 py-1 text-white"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addon.active}
                            onChange={e => updateAddOn(addon.id, 'active', e.target.checked)}
                            className="w-4 h-4 accent-[#ED0407]"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-3 text-white/70">Shop Items</h3>
                <div className="space-y-3">
                  {shopItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-white/50 text-sm">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => updateShopItem(item.id, 'price', Number(e.target.value))}
                          className="w-20 bg-[#0F0F0F] border border-[#2a2a2a] rounded px-2 py-1 text-white"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={e => updateShopItem(item.id, 'active', e.target.checked)}
                            className="w-4 h-4 accent-[#ED0407]"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Promotions Section */}
        <section>
          <button
            onClick={() => setExpandedSection(expandedSection === 'promotions' ? 'services' : 'promotions')}
            className="w-full flex items-center justify-between bg-[#111111] border border-[#2a2a2a] p-4 rounded-lg hover:bg-[#161616] transition"
          >
            <h2 className="text-xl font-bold">Promotions</h2>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'promotions' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'promotions' && (
            <div className="mt-4 space-y-6">
              {/* Existing Promotions */}
              <div>
                <h3 className="font-bold mb-3">Active Promotions</h3>
                {promotions.length === 0 ? (
                  <p className="text-white/50">No promotions yet</p>
                ) : (
                  <div className="space-y-2">
                    {promotions.map(promo => (
                      <div
                        key={promo.id}
                        className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold">{promo.label}</h4>
                          <p className="text-white/50 text-sm">
                            {promo.targetName} • {promo.discount_value}
                            {promo.discount_type === 'percent' ? '%' : '₱'} •{' '}
                            {new Date(promo.start_date).toLocaleDateString()} to{' '}
                            {new Date(promo.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deletePromotion(promo.id)}
                          className="text-red-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Promotion Form */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Promotion
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Promotion Label</label>
                    <input
                      type="text"
                      value={promoForm.label}
                      onChange={e => setPromoForm({ ...promoForm, label: e.target.value })}
                      placeholder="e.g., Summer Sale"
                      className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Target</label>
                      <select
                        value={promoForm.target}
                        onChange={e => setPromoForm({ ...promoForm, target: e.target.value as any })}
                        className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                      >
                        <option value="site-wide">Site-wide</option>
                        <option value="service">Service</option>
                        <option value="addon">Add-on</option>
                        <option value="shop">Shop Item</option>
                      </select>
                    </div>

                    {promoForm.target !== 'site-wide' && (
                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          {promoForm.target === 'service'
                            ? 'Service'
                            : promoForm.target === 'addon'
                            ? 'Add-on'
                            : 'Shop Item'}
                        </label>
                        <select
                          value={promoForm.targetId || ''}
                          onChange={e =>
                            setPromoForm({ ...promoForm, targetId: e.target.value || null })
                          }
                          className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                        >
                          <option value="">Select...</option>
                          {promoForm.target === 'service' &&
                            services.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          {promoForm.target === 'addon' &&
                            addOns.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          {promoForm.target === 'shop' &&
                            shopItems.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Discount Type</label>
                      <select
                        value={promoForm.discountType}
                        onChange={e =>
                          setPromoForm({
                            ...promoForm,
                            discountType: e.target.value as 'percent' | 'fixed',
                          })
                        }
                        className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed (₱)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Discount Value</label>
                      <input
                        type="number"
                        value={promoForm.discountValue}
                        onChange={e =>
                          setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })
                        }
                        className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Start Date</label>
                      <input
                        type="date"
                        value={promoForm.startDate}
                        onChange={e => setPromoForm({ ...promoForm, startDate: e.target.value })}
                        className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">End Date</label>
                      <input
                        type="date"
                        value={promoForm.endDate}
                        onChange={e => setPromoForm({ ...promoForm, endDate: e.target.value })}
                        className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoForm.active}
                      onChange={e => setPromoForm({ ...promoForm, active: e.target.checked })}
                      className="w-4 h-4 accent-[#ED0407]"
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  <button
                    onClick={createPromotion}
                    disabled={saveStatus === 'saving'}
                    className="w-full bg-[#ED0407] hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Create Promotion'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
