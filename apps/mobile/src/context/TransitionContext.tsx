import React, { createContext, useContext, useState, useCallback } from 'react';
import { SkImage } from '@shopify/react-native-skia';

export interface PartyPreviewMember {
  type: 'player';
  user: any;
  allShopItems?: any[];
}
export interface PartyPreviewPet {
  type: 'pet';
  petDetails: any;
}
export type PartyPreviewItem = PartyPreviewMember | PartyPreviewPet;

export interface TransitionContextType {
  snapshotImage: SkImage | null;
  isTransitioning: boolean;
  partyPreview: PartyPreviewItem[] | null;
  startTransition: (image: SkImage, onHalfway: () => void, partyPreview?: PartyPreviewItem[]) => void;
  setTransitioning: (value: boolean) => void;
  setSnapshot: (image: SkImage | null) => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshotImage, setSnapshotImage] = useState<SkImage | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [partyPreview, setPartyPreview] = useState<PartyPreviewItem[] | null>(null);
  const [halfwayCallback, setHalfwayCallback] = useState<(() => void) | null>(null);

  const startTransition = useCallback((image: SkImage, onHalfway: () => void, preview?: PartyPreviewItem[]) => {
    setSnapshotImage(image);
    setPartyPreview(preview ?? null);
    setIsTransitioning(true);
    setHalfwayCallback(() => onHalfway);
  }, []);

  const value: TransitionContextType = {
    snapshotImage,
    isTransitioning,
    partyPreview,
    startTransition,
    setTransitioning: setIsTransitioning,
    setSnapshot: setSnapshotImage,
    _onHalfway: halfwayCallback,
  } as TransitionContextType;

  return (
    <TransitionContext.Provider value={value}>
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};
