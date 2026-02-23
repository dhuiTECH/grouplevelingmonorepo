"use client";

import { useState } from 'react';
// --- THE FIX: Use the existing supabase client from your lib folder ---
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import GachaScreen from '@/components/GachaScreen';
// import LottieAnimation from '@/components/LottieAnimation'; // Kept commented out as in your source

// --- NEW INTERFACE: Defines what a summoning result looks like ---
interface SummonResult {
  success: boolean;
  message: string;
  item_id: string;
  item_name: string;
  item_rarity: string;
  image_url: string;
  thumbnail_url?: string;
  is_animated?: boolean;
  animation_config?: any;
  new_balance: number;
}

interface ShopViewProps {
  user: User;
  shopItems: any[];
  // --- UPDATED PROP: We need a way to update the user's balance visually after summoning ---
  setUser: (user: User) => void; 
  handleBuyItem: (item: any, currency?: 'coins' | 'gems' | 'both') => void;
  isLoading?: boolean;
}

export default function ShopView({ user, shopItems, setUser, handleBuyItem, isLoading = false }: ShopViewProps) {
  // --- NEW STATE FOR GACHA ---
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonResult, setSummonResult] = useState<SummonResult | null>(null);
  // ---------------------------

  const [activeMainTab, setActiveMainTab] = useState<'hunter' | 'magic' | 'gacha'>('hunter');
  const [activeShopTab, setActiveShopTab] = useState('all');
  // const [shopSortAZ, setShopSortAZ] = useState(false); // Unused in provided code
  const [selectedShopItem, setSelectedShopItem] = useState<any>(null);
  // const [showItemPreview, setShowItemPreview] = useState(false); // Unused in provided code

  // --- NEW GACHA COSTS (Same for both pools - Gates for limited themes, Gachapon for general access) ---
  const getGachaCost = (useGems: boolean, poolType: 'gate' | 'gachapon') => {
    return useGems ? 10 : 500; // Same cost for both Gates and Gachapon
  };

  // --- NEW FUNCTION: Handles the connection to the backend ---
  const handleGachaSummon = async (useGems: boolean, poolType: 'gate' | 'gachapon' = 'gate') => {
    // 1. Checks before starting
    const cost = getGachaCost(useGems, poolType);
    const balance = useGems ? user.gems : user.coins;

    if (balance < cost) {
      alert(`Not enough ${useGems ? 'Gems' : 'Coins'}!`);
      return;
    }

    setIsSummoning(true);

    try {
      // 1.5. Validate User ID
      if (!user.id) {
        throw new Error('User ID is missing. Please log in again.');
      }

      // 2. Call the backend API route (which wraps the RPC)
      console.log('Initiating summon for user:', user.id, 'Cost:', cost, 'Using gems:', useGems, 'Pool:', poolType);
      
      const response = await fetch('/api/perform_summon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          poolType,
          useGems
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Summon request failed');
      }

      if (result.success) {
        // 3. On success: Show the reveal modal
        setSummonResult(result);
        
        // 4. Update the user's balance visually right away
        setUser({
          ...user,
          [useGems ? 'gems' : 'coins']: result.new_balance
        });
      } else {
        alert(`Summon failed: ${result.message}`);
      }

    } catch (error: any) {
      console.error('Gacha error details:', error);
      alert(`An error occurred during summoning: ${error?.message || error || 'Unknown error'}`);
    } finally {
      setIsSummoning(false);
    }
  };

  const getFilteredShopItems = () => {
    if (!shopItems.length) return [];

    const inventoryIds = (user.cosmetics || []).map((cosmetic: any) =>
      String(cosmetic.shop_item_id || cosmetic.shop_items?.id).trim()
    );

    let filtered = shopItems.filter(item => {
      const itemId = String(item.id).trim();
      const isOwned = inventoryIds.includes(itemId);
      // This check correctly hides gacha items from normal tabs
      const isGachaOnly = item.is_gacha_exclusive === true; 
      return !isOwned && !isGachaOnly;
    });

    if (activeShopTab === 'all') {
      return filtered.sort((a, b) => (a.is_featured === b.is_featured ? 0 : a.is_featured ? -1 : 1));
    }

    // Simple filter switch logic
    switch (activeShopTab) {
        case 'weapons': return filtered.filter(item => item.slot === 'weapon');
        case 'armor': return filtered.filter(item => item.slot === 'body');
        case 'accessories': return filtered.filter(item => item.slot === 'accessory');
        case 'magics': return filtered.filter(item => item.slot === 'magic effects');
        case 'avatar': return filtered.filter(item => item.slot === 'avatar');
        case 'background': return filtered.filter(item => item.slot === 'background');
        // Other strictly filters for the 'other' slot
        case 'other': return filtered.filter(item => item.slot === 'other');
        default: return [];
      }
  };

  // Helper to get the right glow based on rarity word
  // Helper to get text color based on rarity
  const getRarityTextColor = (rarity: string) => {
      const rarityLower = rarity?.toLowerCase() || 'common';
      if (rarityLower === 'uncommon') return 'text-green-400';
      if (rarityLower === 'rare') return 'text-blue-400';
      if (rarityLower === 'epic') return 'text-purple-400';
      if (rarityLower === 'legendary') return 'text-yellow-400';
      if (rarityLower === 'monarch') return 'text-yellow-500 font-black italic';
      return 'text-gray-300';
  };

  // (Unused helpers removed for brevity, but gender icon kept)
  const getGenderIcon = (gender: any) => {
    const genderArray = Array.isArray(gender) ? gender : [gender || 'unisex'];
    const normalizedGenders = genderArray.map((g: any) => String(g).toLowerCase());
    if (normalizedGenders.includes('male')) return { icon: '♂️', color: 'text-blue-400', bg: 'bg-blue-900/60', border: 'border-blue-500/60' };
    if (normalizedGenders.includes('female')) return { icon: '♀️', color: 'text-pink-400', bg: 'bg-pink-900/60', border: 'border-pink-500/60' };
    return { icon: '🌈', color: 'text-purple-400', bg: 'bg-purple-900/60', border: 'border-purple-500/60' };
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 relative">
        {/* --- LOADING OVERLAY during summon --- */}
        {isSummoning && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg">
                <div className="flex flex-col items-center">
                    <img src="/expcrystal.png" alt="Loading" className="w-16 h-16 animate-spin-slow opacity-80" />
                    <p className="text-cyan-400 font-header tracking-widest mt-4 animate-pulse">SUMMONING...</p>
                </div>
            </div>
        )}

      {/* Main Tabs Header */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <button
          onClick={() => setActiveMainTab('hunter')}
          className={`relative py-2 sm:py-3 px-2 sm:px-4 clip-tech-button border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 group ${
            activeMainTab === 'hunter'
              ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
              : 'bg-slate-900/40 border-white/5 text-gray-500 hover:border-yellow-500/20 hover:text-yellow-400/60'
          }`}
        >
          <img src="/shop/weapons.png" alt="Hunter" className="w-5 h-5 sm:w-8 sm:h-8 object-contain" />
          <span className="font-header font-black uppercase tracking-widest text-[8px] sm:text-[10px] md:text-sm">Hunter</span>
        </button>

        <button
          onClick={() => setActiveMainTab('magic')}
          className={`relative py-2 sm:py-3 px-2 sm:px-4 clip-tech-button border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 group ${
            activeMainTab === 'magic'
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : 'bg-slate-900/40 border-white/5 text-gray-500 hover:border-purple-500/20 hover:text-purple-400/60'
          }`}
        >
          <img src="/shop/cosmetics.png" alt="Magic" className="w-5 h-5 sm:w-8 sm:h-8 object-contain" />
          <span className="font-header font-black uppercase tracking-widest text-[8px] sm:text-[10px] md:text-sm">Magic</span>
        </button>

        <button
          onClick={() => setActiveMainTab('gacha')}
          className={`relative py-2 sm:py-3 px-2 sm:px-4 clip-tech-button border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 group ${
            activeMainTab === 'gacha'
              ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/40 border-white/5 text-gray-500 hover:border-yellow-500/20 hover:text-yellow-400/60'
          }`}
        >
          <img src="/expcrystal.png" alt="Gacha" className="w-5 h-5 sm:w-8 sm:h-8 object-contain" />
          <span className="font-header font-black uppercase tracking-widest text-[8px] sm:text-[10px] md:text-sm">Gacha</span>
        </button>
      </div>

      {/* Content Body */}
      {activeMainTab === 'hunter' ? (
        // --- HUNTER TAB CONTENT ---
        <>
          <div className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-[12px] font-header font-black uppercase tracking-[0.4em] mb-2 text-yellow-400">Hunter's Shop</h2>
              <p className="text-[8px] text-cyan-400 uppercase tracking-widest">Acquire relics with coins & gems</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-900/60 px-3 py-2 border border-white/10 flex items-center gap-2">
                <img src="/coinicon.png" alt="Coins" className="w-5 h-5" />
                <span className="text-[10px] font-mono font-black text-yellow-400">{(user.coins || 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/60 px-3 py-2 border border-white/10 flex items-center gap-2">
                <img src="/gemicon.png" alt="Gems" className="w-5 h-5" />
                <span className="text-[10px] font-mono font-black text-purple-400">{(user.gems || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {[
              { id: 'all', label: 'All', icon: '/shop/allitems.png' },
              { id: 'weapons', label: 'Weapons', icon: '/shop/weapons.png' },
              { id: 'armor', label: 'Armor', icon: '/shop/armour.png' },
              { id: 'accessories', label: 'Access.', icon: '/shop/accessories.png' },
              { id: 'avatar', label: 'Avatar', icon: '/changeavatar.png' },
              { id: 'background', label: 'Background', icon: '/backgroundicon.png' },
              { id: 'other', label: 'Other', icon: '/shop/other.png' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveShopTab(tab.id)}
                className={`px-2 py-2 clip-tech-button text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${
                  activeShopTab === tab.id ? 'bg-yellow-600 text-black border-yellow-400' : 'bg-slate-900/60 text-gray-200 border-white/10'
                }`}
              >
                <img src={tab.icon} alt={tab.label} className="w-5 h-5 object-contain" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {getFilteredShopItems().filter(i => i.slot !== 'magic effects').map(item => {
              const canAfford = user.coins >= item.price;
              const levelMet = (user.level || 1) >= (item.min_level || 1);
              const classMet = !item.class_req || item.class_req === 'All' || user.current_class === item.class_req;
              
              const genderInfo = getGenderIcon(item.gender);
              const isCard = item.item_effects?.subtype === 'calling_card';

              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedShopItem(item)}
                  className="p-5 flex flex-col items-center text-center bg-slate-900/80 border border-white/10 rounded-sm relative cursor-pointer hover:bg-slate-800/80 transition-all group backdrop-blur-md"
                >
                  {isCard && (
                    <div className="absolute top-2 right-6 z-20 bg-purple-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse">
                      CARD
                    </div>
                  )}
                  <div className={`absolute top-1 right-1 text-[8px] font-black ${genderInfo.color} ${genderInfo.bg} rounded-full w-4 h-4 flex items-center justify-center`}>
                    {genderInfo.icon}
                  </div>
                  
                  {/* Requirements Badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                    {item.min_level > 1 && (
                      <div className={`text-[7px] font-black px-1 rounded ${levelMet ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        LV.{item.min_level}
                      </div>
                    )}
                    {item.class_req && item.class_req !== 'All' && (
                      <div className={`text-[7px] font-black px-1 rounded ${classMet ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {item.class_req.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className={`mb-4 h-16 w-16 flex items-center justify-center relative`}>
                    {/* Shiny Radiating Energy Aura */}
                    <div 
                      className="absolute inset-[-25%] radiating-energy"
                      style={{ 
                        '--energy-color': 
                          item.rarity?.toLowerCase() === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                          item.rarity?.toLowerCase() === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                          item.rarity?.toLowerCase() === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                          item.rarity?.toLowerCase() === 'legendary' ? 'rgba(255, 255, 0, 0.4)' :
                          item.rarity?.toLowerCase() === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                          'transparent'
                      } as any}
                    />
                    
                    <div className={`relative z-10 w-full h-full p-1 transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                      <ShopItemMedia item={item} className={`w-full h-full object-contain ${item.rarity?.toLowerCase() !== 'common' ? 'shiny-item' : ''}`} />
                    </div>
                  </div>

                  <div className="text-[11px] font-black uppercase tracking-tight text-white mb-4 drop-shadow-md">{item.name}</div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyItem(item);
                    }}
                    className={`mt-auto w-full py-2.5 text-[10px] font-black flex items-center justify-center gap-2 clip-tech-button transition-all border-b-2 border-black/40 ${
                      canAfford
                        ? 'bg-green-600/80 hover:bg-green-500 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                        : 'bg-slate-800/80 text-gray-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <img src="/coinicon.png" alt="Coins" className="w-3.5 h-3.5" /> {item.price}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : activeMainTab === 'magic' ? (
        // --- MAGIC TAB CONTENT ---
        <div className="space-y-6">
          <div className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-[12px] font-header font-black uppercase tracking-[0.4em] mb-2 text-purple-400">Magic Shop</h2>
              <p className="text-[8px] text-cyan-400 uppercase tracking-widest">Acquire mysticals with coins and gems</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-900/60 px-3 py-2 border border-white/10 flex items-center gap-2">
                <img src="/coinicon.png" alt="Coins" className="w-5 h-5" />
                <span className="text-[10px] font-mono font-black text-yellow-400">{(user.coins || 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/60 px-3 py-2 border border-white/10 flex items-center gap-2">
                <img src="/gemicon.png" alt="Gems" className="w-5 h-5" />
                <span className="text-[10px] font-mono font-black text-purple-400">{(user.gems || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {getFilteredShopItems().filter(item => item.slot === 'magic effects').map(item => {
              const requiresCoins = item.price && item.price > 0;
              const requiresGems = item.gem_price && item.gem_price > 0;
              const canAffordCoins = !requiresCoins || user.coins >= item.price;
              const canAffordGems = !requiresGems || user.gems >= item.gem_price;
              const canAfford = canAffordCoins && canAffordGems;
              const levelMet = (user.level || 1) >= (item.min_level || 1);
              const classMet = !item.class_req || item.class_req === 'All' || user.current_class === item.class_req;
              const isCard = item.item_effects?.subtype === 'calling_card';

              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedShopItem(item)}
                  className="p-5 flex flex-col items-center text-center bg-slate-900/80 border border-white/10 rounded-sm relative cursor-pointer hover:bg-slate-800/80 transition-all group backdrop-blur-md"
                >
                  {isCard && (
                    <div className="absolute top-2 right-2 z-20 bg-purple-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse">
                      CARD
                    </div>
                  )}
                  {/* Requirements Badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                    {item.min_level > 1 && (
                      <div className={`text-[7px] font-black px-1 rounded ${levelMet ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        LV.{item.min_level}
                      </div>
                    )}
                    {item.class_req && item.class_req !== 'All' && (
                      <div className={`text-[7px] font-black px-1 rounded ${classMet ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {item.class_req.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className={`mb-4 h-16 w-16 flex items-center justify-center relative`}>
                    {/* Background Rarity Glow - Immersive Style - Reduced Intensity */}
                    <div className={`absolute inset-0 opacity-40 blur-xl rounded-full ${
                      item.rarity?.toLowerCase() === 'uncommon' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' :
                      item.rarity?.toLowerCase() === 'legendary' ? 'bg-yellow-400 shadow-[0_0_40px_rgba(255,255,0,0.8)] animate-pulse' :
                      item.rarity?.toLowerCase() === 'monarch' ? 'bg-amber-500 shadow-[0_0_50px_rgba(255,215,0,0.9)] monarch-gold-glow' :
                      (item.rarity?.toLowerCase() === 'rare' || item.rarity?.toLowerCase() === 'epic') ? 'bg-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.8)]' : 
                      'bg-transparent'
                    }`} />
                    
                    <div className={`relative z-10 w-full h-full p-1 transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                      <ShopItemMedia item={item} className={`w-full h-full object-contain ${item.rarity?.toLowerCase() !== 'common' ? 'shiny-item' : ''}`} />
                    </div>
                  </div>

                  <div className="text-[11px] font-black uppercase tracking-tight text-white mb-4 drop-shadow-md">{item.name}</div>

                  <div className="mt-auto w-full space-y-1">
                    {/* Price Requirements */}
                    {(requiresCoins || requiresGems) && (
                      <div className="text-center mb-2">
                        <div className="text-[8px] text-gray-400 font-bold uppercase mb-1">Requirements</div>
                        <div className="flex gap-2 justify-center">
                          {requiresCoins && (
                            <div className={`flex items-center gap-1 px-2 py-1 text-[8px] font-bold clip-tech-button ${
                              canAffordCoins
                                ? 'bg-green-600/80 text-white border-green-500/50'
                                : 'bg-red-600/80 text-white border-red-500/50'
                            }`}>
                              <img src="/coinicon.png" alt="Coins" className="w-3 h-3" />
                              {item.price}
                            </div>
                          )}
                          {requiresGems && (
                            <div className={`flex items-center gap-1 px-2 py-1 text-[8px] font-bold clip-tech-button ${
                              canAffordGems
                                ? 'bg-green-600/80 text-white border-green-500/50'
                                : 'bg-red-600/80 text-white border-red-500/50'
                            }`}>
                              <img src="/gemicon.png" alt="Gems" className="w-3 h-3" />
                              {item.gem_price}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Buy Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyItem(item, 'both');
                      }}
                      className={`w-full py-2 text-[10px] font-black flex items-center justify-center gap-2 clip-tech-button transition-all border-b-2 border-black/40 ${
                        canAfford
                          ? 'bg-green-600/80 hover:bg-green-500 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                          : 'bg-slate-800/80 text-gray-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {requiresCoins && <img src="/coinicon.png" alt="Coins" className="w-3 h-3" />}
                        {requiresGems && <img src="/gemicon.png" alt="Gems" className="w-3 h-3" />}
                      </div>
                      BUY ({requiresCoins && requiresGems ? 'BOTH' : requiresGems ? 'GEMS' : 'COINS'})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- NEW GACHA TAB CONTENT ---
        <GachaScreen 
          onSummon={handleGachaSummon}
          isSummoning={isSummoning}
          coins={user.coins || 0}
          gems={user.gems || 0}
        />
      )}

      {/* Normal Shop Item Details Modal */}
      {selectedShopItem && !summonResult && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4" onClick={() => setSelectedShopItem(null)}>
          <div className="bg-slate-900 p-6 clip-tech-card max-w-md w-full border border-cyan-500/20 tech-panel" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 mb-6 p-2 rounded-lg border-2 border-white/10 relative overflow-hidden bg-slate-900/50">
                {/* Shiny Radiating Energy Aura */}
                <div 
                  className="absolute inset-[-12%] radiating-energy"
                  style={{ 
                  '--energy-color': 
                    selectedShopItem.rarity?.toLowerCase() === 'uncommon' ? 'rgba(34, 197, 94, 0.4)' :
                    selectedShopItem.rarity?.toLowerCase() === 'rare' ? 'rgba(59, 130, 246, 0.5)' :
                    selectedShopItem.rarity?.toLowerCase() === 'epic' ? 'rgba(168, 85, 247, 0.6)' :
                    selectedShopItem.rarity?.toLowerCase() === 'legendary' ? 'rgba(251, 191, 36, 0.7)' :
                    'transparent'
                  } as any}
                />
                <ShopItemMedia item={selectedShopItem} className={`relative z-10 w-full h-full object-contain ${selectedShopItem.rarity?.toLowerCase() !== 'common' ? 'shiny-item' : ''}`} />
              </div>
              <h3 className={`text-2xl font-header font-black uppercase mb-2 ${getRarityTextColor(selectedShopItem.rarity)}`}>{selectedShopItem.name}</h3>
              <p className="text-sm text-gray-300 font-bold uppercase tracking-wider mb-4">{selectedShopItem.rarity}</p>
              
              {/* Detailed Requirements in Modal */}
              <div className="flex gap-4 mb-6">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-500 uppercase font-black">Min Level</span>
                  <span className={`text-lg font-black ${(user.level || 1) >= (selectedShopItem.min_level || 1) ? 'text-cyan-400' : 'text-red-500'}`}>
                    {selectedShopItem.min_level || 1}
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10 self-center" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-500 uppercase font-black">Class Req</span>
                  <span className={`text-lg font-black ${(!selectedShopItem.class_req || selectedShopItem.class_req === 'All' || user.current_class === selectedShopItem.class_req) ? 'text-purple-400' : 'text-red-500'}`}>
                    {selectedShopItem.class_req || 'ALL'}
                  </span>
                </div>
              </div>

              <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">{selectedShopItem.description}</p>
              <button onClick={() => setSelectedShopItem(null)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white uppercase text-sm font-bold clip-tech-button transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW GACHA REVEAL MODAL --- */}
      {summonResult && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
              <style jsx global>{`
                @keyframes monarch-pulse-gold {
                  0% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4), inset 0 0 10px rgba(234, 179, 8, 0.2); border-color: #eab308; }
                  50% { box-shadow: 0 0 45px rgba(234, 179, 8, 0.7), inset 0 0 20px rgba(234, 179, 8, 0.4); border-color: #fbbf24; }
                  100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4), inset 0 0 10px rgba(234, 179, 8, 0.2); border-color: #eab308; }
                }

                .monarch-gold-glow {
                  animation: monarch-pulse-gold 3s infinite ease-in-out;
                  background: linear-gradient(to bottom, rgba(234, 179, 8, 0.15), transparent) !important;
                  border-width: 2px !important;
                  position: relative;
                  overflow: hidden;
                }

                .monarch-gold-glow::after {
                  content: "";
                  position: absolute;
                  top: -100%;
                  left: -100%;
                  width: 300%;
                  height: 300%;
                  background: linear-gradient(
                    45deg,
                    transparent 45%,
                    rgba(255, 255, 255, 0.1) 50%,
                    transparent 55%
                  );
                  animation: mana-swipe 4s infinite linear;
                  pointer-events: none;
                }

                @keyframes mana-swipe {
                  0% { transform: translate(-20%, -20%); }
                  100% { transform: translate(20%, 20%); }
                }
              `}</style>
              <div 
                className={`relative bg-slate-900/80 p-8 clip-tech-card max-w-md w-full border-2 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 ${
                  summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'monarch-gold-glow' : ''
                }`}
                style={{ borderColor: summonResult.item_rarity?.toLowerCase() === 'monarch' ? undefined : getRarityTextColor(summonResult.item_rarity).replace('text-', '') }}
              >
                  <h2 className="text-3xl font-header font-black uppercase tracking-[0.2em] mb-8 text-white drop-shadow-lg relative z-10">
                      {summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'Sovereign Manifestation' : 'System Acquired'}
                  </h2>

                  {/* Item Image Container with specialized radiance */}
                  <div className="relative z-10 w-48 h-48 mb-6 p-4 rounded-xl border-4 border-white/20 bg-slate-900/80 backdrop-blur-md overflow-visible">
                      {/* Shiny Radiating Energy Aura */}
                      <div 
                        className="absolute inset-[-25%] radiating-energy"
                        style={{ 
                          '--energy-color': 
                          summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                          summonResult.item_rarity?.toLowerCase() === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                          summonResult.item_rarity?.toLowerCase() === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                          summonResult.item_rarity?.toLowerCase() === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                          summonResult.item_rarity?.toLowerCase() === 'legendary' ? 'rgba(255, 255, 0, 0.5)' :
                          'transparent'
                        } as any}
                      />
                      <div className={`relative z-20 w-full h-full object-contain scale-110 ${
                          summonResult.item_rarity?.toLowerCase() !== 'common' ? 'shiny-item' : ''
                        } ${
                          summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'drop-shadow-[0_0_30px_rgba(168,85,247,1)]' : ''
                        }`}>
                        <ShopItemMedia 
                          item={{
                            image_url: summonResult.image_url,
                            thumbnail_url: summonResult.thumbnail_url,
                            is_animated: summonResult.is_animated,
                            animation_config: summonResult.animation_config,
                            name: summonResult.item_name
                          }} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                  </div>

                  {/* Item Name & Rarity */}
                  <h3 className={`relative z-10 text-2xl font-black uppercase mb-2 ${summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'text-yellow-500' : getRarityTextColor(summonResult.item_rarity)}`}>
                      {summonResult.item_name}
                  </h3>
                  <p className="relative z-10 text-sm text-white/80 uppercase tracking-widest font-bold mb-8">
                      {summonResult.item_rarity?.toLowerCase() === 'monarch' ? '[SOVEREIGN CLASS IDENTIFIER]' : `[${summonResult.item_rarity} Class Identifier]`}
                  </p>

                  {/* Close / Accept Button */}
                  <button 
                      onClick={() => setSummonResult(null)}
                      className={`relative z-10 w-full py-3 px-6 clip-tech-button font-header font-black uppercase tracking-wider text-lg transition-all
                          ${summonResult.item_rarity?.toLowerCase() === 'monarch' ? 'bg-gradient-to-r from-purple-600 to-yellow-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 
                            summonResult.item_rarity === 'legendary' ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 
                            summonResult.item_rarity === 'epic' ? 'bg-purple-600 hover:bg-purple-500 text-white' :
                            'bg-cyan-700 hover:bg-cyan-600 text-white'}`}
                  >
                      ACCEPT INTEGRATION
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}