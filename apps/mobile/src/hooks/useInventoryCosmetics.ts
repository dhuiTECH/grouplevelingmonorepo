import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { playHunterSound } from '@/utils/audio';
import { getEffectiveGender } from '@/components/LayeredAvatar/LayeredAvatarUtils';
import { findFemaleDefaultBodyCosmetic } from '@/utils/femaleBodyDefault';
import { supabase } from '@/lib/supabase';
import type { ShopItem, User, UserCosmetic } from '@/types/user';
import {
  getCosmeticSlot,
  getEquipmentPickerTitle,
  getItemGender,
  getMultiAccessorySlotsSet,
  isAvatarSlot,
  isCreatorSlot,
  isGenderCompatible,
  MAX_ACCESSORIES,
  normalizeEquipmentSlot,
} from '@/screens/inventory/inventoryCosmeticUtils';
import type { InventoryFilter } from '@/screens/inventory/inventoryTypes';

interface UseInventoryCosmeticsParams {
  user: User | null;
  setUser: (user: User | null) => void;
  shopItems: ShopItem[];
  refreshGameData: () => void | Promise<void>;
  showNotification: (message: string, type: 'success' | 'error') => void;
  viewMode: 'avatar' | 'pet';
  activePet: { id: string; metadata?: { equipped_background?: string | null } | null } | null;
  activePetId: string | null;
  pets: { id: string; metadata?: Record<string, unknown> | null }[];
  updatePetMetadata: (petId: string, metadata: Record<string, unknown>) => Promise<void>;
  setSelectedInventoryItem: React.Dispatch<
    React.SetStateAction<{ item: ShopItem; cosmeticItem: UserCosmetic } | null>
  >;
  setShowEquipmentModal: (visible: boolean) => void;
}

