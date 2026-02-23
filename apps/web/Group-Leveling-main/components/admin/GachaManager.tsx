import React, { useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';

interface GachaManagerProps {
  collections: any[];
  shopItems: any[];
  onCreateCollection: (data: any) => void;
  onDeleteCollection: (id: string) => void;
  onActivateTheme: (id: string) => void;
  onUpdateItems: (collectionId: string, itemIds: string[]) => void;
}

export default function GachaManager({
  collections,
  shopItems,
  onCreateCollection,
  onDeleteCollection,
  onActivateTheme,
  onUpdateItems
}: GachaManagerProps) {
  const [showAddGachaCollection, setShowAddGachaCollection] = useState(false);
  // unused state: selectedFile, uploading

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
          <Sparkles size={22} /> Gacha Collection Manager
        </h2>
        <button
          onClick={() => setShowAddGachaCollection(!showAddGachaCollection)}
          className="px-4 py-2 clip-tech-button bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <Plus size={18} /> New Collection
        </button>
      </div>

      {showAddGachaCollection && (
        <div className="bg-gray-900/60 border border-purple-900/30 p-6 rounded-2xl animate-in slide-in-from-top-4">
          <h3 className="text-sm font-black uppercase text-purple-300 mb-4">Create New Collection</h3>
          <form onSubmit={(e: any) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            onCreateCollection({
              name: formData.get('name'),
              description: formData.get('description'),
              cover_image_url: formData.get('cover_image_url')
            });
            setShowAddGachaCollection(false);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Theme Name</label>
                <input name="name" required className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" placeholder="e.g. Shadow Realm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Pool Type</label>
                <select name="pool_type" className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none">
                  <option value="gate">Gacha Gate</option>
                  <option value="gachapon">Gachapon (Items/Consumables)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Cover URL (Video/Image)</label>
              <input name="cover_image_url" required className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" placeholder="/gates.png" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Description</label>
              <textarea name="description" rows={2} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" placeholder="Describe this collection..." />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddGachaCollection(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white uppercase">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded shadow-lg shadow-purple-500/20">Create Collection</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections.map((collection: any) => (
          <div key={collection.id} className={`bg-gray-900/40 border ${collection.is_active ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-gray-800'} p-5 rounded-2xl relative overflow-hidden transition-all hover:bg-gray-900/60`}>
            {collection.is_active && (
              <div className="absolute top-3 right-3 bg-purple-500 text-[10px] font-black px-2 py-1 rounded text-white uppercase tracking-tighter animate-pulse">
                Live Now
              </div>
            )}
            
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-gray-800 relative">
                {collection.cover_image_url?.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={collection.cover_image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={collection.cover_image_url || '/placeholder.jpg'} className="w-full h-full object-cover" />
                )}
                <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                  collection.pool_type === 'gate' ? 'bg-red-600 text-white' : 'bg-cyan-600 text-white'
                }`}>
                  {collection.pool_type === 'gate' ? 'Gate' : 'Gachapon'}
                </div>
              </div>
              <div>
                <h3 className="font-black text-gray-100 uppercase tracking-tight flex items-center gap-2">
                  {collection.name}
                </h3>
                <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 uppercase leading-tight font-bold">{collection.description}</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => onActivateTheme(collection.id)}
                    disabled={collection.is_active}
                    className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${collection.is_active ? 'bg-purple-500/20 text-purple-400 cursor-default' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'}`}
                  >
                    {collection.is_active ? 'Active' : 'Activate Theme'}
                  </button>
                  <button 
                    onClick={() => onDeleteCollection(collection.id)}
                    className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded text-[10px] font-black uppercase transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
                Attached Items ({
                  shopItems.filter((item: any) => 
                    item.is_gacha_exclusive && (
                      item.collection_id === collection.id || 
                      collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id)
                    )
                  ).length
                })
              </label>
              <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-1">
                  {shopItems.filter((item: any) => 
                    item.is_gacha_exclusive && (
                      item.collection_id === collection.id || 
                      collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id)
                    )
                  ).map((item: any) => {
                    const isLinkedViaColumn = item.collection_id === collection.id;
                    const isLinkedViaJunction = collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id);
                    const isAttached = isLinkedViaColumn || isLinkedViaJunction;
                    
                    return (
                      <label key={item.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${isAttached ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-black/20 border border-gray-800 hover:border-gray-700'}`}>
                        <input 
                          type="checkbox" 
                          checked={isAttached}
                          disabled={isLinkedViaColumn} // Disable if linked via the more permanent column
                          onChange={(e) => {
                            const currentIds = collection.collection_items?.map((ci: any) => ci.shop_item_id) || [];
                            const newIds = e.target.checked 
                              ? [...currentIds, item.id]
                              : currentIds.filter((id: string) => id !== item.id);
                            onUpdateItems(collection.id, newIds);
                          }}
                          className={`w-3 h-3 text-purple-600 bg-black border-gray-700 rounded ${isLinkedViaColumn ? 'opacity-50' : ''}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-gray-300 truncate uppercase">{item.name}</p>
                        </div>
                        <div className="flex gap-1">
                          {isLinkedViaColumn && (
                            <div className="text-[7px] font-black px-1 py-0.5 rounded bg-blue-900/40 text-blue-400 uppercase border border-blue-500/30">
                              Linked
                            </div>
                          )}
                          <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                            {item.slot}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              {shopItems.filter((item: any) => item.is_gacha_exclusive).length === 0 && (
                <p className="text-[10px] text-gray-600 italic">No items marked as &quot;Gacha Exclusive&quot; found. Set items to Gacha Exclusive in Shop Management first.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
