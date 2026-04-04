"use client";

import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { User, RANK_COLORS } from '@/lib/types';
import { calculateLevel, getRank, calculateDerivedStats } from '@/lib/stats';
import LayeredAvatar from '@/components/LayeredAvatar';
import { ShopItemMedia } from '@/components/ShopItemMedia';

interface InventoryViewProps {
  user: User;
  shopItems: any[];
  equippedItems: any[];
  totalStats: Record<string, number>;
  handleEquipCosmetic: (cosmeticId: string, equipped: boolean) => void;
}

export default function InventoryView({ user, shopItems, equippedItems, totalStats, handleEquipCosmetic }: InventoryViewProps) {
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equipped' | 'weapons' | 'armor' | 'accessories' | 'magics'>('all');
  const [inventorySortAZ, setInventorySortAZ] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<User | null>(null);

  const level = user.level || calculateLevel(user.exp || 0);
  const rank = user.rank || getRank(level);

  const getFilteredInventoryItems = () => {
    let filtered = (user.cosmetics || []).filter((cosmeticItem: any) => {
      const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
      return item?.slot !== 'background' && item?.slot !== 'avatar';
    });

    if (inventoryFilter !== 'all') {
      filtered = filtered.filter((cosmeticItem: any) => {
        const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
        switch (inventoryFilter) {
          case 'equipped':
            return cosmeticItem.equipped === true;
          case 'weapons':
            return item?.slot === 'weapon';
          case 'armor':
            return item?.slot === 'body';
          case 'accessories':
            return !['weapon', 'body', 'background', 'magic effects'].includes(item?.slot || '');
          case 'magics':
            return item?.slot === 'magic effects';
          default:
            return true;
        }
      });
    }

    if (inventorySortAZ) {
      return filtered.sort((a: any, b: any) => {
        const itemA = a.shop_items || shopItems.find(shopItem => shopItem.id === a.shop_item_id);
        const itemB = b.shop_items || shopItems.find(shopItem => shopItem.id === b.shop_item_id);
        const nameA = itemA?.name || '';
        const nameB = itemB?.name || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      return filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const getFullDescription = (item: any) => {
    if (item.bonuses && Array.isArray(item.bonuses) && item.bonuses.length > 0) {
      return 'BONUSES: ' + item.bonuses.map((bonus: any) => {
        const typeName = bonus.type === 'str' ? 'STR' :
                        bonus.type === 'spd' ? 'SPD' :
                        bonus.type === 'end' ? 'END' :
                        bonus.type === 'int' ? 'INT' :
                        bonus.type === 'lck' ? 'LCK' :
                        bonus.type === 'per' ? 'PER' :
                        bonus.type === 'wil' ? 'WIL' :
                        bonus.type === 'attack_damage' ? 'ATK DMG' :
                        bonus.type === 'crit_percentage' ? 'CRIT %' :
                        bonus.type === 'crit_damage' ? 'CRIT DMG' :
                        bonus.type === 'intelligence' ? 'INT' :
                        bonus.type.replace('_', ' ').toUpperCase();
        const suffix = bonus.type.includes('percentage') || bonus.type === 'xp_boost' ? '%' :
                     bonus.type === 'crit_damage' ? 'x' : '';
        return `${typeName} +${bonus.value}${suffix}`;
      }).join(', ');
    } else if (item.bonus_type) {
      const typeName = item.bonus_type === 'str' ? 'STR' :
                     item.bonus_type === 'spd' ? 'SPD' :
                     item.bonus_type === 'end' ? 'END' :
                     item.bonus_type === 'int' ? 'INT' :
                     item.bonus_type === 'lck' ? 'LCK' :
                     item.bonus_type === 'per' ? 'PER' :
                     item.bonus_type === 'wil' ? 'WIL' :
                     item.bonus_type === 'attack_damage' ? 'ATK DMG' :
                     item.bonus_type === 'crit_percentage' ? 'CRIT %' :
                     item.bonus_type === 'crit_damage' ? 'CRIT DMG' :
                     item.bonus_type === 'intelligence' ? 'INT' :
                     item.bonus_type.replace('_', ' ').toUpperCase();
      const suffix = item.bonus_type.includes('percentage') || item.bonus_type === 'xp_boost' ? '%' :
                   item.bonus_type === 'crit_damage' ? 'x' : '';
      return `BONUS: ${typeName} +${item.bonus_value}${suffix}`;
    }
    return '';
  };

  return (
    <>
      <div className="pb-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <LayeredAvatar user={user} size={224} onAvatarClick={() => setSelectedAvatar(user)} />
            <div className="absolute top-2 -right-12 flex flex-col gap-2">
              <button
                onClick={() => setShowAvatarModal(true)}
                className="p-2 clip-tech-button bg-yellow-600/80 hover:bg-yellow-500 text-black border border-yellow-500/50 shadow-lg shadow-yellow-500/20 backdrop-blur-sm transition-all"
                title="Change Avatar"
              >
                <img src="/changeavatar.png" alt="Avatar" className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowBackgroundModal(true)}
                className="p-2 clip-tech-button bg-slate-900/80 hover:bg-slate-800 transition-all border border-white/10 shadow-lg backdrop-blur-md"
                title="Change Background"
              >
                <img src="/backgroundicon.png" alt="Background" className="w-6 h-6" />
              </button>
            </div>
          </div>
            <h3 className="mt-4 sm:mt-6 text-base sm:text-xl font-header font-black uppercase text-center text-cyan-400">{user.name || 'Adventurer'}</h3>
          <div className="flex gap-3 sm:gap-4 mt-3 justify-center">
            <div className="text-center"><div className="text-[8px] sm:text-[9px] text-cyan-400 font-ui font-bold uppercase tracking-widest">Rank</div><div className={`font-header font-black text-sm sm:text-base ${RANK_COLORS[rank].split(' ')[0]}`}>{rank}</div></div>
            <div className="w-px h-4 sm:h-6 bg-gray-800 self-center" />
            <div className="text-center"><div className="text-[8px] sm:text-[9px] text-cyan-400 font-ui font-bold uppercase tracking-widest">Level</div><div className="font-header font-black text-sm sm:text-base text-blue-400">{level}</div></div>
            <div className="w-px h-4 sm:h-6 bg-gray-800 self-center" />
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] text-cyan-400 font-ui font-bold uppercase tracking-widest">Power</div>
              <div className="font-header font-black text-sm sm:text-base text-green-400">
                {Object.values(totalStats || {}).reduce((sum: number, val: any) => {
                  return sum + (typeof val === 'number' ? val : 0);
                }, 0)}
              </div>
            </div>
          </div>
        </div>

        <section>
          <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-widest text-green-500 mb-3">
            ⚔️ Equipped Items
          </h2>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {['weapon', 'body', 'back', 'hands', 'feet'].map(slot => {
              const equippedItem = (equippedItems || []).find((cosmetic: any) => cosmetic.shop_items?.slot === slot);
              const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';
              
              return (
                <div 
                  key={slot} 
                  className={`aspect-square flex flex-col items-center justify-center p-2 transition-all relative border ${
                    equippedItem 
                      ? 'bg-slate-900/80 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
                      : 'bg-black/40 border-gray-800 border-dashed'
                  } rounded-sm group`}
                >
                  {equippedItem ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                                            {/* Shiny Radiating Energy Aura - Reduced Intensity */}
                      <div 
                        className="absolute inset-[-15%] radiating-energy"
                        style={{ 
                          '--energy-color': 
                            rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.15)' :
                            rarity === 'rare' ? 'rgba(59, 130, 246, 0.25)' :
                            rarity === 'epic' ? 'rgba(168, 85, 247, 0.35)' :
                            rarity === 'legendary' ? 'rgba(255, 255, 0, 0.35)' :
                            rarity === 'monarch' ? 'rgba(255, 215, 0, 0.6)' :
                            'transparent'
                        } as any}
                      />
                      
                      <div className="relative z-10 w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-md">
                        <ShopItemMedia item={equippedItem.shop_items} className={`w-full h-full object-contain ${rarity !== 'common' ? 'shiny-item' : ''}`} />
                      </div>
                    </div>
                  ) : (
                    <Lock size={16} className="text-gray-700 opacity-50" />
                  )}
                  <span className="absolute bottom-1 text-[6px] font-black uppercase text-gray-500 tracking-tighter">
                    {slot === 'weapon' ? 'weapon' :
                     slot === 'body' ? 'armor' :
                     slot === 'feet' ? 'feet' :
                     slot === 'hands' ? 'hands' :
                     slot === 'back' ? 'back' :
                     slot}
                  </span>
                </div>
              );
            })}
          </div>
          {Object.keys(totalStats || {}).length > 0 && (
            <div className="mt-3 text-center">
              <div className="text-[8px] text-gray-500 font-black uppercase mb-1">Equipment Stats</div>
              <div className="flex justify-center gap-3">
                {Object.entries(totalStats || {}).map(([stat, value]: [string, any]) => (
                  <span key={stat} className="text-[7px] text-green-400 font-bold uppercase">
                    {stat === 'attack_damage' ? 'ATK DMG' :
                     stat === 'crit_percentage' ? 'CRIT %' :
                     stat === 'crit_damage' ? 'CRIT DMG' :
                     stat === 'intelligence' ? 'INT' :
                     stat.replace('_', ' ').toUpperCase()} +{typeof value === 'object' ? 0 : value}{stat.includes('percentage') || stat === 'xp_boost' ? '%' :
                     stat === 'crit_damage' ? 'x' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-widest mb-3 text-purple-400 flex items-center gap-2">
            💍 Equipped Accessories
          </h2>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {['magic effects', 'eyes', 'head', 'face', 'shoulder', 'accessory'].map((slot, index) => {
              if (slot === 'accessory') {
                const allAccessories = (equippedItems || []).filter((cosmetic: any) => {
                  const itemSlot = cosmetic.shop_items?.slot;
                  return ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'].includes(itemSlot);
                });

                return (
                  <div key="multi-accessory" className="aspect-square flex flex-col p-2 bg-slate-900/80 border border-purple-500/50 rounded-sm shadow-[0_0_10px_rgba(168,85,247,0.15)] relative group transition-all">
                    <div className="grid grid-cols-3 grid-rows-2 gap-1 w-full h-[calc(100%-10px)] mb-2">
                      {Array.from({ length: 6 }, (_, accessoryIndex) => {
                        const equippedAccessory = allAccessories[accessoryIndex];
                        const rarity = equippedAccessory?.shop_items?.rarity?.toLowerCase() || 'common';
                        
                        return (
                          <div key={accessoryIndex} className="aspect-square bg-black/40 border border-white/5 flex items-center justify-center rounded-sm transition-all relative overflow-hidden">
                            {equippedAccessory ? (
                              <>
                                                                {/* Micro Radiating Energy */}
                                <div 
                                  className="absolute inset-[-8%] radiating-energy opacity-40"
                                  style={{ 
                                    '--energy-color': 
                                      rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                                      rarity === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                                      rarity === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                                      rarity === 'legendary' ? 'rgba(255, 255, 0, 0.4)' :
                                      rarity === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                                      'transparent'
                                  } as any}
                                />
                                <div className="relative z-10 w-full h-full p-0.5 transition-transform group-hover:scale-110">
                                  <ShopItemMedia item={equippedAccessory.shop_items} className={`w-full h-full object-contain ${rarity !== 'common' ? 'shiny-item' : ''}`} />
                                </div>
                              </>
                            ) : (
                              <Lock size={6} className="text-gray-800 opacity-40" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="absolute bottom-1 w-full left-0 text-[6px] font-black uppercase text-gray-500 text-center tracking-tighter">Multi-Accessory</span>
                  </div>
                );
              }

              const equippedItem = (equippedItems || []).find((cosmetic: any) => cosmetic.shop_items?.slot === slot);
              const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';

              return (
                <div 
                  key={slot} 
                  className={`aspect-square flex flex-col items-center justify-center p-2 transition-all relative border ${
                    equippedItem 
                      ? 'bg-slate-900/80 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'bg-black/40 border-gray-800 border-dashed'
                  } rounded-sm group`}
                >
                  {equippedItem ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Shiny Radiating Energy Aura - Reduced Intensity */}
                      <div 
                        className="absolute inset-[-15%] radiating-energy"
                        style={{ 
                          '--energy-color': 
                            rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.15)' :
                            rarity === 'rare' ? 'rgba(59, 130, 246, 0.25)' :
                            rarity === 'epic' ? 'rgba(168, 85, 247, 0.35)' :
                            rarity === 'legendary' ? 'rgba(255, 255, 0, 0.35)' :
                            rarity === 'monarch' ? 'rgba(255, 215, 0, 0.6)' :
                            'transparent'
                        } as any}
                      />
                      
                      <div className="relative z-10 w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-md">
                        <ShopItemMedia item={equippedItem.shop_items} className={`w-full h-full object-contain ${rarity !== 'common' ? 'shiny-item' : ''}`} />
                      </div>
                    </div>
                  ) : (
                    <Lock size={16} className="text-gray-700 opacity-50" />
                  )}
                  <span className="absolute bottom-1 text-[6px] font-black uppercase text-gray-500 tracking-tighter">
                    {slot === 'magic effects' ? 'aura' :
                     slot === 'eyes' ? 'eyes' :
                     slot === 'head' ? 'Head' :
                     slot === 'face' ? 'face' :
                     slot === 'shoulder' ? 'Shoulder' :
                     slot}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-widest text-orange-400 flex items-center gap-2 mb-3">
            <img src="/inventory.png" alt="Inventory" className="w-5 h-5 object-contain" />
            Inventory
          </h2>

          <div className="flex items-center justify-between gap-1 mb-3">
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All', icon: '📦' },
                { id: 'equipped', label: 'Equipped', icon: '✅' },
                { id: 'weapons', label: 'Weapons', icon: '⚔️' },
                { id: 'armor', label: 'Armor', icon: '🛡️' },
                { id: 'accessories', label: 'Accessories', icon: '💍' },
                { id: 'magics', label: 'Magics', icon: '🔮' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInventoryFilter(tab.id as any)}
                  className={`px-2 py-1 text-[8px] font-bold uppercase transition-all clip-tech-button ${
                    inventoryFilter === tab.id
                      ? 'bg-orange-600/80 text-black border border-orange-500/50 shadow-lg shadow-orange-500/20 backdrop-blur-sm'
                      : 'bg-slate-900/60 text-gray-300 hover:bg-slate-800/80 border border-white/10 backdrop-blur-md'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setInventorySortAZ(!inventorySortAZ)}
              className={`px-2 py-1 text-[8px] font-bold uppercase rounded transition-all clip-tech-button ${
                inventorySortAZ
                  ? 'bg-blue-600/80 text-white hover:bg-blue-500 border border-blue-400/50 shadow-lg shadow-blue-500/20 backdrop-blur-sm'
                  : 'bg-slate-900/60 text-gray-300 hover:bg-slate-800/80 border border-white/10 backdrop-blur-md'
              }`}
              title={inventorySortAZ ? 'Switch to Acquisition Order' : 'Sort A-Z'}
            >
              {inventorySortAZ ? '🔤 A-Z' : '📅 Recent'}
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {getFilteredInventoryItems().length === 0 && <p className="text-[10px] text-gray-600 italic col-span-full">No items in this category...</p>}
            {getFilteredInventoryItems().map((cosmeticItem: any) => {
              const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
              if (!item) return null;
              const rarity = item.rarity?.toLowerCase() || 'common';

              return (
                <div
                  key={cosmeticItem.id}
                  className={`aspect-square p-3 flex flex-col items-center justify-center cursor-pointer transition-all relative group backdrop-blur-md rounded-sm border ${
                    cosmeticItem.equipped
                      ? 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)] bg-green-900/20'
                      : 'border-white/10 bg-slate-900/80 hover:bg-slate-800/80 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedInventoryItem({ item, cosmeticItem })}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                    {/* Shiny Radiating Energy Aura - Reduced Intensity */}
                    <div 
                      className="absolute inset-[-25%] radiating-energy"
                      style={{ 
                        '--energy-color': 
                          rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                          rarity === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                          rarity === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                          rarity === 'legendary' ? 'rgba(255, 255, 0, 0.4)' :
                          rarity === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                          'transparent'
                      } as any}
                    />
                    
                    <div className="relative z-10 w-full h-full p-1 transition-transform group-hover:scale-110 drop-shadow-md">
                      <ShopItemMedia item={item} className={`w-full h-full object-contain rounded ${rarity !== 'common' ? 'shiny-item' : ''}`} />
                    </div>
                  </div>

                  <div className="text-[9px] font-black uppercase text-center leading-tight mb-3 text-white drop-shadow-sm truncate w-full">
                    {item.name}
                  </div>

                  {item.slot === 'other' ? (
                    <div className="w-full py-1.5 bg-gray-800/80 text-gray-500 text-[8px] font-black uppercase text-center border-b-2 border-black/40 cursor-default">
                      Consumable
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEquipCosmetic(cosmeticItem.id, !cosmeticItem.equipped);
                      }}
                      className={`w-full py-1.5 clip-tech-button text-[8px] font-black uppercase transition-all border-b-2 border-black/40 ${
                        cosmeticItem.equipped
                          ? 'bg-slate-700/80 hover:bg-slate-600 text-gray-300'
                          : 'bg-green-600/80 hover:bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                      }`}
                    >
                      {cosmeticItem.equipped ? 'UNEQUIP' : 'EQUIP'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {selectedInventoryItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-4 max-w-sm w-full clip-tech-card relative shadow-2xl">
            <button
              onClick={() => setSelectedInventoryItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-xl font-bold"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden mb-3 border border-green-500/30">
                <ShopItemMedia item={selectedInventoryItem.item} className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-black italic text-white mb-2 uppercase tracking-tighter">{selectedInventoryItem.item.name}</h3>
              <div className="text-xs text-purple-400 font-bold uppercase mb-2">
                {selectedInventoryItem.item.slot.replace(/_/g, ' ')}
              </div>

              {(selectedInventoryItem.item.min_level && selectedInventoryItem.item.min_level > 1) ||
               (selectedInventoryItem.item.class_req && selectedInventoryItem.item.class_req !== 'All') ||
               (selectedInventoryItem.item.gender && 
                ((Array.isArray(selectedInventoryItem.item.gender) && !selectedInventoryItem.item.gender.includes('unisex')) || 
                 (!Array.isArray(selectedInventoryItem.item.gender) && selectedInventoryItem.item.gender !== 'unisex'))) ? (
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {selectedInventoryItem.item.min_level && selectedInventoryItem.item.min_level > 1 && (
                    <div className="text-xs text-yellow-400 font-black uppercase px-2 py-1 bg-yellow-900/40 rounded border border-yellow-500/60">
                      ⚡ Lv. {selectedInventoryItem.item.min_level} Required
                    </div>
                  )}
                  {selectedInventoryItem.item.class_req && selectedInventoryItem.item.class_req !== 'All' && (
                    <div className="text-xs text-blue-400 font-black uppercase px-2 py-1 bg-blue-900/40 rounded border border-blue-500/60">
                      🛡️ {selectedInventoryItem.item.class_req} Only
                    </div>
                  )}
                  {selectedInventoryItem.item.gender && 
                   ((Array.isArray(selectedInventoryItem.item.gender) && !selectedInventoryItem.item.gender.includes('unisex')) || 
                    (!Array.isArray(selectedInventoryItem.item.gender) && selectedInventoryItem.item.gender !== 'unisex')) && (
                    <div className="text-xs text-pink-400 font-black uppercase px-2 py-1 bg-pink-900/40 rounded border border-pink-500/60">
                      👤 {Array.isArray(selectedInventoryItem.item.gender) ? selectedInventoryItem.item.gender.join('/') : selectedInventoryItem.item.gender} Only
                    </div>
                  )}
                </div>
              ) : null}

              <div className="text-sm text-blue-400 mb-3 leading-relaxed">
                {selectedInventoryItem.item.description || 'Visual item'}
              </div>

              {((selectedInventoryItem.item.bonuses && selectedInventoryItem.item.bonuses.length > 0) ||
                selectedInventoryItem.item.bonus_type) && (
                <div className="text-xs text-green-400 font-bold mb-3">
                  {getFullDescription(selectedInventoryItem.item)}
                </div>
              )}

              {selectedInventoryItem.item.is_animated && (
                <div className="text-xs text-cyan-400 font-bold mb-3">
                  ✨ ANIMATED EFFECT
                </div>
              )}

              <div className="text-xs text-yellow-400 font-bold mb-3 uppercase">
                {selectedInventoryItem.item.rarity || 'common'} rarity
              </div>

              <div className="text-xs font-bold mb-3">
                {selectedInventoryItem.cosmeticItem.equipped ? (
                  <span className="text-green-400">✅ EQUIPPED</span>
                ) : (
                  <span className="text-gray-400">❌ NOT EQUIPPED</span>
                )}
              </div>

              <button
                onClick={() => setSelectedInventoryItem(null)}
                className="w-full px-4 py-2 font-black uppercase text-xs transition-all shimmer-effect bg-gray-700 hover:bg-gray-600 text-white border-b-4 border-gray-900 clip-tech-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAvatar && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-2 sm:p-4">
          <div className="system-glass w-fit max-w-[98vw] aspect-square relative flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Minimal Header - Just Close button, no name/card */}
            <div className="absolute top-0 right-0 p-3 sm:p-4 z-50 pointer-events-none">
              <button
                onClick={() => setSelectedAvatar(null)}
                className="pointer-events-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all border border-red-500/20 backdrop-blur-md shadow-lg"
              >
                CLOSE
              </button>
            </div>

            {/* Content Area - Perfect Fit */}
            <div className="relative bg-[#020617] flex items-center justify-center overflow-hidden">
              <LayeredAvatar
                user={selectedAvatar}
                size={typeof window !== 'undefined' ? (window.innerWidth < 640 ? Math.min(window.innerWidth - 16, 450) : 512) : 512}
                className="cursor-default"
                onAvatarClick={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto clip-tech-card relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAvatarModal(false);
              }}
              className="absolute top-2 right-2 p-3 text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95 z-[210] group"
              aria-label="Close Modal"
            >
              <div className="bg-slate-900/60 rounded-full p-1 border border-white/10 group-hover:border-white/30 backdrop-blur-md">
                <X size={24} />
              </div>
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-header font-black uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] flex items-center justify-center gap-3">
                <img src="/changeavatar.png" alt="Avatar" className="w-8 h-8" />
                Avatar Customization
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">
                Choose your hunter's appearance
              </p>
            </div>

            <div className="space-y-4">
              {user.cosmetics?.filter((cosmetic: any) => cosmetic.shop_items?.slot === 'avatar').length === 0 ? (
                <div className="tech-panel clip-tech-card p-10 text-center border-dashed border-gray-700">
                  <div className="text-4xl mb-3 opacity-50">🎭</div>
                  <p className="text-sm text-gray-400 font-bold uppercase">No holographic avatars in inventory</p>
                  <p className="text-[10px] text-gray-600 mt-1 uppercase">Acquire new forms from the Hunter Shop</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {user.cosmetics?.filter((cosmetic: any) => cosmetic.shop_items?.slot === 'avatar').map((cosmetic: any) => {
                    const item = cosmetic.shop_items;
                    const isEquipped = cosmetic.equipped;

                    return (
                      <div
                        key={cosmetic.id}
                        className={`p-4 clip-tech-slot flex flex-col items-center text-center transition-all cursor-pointer group relative ${
                          isEquipped
                            ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                            : 'tech-panel border-gray-700 hover:border-yellow-500/40'
                        }`}
                        onClick={() => setSelectedInventoryItem({ item, cosmeticItem: cosmetic })}
                      >
                        <div className="relative w-20 h-20 mb-3">
                          <div className={`absolute inset-0 rounded-full animate-pulse opacity-20 ${isEquipped ? 'bg-yellow-400' : 'bg-transparent'}`} />
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full rounded-full border-2 border-yellow-500/50 relative z-10"
                          />
                        </div>
                        <div className="text-xs font-black text-yellow-400 uppercase tracking-tight mb-1">{item.name}</div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase mb-3 line-clamp-1">{item.rarity || 'common'} class</div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipCosmetic(cosmetic.id, !cosmetic.equipped);
                          }}
                          className={`w-full py-2 text-[9px] font-black uppercase tracking-widest border-b-4 clip-tech-button transition-all ${
                            isEquipped
                              ? 'text-gray-300 bg-gray-800 border-gray-900'
                              : 'text-white bg-green-600 border-green-900 hover:brightness-110 active:translate-y-[2px] active:border-b-2'
                          }`}
                        >
                          {isEquipped ? 'UNEQUIP' : 'CHANGE AVATAR'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBackgroundModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto clip-tech-card relative shadow-2xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBackgroundModal(false);
              }}
              className="absolute top-2 right-2 p-3 text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95 z-[210] group"
              aria-label="Close Modal"
            >
              <div className="bg-slate-900/60 rounded-full p-1 border border-white/10 group-hover:border-white/30 backdrop-blur-md">
                <X size={24} />
              </div>
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-header font-black uppercase tracking-widest text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] flex items-center justify-center gap-3">
                <img src="/backgroundicon.png" alt="Background" className="w-8 h-8" />
                Background Customization
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">
                Choose your hunter's background
              </p>
            </div>

            <div className="space-y-4">
              {user.cosmetics?.filter((cosmetic: any) => cosmetic.shop_items?.slot === 'background').length === 0 ? (
                <div className="tech-panel clip-tech-card p-10 text-center border-dashed border-gray-700">
                  <div className="text-4xl mb-3 opacity-50">🏞️</div>
                  <p className="text-sm text-gray-400 font-bold uppercase">No holographic backgrounds in inventory</p>
                  <p className="text-[10px] text-gray-600 mt-1 uppercase">Acquire new backgrounds from the Hunter Shop</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {user.cosmetics?.filter((cosmetic: any) => cosmetic.shop_items?.slot === 'background').map((cosmetic: any) => {
                    const item = cosmetic.shop_items;
                    const isEquipped = cosmetic.equipped;

                    return (
                      <div
                        key={cosmetic.id}
                        className={`p-4 clip-tech-slot flex flex-col items-center text-center transition-all cursor-pointer group relative ${
                          isEquipped
                            ? 'bg-green-900/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                            : 'tech-panel border-gray-700 hover:border-green-500/40'
                        }`}
                        onClick={() => setSelectedInventoryItem({ item, cosmeticItem: cosmetic })}
                      >
                        <div className="relative w-20 h-20 mb-3">
                          <div className={`absolute inset-0 rounded-lg animate-pulse opacity-20 ${isEquipped ? 'bg-green-400' : 'bg-transparent'}`} />
                          <ShopItemMedia
                            item={item}
                            className="w-full h-full object-cover rounded-lg border-2 border-green-500/50 relative z-10"
                          />
                        </div>
                        <div className="text-xs font-black text-green-400 uppercase tracking-tight mb-1">{item.name}</div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase mb-3 line-clamp-1">{item.rarity || 'common'} class</div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipCosmetic(cosmetic.id, !cosmetic.equipped);
                          }}
                          className={`w-full py-2 text-[9px] font-black uppercase tracking-widest border-b-4 clip-tech-button transition-all ${
                            isEquipped
                              ? 'text-gray-300 bg-gray-800 border-gray-900'
                              : 'text-white bg-green-600 border-green-900 hover:brightness-110 active:translate-y-[2px] active:border-b-2'
                          }`}
                        >
                          {isEquipped ? 'UNEQUIP' : 'CHANGE BG'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
