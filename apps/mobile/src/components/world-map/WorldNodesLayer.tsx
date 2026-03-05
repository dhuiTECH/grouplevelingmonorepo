import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
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
    // pointerEvents="box-none" ensures the wrapper doesn't block touches to the map
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {(nodes || []).map((node) => {
        const nodeLeft = node.x * tileSize;
        const nodeTop = node.y * tileSize;
        
        return (
          <View
            key={`node-wrapper-${node.id}`}
            style={{
              position: 'absolute',
              left: nodeLeft,
              top: nodeTop,
              width: tileSize,
              height: tileSize,
              zIndex: 1000 - Math.floor(node.y),
              alignItems: 'center',
            }}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={() => onSelectNode(node)}
              activeOpacity={1}
              style={{
                width: tileSize,
                height: tileSize,
                backgroundColor: 'transparent',
              }}
            />
            <View style={{ position: 'absolute', bottom: -18, alignItems: 'center', width: tileSize * 2 }} pointerEvents="none">
              <Text style={worldMapStyles.nodeLabel} numberOfLines={1}>
                {node.name}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const WorldNodesLayer = memo(WorldNodesLayerInner);
