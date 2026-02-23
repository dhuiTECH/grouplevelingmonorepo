export interface CardSkin {
  id: string;
  name: string;
  price: number;
  style: any; // We'll use StyleSheet styles here
  backgroundImage?: any;
  effect?: string;
}

export const CARD_SKINS: Record<string, CardSkin> = {
  default: {
    id: 'default',
    name: 'Standard Issue',
    price: 0,
    style: {
      borderColor: 'rgba(167, 139, 250, 0.3)',
      backgroundColor: '#0f0e13',
    },
    effect: ''
  },
  magma: {
    id: 'magma',
    name: 'Molten Core',
    price: 1000,
    style: {
      borderColor: '#ef4444',
      backgroundColor: '#1a0505',
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
      elevation: 5,
    },
    effect: 'pulse'
  },
  galaxy: {
    id: 'galaxy',
    name: 'Cosmic Void',
    price: 5,
    style: {
      borderColor: '#22d3ee',
      shadowColor: '#22d3ee',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 5,
    },
    backgroundImage: require('../../assets/bg1.webp'), // Fallback background
    effect: ''
  }
};
