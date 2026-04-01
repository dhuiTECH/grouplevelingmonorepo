import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { playHunterSound } from '@/utils/audio';
import { useAudio } from '@/contexts/AudioContext';
import { StatusWindowModal } from '@/components/modals/StatusWindowModal';
import { SkillLoadout } from '@/components/SkillLoadout';
import { useAuth } from '@/contexts/AuthContext';
import { useActivePet } from '@/contexts/ActivePetContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useGameData } from '@/hooks/useGameData';
import { useApi } from '@/hooks/useApi';
import { usePets } from '@/hooks/usePets';
import { calculateLevel, getRank } from '@/utils/stats';
import { useInventoryCosmetics } from '@/hooks/useInventoryCosmetics';
import { inventoryScreenStyles } from '@/screens/InventoryScreen.styles';
import { InventoryHudHeader } from '@/components/inventory/InventoryHudHeader';
import { InventoryAvatarSection } from '@/components/inventory/InventoryAvatarSection';
import { InventoryFilterAndGrid } from '@/components/inventory/InventoryFilterAndGrid';
import { InventoryItemDetailsModal } from '@/components/inventory/InventoryItemDetailsModal';
import { EquipmentGearModal } from '@/components/inventory/EquipmentGearModal';
import { AvatarCustomizationModal } from '@/components/inventory/AvatarCustomizationModal';
import { BackgroundCustomizationModal } from '@/components/inventory/BackgroundCustomizationModal';
import type { ShopItem, UserCosmetic } from '@/types/user';

