import React, { useState } from 'react';
import { Plus, Sparkles, Search, X, Edit, Copy, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import { AddShopItem } from '@/components';
import AddShopItemForm from './AddShopItemForm';

interface ShopTabProps {
  shopItems: any[];
  gachaCollections: any[];
  showAddShopItem: boolean;
  setShowAddShopItem: (show: boolean) => void;
  showAddOtherItem: boolean;
  setShowAddOtherItem: (show: boolean) => void;
  shopSlotFilter: string;
  setShopSlotFilter: (filter: string) => void;
  editingShopItem: any;
  setEditingShopItem: (item: any) => void;
  onAddShopItem: (item: any) => void;
  onEditShopItemComplete: (item: any) => void;
  onToggleFeatured: (id: string, isFeatured: boolean) => void;
  onToggleShopItem: (id: string, isActive: boolean) => void;
  onDeleteShopItem: (id: string) => void;
  onCopyShopItem: (item: any) => void;
  onEditShopItem: (item: any) => void;
  baseBodyShopItems: any[];
}

export default function ShopTab({
  shopItems,
  baseBodyShopItems,
  gachaCollections,
  showAddShopItem,
  setShowAddShopItem,
  showAddOtherItem,
  setShowAddOtherItem,
  shopSlotFilter,
  setShopSlotFilter,
  editingShopItem,
  setEditingShopItem,
  onAddShopItem,
  onEditShopItemComplete,
  onToggleFeatured,
  onToggleShopItem,
  onDeleteShopItem,
  onCopyShopItem,
  onEditShopItem
}: ShopTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredItems = shopItems
    .filter(item => {
      // First apply slot filter
      if (shopSlotFilter !== 'all') {
        if (shopSlotFilter === 'gacha') {
          if (!item.is_gacha_exclusive) return false;
        } else if (item.slot !== shopSlotFilter) {
          return false;
        }
      }

      // Apply gender filter
      if (genderFilter !== 'all') {
        const rawGender = item.gender || 'unisex';
        const genders = Array.isArray(rawGender) 
          ? rawGender.map((g: string) => g.toLowerCase()) 
          : [rawGender.toLowerCase()];
        
        if (!genders.includes(genderFilter) && !genders.includes('unisex')) return false;
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        const isActive = !!item.is_active;
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }
      
      // Then apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const idMatch = item.id?.toString().toLowerCase().includes(query);
        return nameMatch || descMatch || idMatch;
      }
      
      return true;
    })
    // Sort by created_at desc (newest first)
    .sort((a, b) => {
      // Sort by created_at descending (newest first)
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

  return (
    <section>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
            <Plus size={22} /> Shop Management
          </h2>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
            Total: {shopItems.length} | Showing: {filteredItems.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search by name, description or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/60 border border-gray-800 rounded-lg py-2 pl-9 pr-8 text-xs text-white focus:outline-none focus:border-red-500/50 transition-all font-bold"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddOtherItem(!showAddOtherItem)}
              className="px-4 py-2 clip-tech-button bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
            >
              <Plus size={18} /> Add Other
            </button>
            <button
              onClick={() => setShowAddShopItem(!showAddShopItem)}
              className="px-4 py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            >
              <Plus size={18} /> Add Item
            </button>
          </div>
        </div>
      </div>

      {showAddShopItem && (
        <div className="bg-gray-900/40 border border-red-900/30 p-6 rounded-2xl mb-4">
          <AddShopItemForm
            onAdd={onAddShopItem}
            onEdit={onEditShopItemComplete}
            onCancel={() => {
              setShowAddShopItem(false);
              setEditingShopItem(null);
            }}
            editingItem={editingShopItem}
            gachaCollections={gachaCollections}
            baseBodyShopItems={baseBodyShopItems}
            shopItems={shopItems} // Pass all shop items to support hand grip lookup
          />
        </div>
      )}

      {showAddOtherItem && (
        <div className="mb-6">
          <AddShopItem />
        </div>
      )}

      {/* Shop Slot Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-900/20 rounded-lg">
        {[
          { value: 'all', label: 'All Items', count: shopItems.length },
          { value: 'avatar', label: 'Avatars', count: shopItems.filter(item => item.slot === 'avatar').length },
          { value: 'base_body', label: 'Base Body', count: shopItems.filter(item => item.slot === 'base_body').length },
          { value: 'face_eyes', label: 'Eyes', count: shopItems.filter(item => item.slot === 'face_eyes').length },
          { value: 'face_mouth', label: 'Mouth', count: shopItems.filter(item => item.slot === 'face_mouth').length },
          { value: 'hair', label: 'Hair', count: shopItems.filter(item => item.slot === 'hair').length },
          { value: 'face', label: 'Face', count: shopItems.filter(item => item.slot === 'face').length },
          { value: 'body', label: 'Body', count: shopItems.filter(item => item.slot === 'body').length },
          { value: 'background', label: 'Background', count: shopItems.filter(item => item.slot === 'background').length },
          { value: 'head', label: 'Head', count: shopItems.filter(item => item.slot === 'head').length },
          { value: 'back', label: 'Back', count: shopItems.filter(item => item.slot === 'back').length },
          { value: 'hands', label: 'Hands (Gloves)', count: shopItems.filter(item => item.slot === 'hands').length },
          { value: 'hand_grip', label: 'Hand Grip', count: shopItems.filter(item => item.slot === 'hand_grip').length },
          { value: 'feet', label: 'Feet', count: shopItems.filter(item => item.slot === 'feet').length },
          { value: 'weapon', label: 'Weapons', count: shopItems.filter(item => item.slot === 'weapon').length },
          { value: 'magic effects', label: 'Magic Effects', count: shopItems.filter(item => item.slot === 'magic effects').length },
          { value: 'accessory', label: 'Accessories', count: shopItems.filter(item => item.slot === 'accessory').length },
          { value: 'other', label: 'Other', count: shopItems.filter(item => item.slot === 'other').length },
          { value: 'gacha', label: 'Gacha Exclusive', count: shopItems.filter(item => item.is_gacha_exclusive).length }
        ].map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setShopSlotFilter(value)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              shopSlotFilter === value
                ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Sub-Filters: Gender and Status */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-900/40 rounded-xl border border-gray-800/50">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Gender Filter</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All Genders' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'unisex', label: 'Unisex' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGenderFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  genderFilter === value
                    ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(219,39,119,0.3)]'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-10 bg-gray-800 self-end mb-1 hidden md:block" />

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Status Filter</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  statusFilter === value
                    ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.3)]'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-gray-900/40 border border-gray-800 p-12 rounded-2xl text-center">
            <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No items found matching your search</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-red-400 hover:text-red-300 text-[10px] font-black uppercase underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`group relative bg-gray-900/40 border ${item.is_active ? 'border-gray-800' : 'border-red-900/50'} rounded-xl overflow-hidden hover:border-red-500/50 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]`}
            >
              {/* Card Status Indicators */}
              <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 items-end">
                {item.is_featured && <span className="text-xs">⭐</span>}
                {!item.is_active && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
              </div>

              {/* Price Badge */}
              <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-yellow-400 border border-yellow-500/30">
                {item.price} coins
              </div>

              {/* Image Container */}
              <div className="aspect-square w-full relative bg-gray-900/60 flex items-center justify-center overflow-hidden">
                {(item.slot !== 'avatar' && (item.slot === 'base_body' || item.image_base_url)) ? (
                  <div className="w-full h-full relative">
                    {(item.image_base_url || item.thumbnail_url || item.image_url) && (
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backgroundColor: item.skin_tint_hex || '#FFDBAC',
                          WebkitMaskImage: `url(${item.image_base_url || item.thumbnail_url || item.image_url})`,
                          maskImage: `url(${item.image_base_url || item.thumbnail_url || item.image_url})`,
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat'
                        }}
                      />
                    )}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain z-10"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    )}
                  </div>
                ) : (item.thumbnail_url || item.image_url) && (item.thumbnail_url || item.image_url).toLowerCase().endsWith('.webm') ? (
                  <video
                    src={item.thumbnail_url || item.image_url}
                    className="w-full h-full object-contain"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : item.is_animated && item.animation_config ? (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${item.thumbnail_url || item.image_url})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated'
                    }}
                  />
                ) : (
                  <img
                    src={item.thumbnail_url || item.image_url}
                    alt={item.name}
                    className="w-full h-full object-contain p-2"
                  />
                )}
              </div>

              {/* Basic Info (Visible by default) */}
              <div className="p-3 bg-gray-900/80 border-t border-gray-800">
                <h3 className="text-xs font-black text-white truncate">{item.name}</h3>
                <p className="text-[10px] text-gray-500 truncate">{item.slot}</p>
              </div>

              {/* Hover Overlay (Full Details) */}
              <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col z-30 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <h3 className="text-sm font-black text-white mb-2">{item.name}</h3>
                  {/* Description removed for cleaner grid view as requested */}
                  
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between items-center text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span className="font-bold">Rarity</span>
                      <span className={`font-black ${
                        item.rarity === 'legendary' ? 'text-orange-400' : 
                        item.rarity === 'epic' ? 'text-purple-400' : 
                        item.rarity === 'rare' ? 'text-blue-400' : 
                        item.rarity === 'uncommon' ? 'text-green-400' : 'text-gray-300'
                      }`}>{item.rarity}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span className="font-bold">Slot</span>
                      <span className="text-white">{item.slot}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span className="font-bold">Z-Index</span>
                      <span className="text-purple-400 font-mono">{item.z_index}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span className="font-bold">Gender</span>
                      <span className="text-pink-400">{Array.isArray(item.gender) ? item.gender.join('/') : (item.gender || 'unisex')}</span>
                    </div>
                    {item.bonus_type && (
                      <div className="flex justify-between items-center text-gray-400 bg-gray-800/50 p-1 rounded border border-green-900/30">
                        <span className="font-bold text-green-500">Bonus</span>
                        <span className="text-green-400 font-black">
                          {item.bonus_type.replace('_', ' ').toUpperCase()} +{item.bonus_value}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => onToggleShopItem(item.id, item.is_active)}
                    className={`p-2 rounded hover:bg-white/10 flex items-center justify-center ${item.is_active ? 'text-green-400' : 'text-gray-500'}`}
                    title={item.is_active ? 'Disable' : 'Enable'}
                  >
                    {item.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => onToggleFeatured(item.id, item.is_featured)}
                    className={`p-2 rounded hover:bg-white/10 flex items-center justify-center ${item.is_featured ? 'text-yellow-400' : 'text-gray-500'}`}
                    title="Toggle Featured"
                  >
                    <Star size={14} fill={item.is_featured ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => onEditShopItem(item)}
                    className="p-2 rounded hover:bg-white/10 text-blue-400 flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => onCopyShopItem(item)}
                    className="p-2 rounded hover:bg-white/10 text-purple-400 flex items-center justify-center"
                    title="Copy"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <button
                  onClick={() => onDeleteShopItem(item.id)}
                  className="w-full mt-1 p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> DELETE
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}