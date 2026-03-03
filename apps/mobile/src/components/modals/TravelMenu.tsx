import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { mapNodeIcon } from '@/utils/assetMapper';

const { width, height } = Dimensions.get('window');

interface TravelMenuProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onTravelSuccess: (newX: number, newY: number, cost: number) => void;
  onUnstuck?: () => void;
}

export const TravelMenu: React.FC<TravelMenuProps> = ({ 
  visible, 
  onClose, 
  user, 
  onTravelSuccess,
  onUnstuck
}) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'waypoints' | 'support'>('waypoints');

  useEffect(() => {
    if (visible && user) {
      fetchDiscoveredLocations();
    }
  }, [visible, user]);

  const fetchDiscoveredLocations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discovered_locations')
        .select(`
          node_id,
          world_map_nodes!inner (
            id,
            name,
            x,
            y,
            icon_url,
            type,
            interaction_data
          )
        `)
        .eq('user_id', user.id)
        .eq('world_map_nodes.interaction_data->>can_travel_to', 'true');

      if (error) throw error;
      
      const locs = data.map((d: any) => d.world_map_nodes);
      setLocations(locs);
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTravelCost = (targetX: number, targetY: number) => {
    if (!user) return 0;
    const dx = Math.abs(targetX - (user.world_x || 0));
    const dy = Math.abs(targetY - (user.world_y || 0));
    return (dx + dy) * 100;
  };

  const handleTravel = async (location: any) => {
    if (!user) return;
    const cost = calculateTravelCost(location.x, location.y);
    
    if ((user.steps_banked || 0) < cost) {
      alert("Insufficient Stamina! Walk more to travel here.");
      return;
    }

    try {
      const newSteps = (user.steps_banked || 0) - cost;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          world_x: location.x, 
          world_y: location.y,
          steps_banked: newSteps 
        })
        .eq('id', user.id);

      if (error) throw error;

      onTravelSuccess(location.x, location.y, cost);
      onClose();
      
    } catch (err) {
      console.error("Error traveling:", err);
      alert("Travel failed. The system is unstable.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="compass" size={20} color="#22d3ee" style={{ marginRight: 8 }} />
              <Text style={styles.title}>WAYPOINT MENU</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'waypoints' && styles.activeTab]}
              onPress={() => setActiveTab('waypoints')}
            >
              <Ionicons 
                name="location" 
                size={16} 
                color={activeTab === 'waypoints' ? '#22d3ee' : '#64748b'} 
              />
              <Text style={[styles.tabText, activeTab === 'waypoints' && styles.activeTabText]}>
                WAYPOINTS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'support' && styles.activeTab]}
              onPress={() => setActiveTab('support')}
            >
              <Ionicons 
                name="construct" 
                size={16} 
                color={activeTab === 'support' ? '#22d3ee' : '#64748b'} 
              />
              <Text style={[styles.tabText, activeTab === 'support' && styles.activeTabText]}>
                SYSTEM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {activeTab === 'waypoints' ? (
              loading ? (
                <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 40 }} />
              ) : locations.length > 0 ? (
                locations.map((loc) => {
                  const cost = calculateTravelCost(loc.x, loc.y);
                  const isCurrent = loc.x === user?.world_x && loc.y === user?.world_y;
                  
                  return (
                    <TouchableOpacity 
                      key={loc.id} 
                      style={[styles.item, isCurrent && styles.itemCurrent]}
                      onPress={() => !isCurrent && handleTravel(loc)}
                      disabled={isCurrent}
                    >
                      <View style={styles.itemIconContainer}>
                        <Image 
                          source={mapNodeIcon(loc.icon_url)} 
                          style={styles.locationIcon} 
                          contentFit="contain"
                        />
                      </View>

                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, isCurrent && styles.textCurrent]}>{loc.name}</Text>
                        <Text style={styles.itemCoords}>Coords: {loc.x}, {loc.y}</Text>
                      </View>

                      <View style={styles.itemAction}>
                        {isCurrent ? (
                          <Text style={styles.badgeText}>CURRENT</Text>
                        ) : (
                          <View style={styles.costBadge}>
                            <Ionicons name="footsteps" size={10} color="#fff" />
                            <Text style={styles.costText}>{cost}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="map-outline" size={48} color="#1e293b" />
                  <Text style={styles.emptyText}>No Waypoints Discovered</Text>
                  <Text style={styles.emptySub}>Explore the world to unlock travel points.</Text>
                </View>
              )
            ) : (
              <View style={styles.supportContainer}>
                <View style={styles.supportInfo}>
                  <Ionicons name="help-circle-outline" size={48} color="#22d3ee" />
                  <Text style={styles.supportTitle}>SYSTEM RECOVERY</Text>
                  <Text style={styles.supportSub}>
                    If you are stuck between objects or the world is not loading correctly, use the command below to return to the safe zone.
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.unstuckBtn}
                  onPress={() => {
                    if (onUnstuck) {
                      onUnstuck();
                      onClose();
                    }
                  }}
                >
                  <Ionicons name="exit-outline" size={24} color="#020617" />
                  <Text style={styles.unstuckBtnText}>INITIALIZE EMERGENCY RECOVERY</Text>
                  <Text style={styles.unstuckBtnSub}>Teleport to [0, 0]</Text>
                </TouchableOpacity>

                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={16} color="#f97316" />
                  <Text style={styles.warningText}>
                    Emergency recovery is free but will reset your current exploration session.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.staminaLabel}>AVAILABLE STAMINA:</Text>
            <Text style={styles.staminaValue}>{user?.steps_banked || 0} STEPS</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22d3ee',
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.2)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#22d3ee',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#22d3ee',
  },
  tabText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#22d3ee',
  },
  list: {
    padding: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.1)',
  },
  itemCurrent: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationIcon: {
    width: 28,
    height: 28,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemCoords: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  itemAction: {
    alignItems: 'flex-end',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22d3ee',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  costText: {
    color: '#020617',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
  badgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  textCurrent: {
    color: '#22c55e',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#22d3ee',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  supportContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  supportInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  supportTitle: {
    color: '#22d3ee',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 10,
  },
  supportSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  unstuckBtn: {
    backgroundColor: '#22d3ee',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  unstuckBtnText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '900',
  },
  unstuckBtnSub: {
    color: 'rgba(2, 6, 23, 0.6)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 25,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    gap: 10,
  },
  warningText: {
    color: '#f97316',
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
  },
  staminaLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  staminaValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
});