export function useInventoryCosmetics({
  user,
  setUser,
  shopItems,
  refreshGameData,
  showNotification,
  viewMode,
  activePet,
  activePetId,
  pets,
  updatePetMetadata,
  setSelectedInventoryItem,
  setShowEquipmentModal,
}: UseInventoryCosmeticsParams) {
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [inventorySortAZ, setInventorySortAZ] = useState(false);
  const [equipmentModalSlotKey, setEquipmentModalSlotKey] = useState<string | null>(null);

  const multiAccessorySlots = useMemo(() => getMultiAccessorySlotsSet(), []);

  const handleEquipCosmetic = useCallback(
    async (cosmeticId: string, equipped: boolean) => {
      if (!user) return;

      const targetCosmetic = user.cosmetics?.find((c) => c.id === cosmeticId);

      if (!targetCosmetic) return;

      const targetSlot = targetCosmetic.shop_items?.slot?.toLowerCase();
      const targetItemGender = targetCosmetic.shop_items?.gender;
      const imageUrl = targetCosmetic.shop_items?.image_url;

      if (viewMode === 'pet' && targetSlot === 'background') {
        const targetPetId = activePet?.id || activePetId;

        if (!targetPetId) {
          showNotification('No active pet selected', 'error');
          return;
        }

        playHunterSound(equipped ? 'equip' : 'click');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
          const currentPet = pets.find((p) => p.id === targetPetId);
          const newMetadata = {
            ...(currentPet?.metadata || {}),
            equipped_background: equipped ? imageUrl : null,
          };

          await updatePetMetadata(targetPetId, newMetadata);

          showNotification(equipped ? 'Pet background updated' : 'Pet background removed', 'success');
          return;
        } catch (error) {
          console.error('Error updating pet background:', error);
          showNotification('Failed to update pet background', 'error');
          return;
        }
      }

      if (viewMode !== 'pet' && !equipped && targetSlot === 'body') {
        const equippedList = user.cosmetics?.filter((c) => c.equipped) || [];
        const equippedAvatarItem = equippedList.find((c) => getCosmeticSlot(c.shop_items) === 'avatar');
        const equippedBaseBodyItem = equippedList.find((c) => getCosmeticSlot(c.shop_items) === 'base_body');
        const activeSkinItem = equippedAvatarItem || equippedBaseBodyItem;

        if (getEffectiveGender(activeSkinItem?.shop_items, user.gender) === 'female') {
          const fallback = findFemaleDefaultBodyCosmetic(user.cosmetics);
          if (!fallback) {
            playHunterSound('error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showNotification('No default shirt in inventory; body stays equipped.', 'error');
            return;
          }
          if (fallback.id === cosmeticId) {
            playHunterSound('error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showNotification('Body slot requires coverage.', 'error');
            return;
          }

          const previousCosmeticsSwap = user.cosmetics;
          playHunterSound('click');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          const bodyEquippedOtherIds =
            user.cosmetics
              ?.filter(
                (c) =>
                  c.equipped &&
                  c.shop_items?.slot?.toLowerCase() === 'body' &&
                  c.id !== fallback.id
              )
              .map((c) => c.id) || [];

          const updatedCosmeticsSwap =
            user.cosmetics?.map((c) => {
              if (c.shop_items?.slot?.toLowerCase() !== 'body') return c;
              if (c.id === fallback.id) return { ...c, equipped: true };
              return { ...c, equipped: false };
            }) || [];

          setUser({ ...user, cosmetics: updatedCosmeticsSwap });

          try {
            if (bodyEquippedOtherIds.length > 0) {
              const { error: unequipBodyError } = await supabase
                .from('user_cosmetics')
                .update({ equipped: false })
                .in('id', bodyEquippedOtherIds);
              if (unequipBodyError) throw unequipBodyError;
            }
            const { error: equipShirtError } = await supabase
              .from('user_cosmetics')
              .update({ equipped: true })
              .eq('id', fallback.id);
            if (equipShirtError) throw equipShirtError;

            refreshGameData();
            const shirtName = fallback.shop_items?.name || 'default shirt';
            showNotification(`Body slot requires coverage—equipped ${shirtName}.`, 'success');
          } catch (error) {
            console.error('Error swapping to default body shirt:', error);
            playHunterSound('error');
            setUser({ ...user, cosmetics: previousCosmeticsSwap });
            showNotification('Failed to update equipment', 'error');
          }
          return;
        }
      }

      const previousCosmetics = user.cosmetics;
      const previousGender = user.gender;

      const isAvatarChange = equipped && isAvatarSlot(targetSlot);
      const avatarGender = isAvatarChange ? getItemGender(targetItemGender) : null;
      const newUserGender = avatarGender || user.gender;

      if (equipped && !isAvatarSlot(targetSlot) && !isGenderCompatible(targetItemGender, user.gender)) {
        playHunterSound('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showNotification('Cannot equip: gender mismatch', 'error');
        return;
      }

      if (
        equipped &&
        targetCosmetic.shop_items?.min_level &&
        user.level < targetCosmetic.shop_items.min_level
      ) {
        playHunterSound('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showNotification(`Level ${targetCosmetic.shop_items.min_level} required`, 'error');
        return;
      }

      if (
        equipped &&
        targetCosmetic.shop_items?.class_req &&
        targetCosmetic.shop_items.class_req !== 'All' &&
        user.current_class !== targetCosmetic.shop_items.class_req
      ) {
        playHunterSound('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showNotification(`${targetCosmetic.shop_items.class_req} class required`, 'error');
        return;
      }

      playHunterSound(equipped ? 'equip' : 'click');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let itemsToUnequip: string[] = [];

      if (equipped) {
        if (targetSlot === 'accessory') {
          const currentlyEquippedAccessories =
            user.cosmetics?.filter(
              (c) =>
                c.equipped &&
                c.shop_items?.slot?.toLowerCase() === 'accessory' &&
                c.id !== cosmeticId
            ) || [];

          if (currentlyEquippedAccessories.length >= MAX_ACCESSORIES) {
            playHunterSound('error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showNotification(`Max ${MAX_ACCESSORIES} accessories allowed`, 'error');
            return;
          }
        } else {
          const otherItemsInSlot =
            user.cosmetics?.filter(
              (c) =>
                c.equipped && c.shop_items?.slot?.toLowerCase() === targetSlot && c.id !== cosmeticId
            ) || [];

          itemsToUnequip = otherItemsInSlot.map((c) => c.id);
        }

        if (isAvatarChange && avatarGender) {
          const incompatibleItems =
            user.cosmetics?.filter((c) => {
              if (!c.equipped || c.id === cosmeticId) return false;
              if (isAvatarSlot(c.shop_items?.slot)) return false;
              return !isGenderCompatible(c.shop_items?.gender, avatarGender);
            }) || [];

          itemsToUnequip = [...new Set([...itemsToUnequip, ...incompatibleItems.map((c) => c.id)])];
        }
      }

      const updatedCosmetics =
        user.cosmetics?.map((c) => {
          if (c.id === cosmeticId) return { ...c, equipped };
          if (itemsToUnequip.includes(c.id)) return { ...c, equipped: false };
          return c;
        }) || [];

      setUser({ ...user, gender: newUserGender, cosmetics: updatedCosmetics });

      try {
        const { error } = await supabase.from('user_cosmetics').update({ equipped }).eq('id', cosmeticId);

        if (error) throw error;

        if (itemsToUnequip.length > 0) {
          const { error: unequipError } = await supabase
            .from('user_cosmetics')
            .update({ equipped: false })
            .in('id', itemsToUnequip);

          if (unequipError) console.error('Error unequipping other items:', unequipError);
        }

        if (isAvatarChange && avatarGender && avatarGender !== previousGender) {
          const { error: genderError } = await supabase
            .from('profiles')
            .update({ gender: avatarGender })
            .eq('id', user.id);

          if (genderError) console.error('Error updating gender:', genderError);
        }

        refreshGameData();
        const itemName = targetCosmetic.shop_items?.name || 'Item';
        showNotification(equipped ? `${itemName} equipped` : `${itemName} unequipped`, 'success');
      } catch (error) {
        console.error('Error equipping/unequipping cosmetic:', error);
        playHunterSound('error');
        setUser({ ...user, gender: previousGender, cosmetics: previousCosmetics });
        showNotification('Failed to update equipment', 'error');
      }
    },
    [
      user,
      setUser,
      refreshGameData,
      showNotification,
      viewMode,
      activePetId,
      activePet,
      pets,
      updatePetMetadata,
    ]
  );

  const handleUseItem = useCallback(
    async (cosmeticId: string) => {
      try {
        playHunterSound('click');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const { data, error } = await supabase.rpc('use_cosmetic_item', {
          p_cosmetic_id: cosmeticId,
        });

        if (error) throw error;

        if (data && data.success) {
          showNotification(data.message || 'Item used successfully', 'success');

          if (user) {
            const updatedCosmetics = (user.cosmetics || [])
              .map((c) => {
                if (c.id === cosmeticId) {
                  if (data.remaining > 0) {
                    return { ...c, quantity: data.remaining };
                  }
                  return null;
                }
                return c;
              })
              .filter(Boolean) as UserCosmetic[];

            setUser({
              ...user,
              cosmetics: updatedCosmetics,
              current_hp: data.new_hp !== undefined ? data.new_hp : user.current_hp,
              exp: data.new_exp !== undefined ? data.new_exp : user.exp,
            });

            if (data.remaining === 0) {
              setSelectedInventoryItem(null);
            }
          }

          refreshGameData();
        } else {
          playHunterSound('error');
          showNotification(data?.message || 'Failed to use item', 'error');
        }
      } catch (error) {
        console.error('Error using item:', error);
        playHunterSound('error');
        showNotification('Failed to use item', 'error');
      }
    },
    [showNotification, refreshGameData, user, setUser, setSelectedInventoryItem]
  );

  const getIsEquipped = useCallback(
    (cosmeticItem: UserCosmetic) => {
      if (viewMode === 'pet') {
        const itemUrl = cosmeticItem.shop_items?.image_url;
        return activePet?.metadata?.equipped_background === itemUrl;
      }
      return cosmeticItem.equipped;
    },
    [viewMode, activePet?.metadata?.equipped_background, activePet]
  );

  const getFilteredInventoryItems = useCallback(() => {
    let filtered = (user?.cosmetics || []).filter((cosmeticItem: UserCosmetic) => {
      const item =
        cosmeticItem.shop_items || shopItems.find((shopItem) => shopItem.id === cosmeticItem.shop_item_id);
      const slot = item?.slot?.toLowerCase();

      if (!slot) return true;

      if (viewMode === 'pet') {
        return slot === 'background';
      }

      if (slot === 'background' || slot === 'avatar') return false;
      if (isCreatorSlot(slot)) return false;

      return true;
    });

    if (inventoryFilter !== 'all' && viewMode !== 'pet') {
      filtered = filtered.filter((cosmeticItem: UserCosmetic) => {
        const item =
          cosmeticItem.shop_items || shopItems.find((shopItem) => shopItem.id === cosmeticItem.shop_item_id);
        switch (inventoryFilter) {
          case 'equipped':
            return cosmeticItem.equipped === true;
          case 'weapons':
            return item?.slot === 'weapon';
          case 'armor':
            return item?.slot === 'body';
          case 'accessories':
            return (
              (![
                'weapon',
                'body',
                'background',
                'magic effects',
                'avatar',
                'fullbody',
                'skin',
                'character',
                'other',
                'pet',
                'misc',
                'consumable',
              ].includes(item?.slot || '') &&
                !item?.item_effects) ||
              ['face', 'eyes'].includes(item?.slot || '')
            );
          case 'magics':
            return item?.slot === 'magic effects';
          case 'pets':
            return item?.slot === 'pet';
          case 'other':
            return ['other', 'misc', 'consumable'].includes(item?.slot || '');
          default:
            return true;
        }
      });
    }

    if (inventorySortAZ) {
      return filtered.sort((a: UserCosmetic, b: UserCosmetic) => {
        const itemA = a.shop_items || shopItems.find((shopItem) => shopItem.id === a.shop_item_id);
        const itemB = b.shop_items || shopItems.find((shopItem) => shopItem.id === b.shop_item_id);
        const nameA = itemA?.name || '';
        const nameB = itemB?.name || '';
        return nameA.localeCompare(nameB);
      });
    }
    return filtered.sort(
      (a: UserCosmetic, b: UserCosmetic) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [user, inventoryFilter, inventorySortAZ, shopItems, viewMode]);

  const getCosmeticsForEquipmentSlot = useCallback(
    (slotKey: string) => {
      const list = user?.cosmetics || [];
      const filtered = list.filter((cosmeticItem: UserCosmetic) => {
        const item =
          cosmeticItem.shop_items || shopItems.find((shopItem) => shopItem.id === cosmeticItem.shop_item_id);
        if (!item) return false;
        const slot = normalizeEquipmentSlot(item.slot);
        if (!slot) return false;
        if (slot === 'background' || slot === 'avatar' || isCreatorSlot(item.slot)) return false;

        if (slotKey === 'multi-accessory') return multiAccessorySlots.has(slot);

        return normalizeEquipmentSlot(slotKey) === slot;
      });

      return filtered.sort((a, b) => {
        const itemA = a.shop_items || shopItems.find((shopItem) => shopItem.id === a.shop_item_id);
        const itemB = b.shop_items || shopItems.find((shopItem) => shopItem.id === b.shop_item_id);
        return (itemA?.name || '').localeCompare(itemB?.name || '');
      });
    },
    [user?.cosmetics, shopItems, multiAccessorySlots]
  );

  const equipmentPickerTitle = useMemo(() => {
    if (!equipmentModalSlotKey) return '';
    return getEquipmentPickerTitle(equipmentModalSlotKey);
  }, [equipmentModalSlotKey]);

  const equipmentPickerItems = useMemo(() => {
    if (!equipmentModalSlotKey) return [];
    return getCosmeticsForEquipmentSlot(equipmentModalSlotKey);
  }, [equipmentModalSlotKey, getCosmeticsForEquipmentSlot]);

  const closeEquipmentModal = useCallback(() => {
    setEquipmentModalSlotKey(null);
    setShowEquipmentModal(false);
  }, [setShowEquipmentModal]);

  const openEquipmentModal = useCallback(() => {
    setEquipmentModalSlotKey(null);
    setShowEquipmentModal(true);
  }, [setShowEquipmentModal]);

  return {
    inventoryFilter,
    setInventoryFilter,
    inventorySortAZ,
    setInventorySortAZ,
    equipmentModalSlotKey,
    setEquipmentModalSlotKey,
    handleEquipCosmetic,
    handleUseItem,
    getIsEquipped,
    getFilteredInventoryItems,
    getCosmeticsForEquipmentSlot,
    equipmentPickerTitle,
    equipmentPickerItems,
    closeEquipmentModal,
    openEquipmentModal,
  };
}
