import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { mapNodeIcon } from '@/utils/assetMapper';
import { worldMapStyles } from '@/screens/WorldMapScreen.styles';

interface MapNode {
  id: string;
  x: number;
  y: number;
  name: string;
  type?: string;
  icon_url?: string | null;
}

interface WorldNodesLayerProps {
  nodes: MapNode[];
  tileSize: number;
  onSelectNode: (node: MapNode) => void;
}

function WorldNodesLayerInner({ nodes, tileSize, onSelectNode }: WorldNodesLayerProps) {
  return (
    <>
      {(nodes || []).map((node) => {
        const nodeLeft = node.x * tileSize;
        const nodeTop = node.y * tileSize;
        return (
          <View
            key={`node-${node.id}`}
            style={[
              worldMapStyles.tile,
              {
                width: tileSize,
                height: tileSize,
                position: 'absolute',
                left: nodeLeft,
                top: nodeTop,
                zIndex: 1000 - Math.floor(node.y),
              },
            ]}
          >
            <TouchableOpacity onPress={() => onSelectNode(node)} activeOpacity={0.7}>
              <View style={worldMapStyles.nodeContainer}>
                <View style={worldMapStyles.nodeIconWrapper}>
                  <Image
                    source={mapNodeIcon(node.icon_url, node.type)}
                    style={worldMapStyles.nodeIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={worldMapStyles.nodeLabel}>{node.name}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </>
  );
}

export const WorldNodesLayer = memo(WorldNodesLayerInner);