export const InventoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const { shopItems, equippedItems, refreshGameData } = useGameData();
  useApi();
  const { pets, renamePet, loading, updatePetMetadata } = usePets();
  const { activePetId, setActivePetId } = useActivePet();
  const { playTrack } = useAudio();

  const [selectedInventoryItem, setSelectedInventoryItem] = useState<{
    item: ShopItem;
    cosmeticItem: UserCosmetic;
  } | null>(null);
  const [showStatusWindow, setShowStatusWindow] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [viewMode, setViewMode] = useState<'avatar' | 'pet'>('avatar');
  const [petAction, setPetAction] = useState<'idle' | 'enter'>('idle');
  const [isRenamingPet, setIsRenamingPet] = useState(false);
  const [petNewName, setPetNewName] = useState('');

  useFocusEffect(
    useCallback(() => {
      playTrack('Dashboard');
    }, [playTrack])
  );

  const activePet = pets.find((p) => p.id === activePetId) || (pets.length > 0 ? pets[0] : null);

  const {
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
    equipmentPickerTitle,
    equipmentPickerItems,
    closeEquipmentModal,
    openEquipmentModal,
  } = useInventoryCosmetics({
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
  });

  const handleRenamePet = useCallback(async () => {
    const targetPetId = activePet?.id || activePetId;
    if (!targetPetId || !petNewName.trim()) {
      setIsRenamingPet(false);
      return;
    }
    try {
      await renamePet(targetPetId, petNewName.trim());
      showNotification('Pet renamed successfully', 'success');
    } catch {
      showNotification('Failed to rename pet', 'error');
    } finally {
      setIsRenamingPet(false);
    }
  }, [activePet?.id, activePetId, petNewName, renamePet, showNotification]);

  const renderItemDetailsNested = useCallback(
    () => (
      <InventoryItemDetailsModal
        selection={selectedInventoryItem}
        onClose={() => setSelectedInventoryItem(null)}
        isNested
      />
    ),
    [selectedInventoryItem]
  );

  if (isLoading) {
    return (
      <View style={inventoryScreenStyles.container}>
        <SafeAreaView
          style={[inventoryScreenStyles.container, { paddingTop: insets.top, justifyContent: 'center' }]}
        >
          <Text style={inventoryScreenStyles.loadingText}>INITIALIZING_SYSTEM...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={inventoryScreenStyles.container}>
        <SafeAreaView
          style={[
            inventoryScreenStyles.container,
            { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Text style={[inventoryScreenStyles.loadingText, { marginBottom: 20 }]}>
            ACCESS_RESTRICTED. HUNTER_LICENSE_REQUIRED.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#06b6d4',
            }}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={{ color: '#06b6d4', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
              LOGIN_SYSTEM
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const level = calculateLevel(user.exp || 0);
  const playerRank = getRank(level);

  return (
    <View style={inventoryScreenStyles.container}>
      <LinearGradient colors={['#020617', '#0f172a', '#020617']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        <InventoryHudHeader
          user={user}
          level={level}
          playerRank={playerRank}
          onOpenStatus={() => setShowStatusWindow(true)}
        />

        <ScrollView
          style={inventoryScreenStyles.scrollViewContent}
          contentContainerStyle={{ paddingBottom: 220 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <InventoryAvatarSection
            user={user}
            shopItems={shopItems}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
            }}
            petAction={petAction}
            onPetActionSet={setPetAction}
            activePet={activePet}
            isRenamingPet={isRenamingPet}
            petNewName={petNewName}
            onPetNewNameChange={setPetNewName}
            onStartRenamePet={() => {
              setPetNewName(activePet?.nickname || activePet?.pet_details?.name || '');
              setIsRenamingPet(true);
            }}
            onRenamePetSubmit={handleRenamePet}
            onOpenEquipmentModal={openEquipmentModal}
            onOpenAvatarModal={() => setShowAvatarModal(true)}
            onOpenBackgroundModal={() => setShowBackgroundModal(true)}
          />

          <SkillLoadout />

          <InventoryFilterAndGrid
            viewMode={viewMode}
            inventoryFilter={inventoryFilter}
            setInventoryFilter={setInventoryFilter}
            inventorySortAZ={inventorySortAZ}
            setInventorySortAZ={setInventorySortAZ}
            shopItems={shopItems}
            pets={pets}
            petsLoading={loading}
            onSelectPet={(pet) => {
              setActivePetId(pet.id);
              setViewMode('pet');
              setPetAction('enter');
              playHunterSound('click');
            }}
            getFilteredInventoryItems={getFilteredInventoryItems}
            getIsEquipped={getIsEquipped}
            onSelectInventoryItem={setSelectedInventoryItem}
            onEquipCosmetic={handleEquipCosmetic}
            onUseItem={handleUseItem}
          />

          <View style={{ height: 200 }} />
        </ScrollView>
      </SafeAreaView>

      <InventoryItemDetailsModal
        selection={selectedInventoryItem}
        onClose={() => setSelectedInventoryItem(null)}
        isNested={false}
      />

      {showAvatarModal && (
        <AvatarCustomizationModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          user={user}
          onEquipCosmetic={handleEquipCosmetic}
          onSelectItem={setSelectedInventoryItem}
          renderItemDetailsNested={renderItemDetailsNested}
        />
      )}

      {showBackgroundModal && (
        <BackgroundCustomizationModal
          visible={showBackgroundModal}
          onClose={() => setShowBackgroundModal(false)}
          user={user}
          onEquipCosmetic={handleEquipCosmetic}
          onSelectItem={setSelectedInventoryItem}
          renderItemDetailsNested={renderItemDetailsNested}
        />
      )}

      {showEquipmentModal && (
        <EquipmentGearModal
          visible={showEquipmentModal}
          onClose={closeEquipmentModal}
          equippedItems={equippedItems}
          equipmentModalSlotKey={equipmentModalSlotKey}
          setEquipmentModalSlotKey={setEquipmentModalSlotKey}
          equipmentPickerTitle={equipmentPickerTitle}
          equipmentPickerItems={equipmentPickerItems}
          shopItems={shopItems}
          onSelectInventoryItem={setSelectedInventoryItem}
          onEquipCosmetic={handleEquipCosmetic}
          renderItemDetailsNested={renderItemDetailsNested}
        />
      )}

      <StatusWindowModal
        visible={showStatusWindow}
        onClose={() => setShowStatusWindow(false)}
        user={user}
        setUser={setUser}
      />
    </View>
  );
};

export default InventoryScreen;
