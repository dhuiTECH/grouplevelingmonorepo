/**
 * Maps string paths from the Next.js Admin Panel / Supabase 
 * to local React Native require() statements.
 */
export const mapNodeIcon = (iconUrl: string | null, type?: string) => {
  if (!iconUrl) {
    if (type === 'spawn') return require('../../assets/world.png');
    if (type === 'enemy') return require('../../assets/exclamation.png');
    if (type === 'npc') return require('../../assets/NoobMan.png');
    if (type === 'loot') return require('../../assets/icons/smallchest.png');
    return require('../../assets/exclamation.png');
  }

  // PRIORITY 1: If it's a full URL, use it directly (don't override with local assets)
  if (iconUrl.startsWith('http')) {
    return { uri: iconUrl };
  }

  // Handle common admin paths or direct filenames
  const path = iconUrl.toLowerCase();

  // NPCs
  const npcMap = {
    'nyx1': require('../../assets/shop/Nyx1.png'),
    'nyx2': require('../../assets/shop/Nyx2.png'),
    'leo1': require('../../assets/shop/Leo1.png'),
    'leo2': require('../../assets/shop/Leo2.png'),
    'noobman': require('../../assets/NoobMan.png'),
    'noobwoman': require('../../assets/NoobWoman.png'),
    'noobnonbinary': require('../../assets/Noobnonbinary.png'),
    'sungjinwoo': require('../../assets/sungjinwoo.png'),
    'pet': require('../../assets/pet.png'),
  };

  for (const [key, value] of Object.entries(npcMap)) {
    if (path.includes(key)) return value;
  }

  // UI Icons
  if (path.includes('shopicon')) return require('../../assets/shopicon.png');
  if (path.includes('temple')) return require('../../assets/temple.png');
  if (path.includes('gates')) return require('../../assets/gates.png');
  if (path.includes('exclamation')) return require('../../assets/exclamation.png');
  if (path.includes('world')) return require('../../assets/world.png');
  if (path.includes('system')) return require('../../assets/system.png');
  if (path.includes('huntericon')) return require('../../assets/huntericon.png');

  if (type === 'spawn') return require('../../assets/world.png');
  return require('../../assets/exclamation.png');
};

export const mapNodeBackground = (bgUrl: string | null) => {
  if (!bgUrl) return require('../../assets/stone-bg.jpg');

  // PRIORITY 1: If it's a full URL, use it directly
  if (bgUrl.startsWith('http')) {
    return { uri: bgUrl };
  }

  const path = bgUrl.toLowerCase();
  
  if (path.includes('seoul')) return require('../../assets/seoul_map_bg.webp');
  if (path.includes('mission')) return require('../../assets/missionmap.webp');
  if (path.includes('stone')) return require('../../assets/stone-bg.jpg');

  // NPCs backgrounds
  if (path.includes('arcane')) return require('../../assets/shop/arcaneemporium.webp');
  if (path.includes('armory')) return require('../../assets/shop/hunterarmory.webp');

  return require('../../assets/stone-bg.jpg');
};
