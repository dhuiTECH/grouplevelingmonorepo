// Converted React Native types file
// React Native TypeScript types
import { ImageSourcePropType } from 'react-native';
import React from 'react';

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  levels: Level[];
  image: ImageSourcePropType; // Use React Native's ImageSourcePropType
}

export interface Level {
  id: string;
  name: string;
  description: string;
  enemies: Enemy[];
  boss?: Enemy; // Optional boss enemy
  layout: string[][]; // 2D array representing the level layout
  reward?: Item; // Optional reward for completing the level
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  image: ImageSourcePropType; // Use React Native's ImageSourcePropType
  drops?: Item[]; // Items the enemy might drop
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  image: ImageSourcePropType; // Use React Native's ImageSourcePropType
  stats?: ItemStats;
}

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  POTION = 'potion',
  GOLD = 'gold',
  OTHER = 'other',
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  health?: number;
  mana?: number;
}

export interface Player {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  level: number;
  experience: number;
  gold: number;
  inventory: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
  image: ImageSourcePropType; // Use React Native's ImageSourcePropType
}

// Example usage (you can remove this later)
const exampleDungeon: Dungeon = {
  id: 'dungeon1',
  name: 'The Forgotten Caves',
  description: 'A dark and dangerous place.',
  levels: [],
  image: { uri: 'https://example.com/dungeon.png' }, // Replace with your image URL or require('path/to/image')
};

export default Dungeon;