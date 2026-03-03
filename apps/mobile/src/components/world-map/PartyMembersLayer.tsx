import React from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import LayeredAvatar from '@/components/LayeredAvatar';
import { worldMapStyles } from '@/screens/WorldMapScreen.styles';

interface PartyMember {
  id: string;
  world_x: number;
  world_y: number;
  hunter_name?: string;
  [key: string]: any;
}

interface PartyMembersLayerProps {
  members: PartyMember[];
  allShopItems: any[];
  tileSize: number;
}

export function PartyMembersLayer({ members, allShopItems, tileSize }: PartyMembersLayerProps) {
  if (members.length === 0) return null;

  return (
    <>
      {members.map((member) => {
        const memberLeft = member.world_x * tileSize;
        const memberTop = member.world_y * tileSize;
        return (
          <MotiView
            key={`party-${member.id}`}
            style={[
              worldMapStyles.partyMemberContainer,
              {
                position: 'absolute',
                left: memberLeft,
                top: memberTop,
                zIndex: 1000 - member.world_y,
              },
            ]}
            animate={{ left: memberLeft, top: memberTop }}
            transition={{ type: 'timing', duration: 250 }}
          >
            <View style={worldMapStyles.partyMemberAvatar}>
              <LayeredAvatar user={member as any} size={56} allShopItems={allShopItems} />
            </View>
            <View style={worldMapStyles.partyMemberLabel}>
              <View style={worldMapStyles.partyMemberIndicator} />
              <Text style={worldMapStyles.partyMemberName}>{member.hunter_name}</Text>
            </View>
          </MotiView>
        );
      })}
    </>
  );
}
