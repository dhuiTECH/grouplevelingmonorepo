'use client';

import React from 'react';
import AvatarCustomizationView, { type AvatarLabConfig } from '@/components/views/AvatarCustomizationView';
import { useRouter } from 'next/navigation';
import { useHunterData } from '@/hooks/useHunterData';

export default function AvatarLabPage() {
  const router = useRouter();
  const { user } = useHunterData();

  const handleComplete = async (config: AvatarLabConfig) => {
    const hunterId = user?.id;
    if (hunterId && (config.baseId != null || (config.selectedParts?.length ?? 0) > 0)) {
      try {
        const res = await fetch('/api/avatar/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hunterId,
            baseId: config.baseId,
            partIds: config.selectedParts?.map((p) => p.shop_item_id) ?? [],
            base_body_tint_hex: config.baseBodyTintHex,
            hair_tint_hex: config.hairTintHex,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn('Avatar save failed:', err);
        }
      } catch (e) {
        console.warn('Avatar save error:', e);
      }
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black">
      <AvatarCustomizationView
        gender="Male"
        onComplete={handleComplete}
      />
    </div>
  );
}
