"use client";

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AddShopItem() {
  const [loading, setLoading] = useState(false)
  const [isCallingCard, setIsCallingCard] = useState(true) // Toggle for UI logic
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    slot: 'other', // HARDCODED as requested
    thumbnail_url: '',  // Small Shop Icon
    image_url: '',       // Big Profile Background
    skin_id: 'default'  // Mapping to CARD_SKINS
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Prepare the payload
    const payload = {
      name: formData.name,
      price: formData.price,
      slot: 'other', // Always 'other'
      thumbnail_url: formData.thumbnail_url,
      image_url: formData.image_url, 
      // We use item_effects to tag this as a calling card and link to CARD_SKINS
      item_effects: isCallingCard ? { subtype: 'calling_card', skin_id: formData.skin_id } : {},
      
      // Default required fields
      rarity: 'common',
      is_active: true,
      is_stackable: false 
    }

    const { error } = await supabase
      .from('shop_items')
      .insert([payload])

    setLoading(false)
    if (error) alert('Error: ' + error.message)
    else alert('Item Created Successfully!')
  }

  return (
    <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg max-w-xl mx-auto">
      <h2 className="text-white text-xl font-bold mb-4">Add "Other" Item</h2>
      
      {/* Toggle between Standard Item and Calling Card */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setIsCallingCard(true)}
          className={`px-4 py-2 rounded ${isCallingCard ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          Calling Card
        </button>
        <button
          type="button"
          onClick={() => setIsCallingCard(false)}
          className={`px-4 py-2 rounded ${!isCallingCard ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          Consumable / Misc
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          placeholder="Item Name" 
          className="w-full p-2 bg-gray-800 text-white rounded"
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        
        <input 
          type="number" 
          placeholder="Price (Coins)" 
          className="w-full p-2 bg-gray-800 text-white rounded"
          onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
        />

        {/* Image Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm">Shop Icon (Thumbnail)</label>
            <input 
              placeholder="thumbnail_url" 
              className="w-full p-2 bg-gray-800 text-white rounded"
              onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
            />
          </div>
          
          {/* Only show Full BG input if it's a calling card */}
          {isCallingCard && (
            <div>
              <label className="text-purple-400 text-sm">Profile BG (Full Image)</label>
              <input 
                placeholder="image_url" 
                className="w-full p-2 bg-purple-900/30 text-purple-100 border border-purple-500 rounded"
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              />
            </div>
          )}
        </div>

        {/* Skin ID for calling cards */}
        {isCallingCard && (
          <div>
            <label className="text-purple-400 text-sm">Skin ID (matches CARD_SKINS)</label>
            <input 
              placeholder="e.g., magma, galaxy, default" 
              className="w-full p-2 bg-gray-800 text-white rounded"
              value={formData.skin_id}
              onChange={(e) => setFormData({...formData, skin_id: e.target.value})}
            />
          </div>
        )}

        <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded">
          {loading ? 'Creating...' : 'Create Item'}
        </button>
      </form>
    </div>
  )
}
