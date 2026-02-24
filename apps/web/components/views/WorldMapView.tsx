'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Compass, Footprints, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExploration, type WorldMapNode, type VisionTile } from '@/hooks/useExploration';
import type { User } from '@/lib/types';
import LayeredAvatar from '@/components/LayeredAvatar';
import TravelMenu from '@/components/modals/TravelMenu';
import InteractionModal from '@/components/modals/InteractionModal';

const TILES_WIDE = 5;
const TILES_TALL = 5;
const MAP_WIDTH = 2000;
const MAP_HEIGHT = MAP_WIDTH * (16 / 9);
const HEADER_NAV_OFFSET = 140;
const ASPECT_WIDTH = 9;
const ASPECT_HEIGHT = 16;
const DPAD_SIZE = 160;
const DPAD_GAP = 38;

interface WorldMapViewProps {
  user: User | null;
  setUser: (u: User | ((prev: User) => User)) => void;
  setActiveTab?: (tab: string) => void;
}

export default function WorldMapView({ user, setUser, setActiveTab }: WorldMapViewProps) {
  const [encounter, setEncounter] = useState<WorldMapNode | null>(null);
  const [interactionVisible, setInteractionVisible] = useState(false);
  const [travelMenuVisible, setTravelMenuVisible] = useState(false);
  const [gridDimensions, setGridDimensions] = useState({ width: 360, height: 640 });

  const onEncounter = useCallback((node: WorldMapNode) => {
    setEncounter(node);
    setInteractionVisible(true);
  }, []);

  const {
    visionGrid,
    move,
    refreshVision,
    fastTravel,
    activeMapUrl,
    nodes,
    loading,
    userQuests,
    availableQuests,
    acceptQuest,
    claimQuestReward,
  } = useExploration(user, setUser, onEncounter);

  const handleTravelSuccess = useCallback(
    (newX: number, newY: number, cost: number) => {
      if (!user) return;
      const newSteps = (user.steps_banked ?? 0) - cost;
      setUser({
        ...user,
        world_x: newX,
        world_y: newY,
        steps_banked: newSteps,
      });
      refreshVision(newX, newY);
    },
    [user, setUser, refreshVision]
  );

  useEffect(() => {
    const updateSize = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = Math.max(300, window.innerHeight - HEADER_NAV_OFFSET);
      const height = h;
      const width = Math.min(w, height * (ASPECT_WIDTH / ASPECT_HEIGHT));
      setGridDimensions({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (travelMenuVisible || interactionVisible) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        move('N');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        move('S');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        move('W');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        move('E');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, travelMenuVisible, interactionVisible]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-cyan-400">
        <div className="animate-pulse font-black uppercase tracking-wider">Loading world...</div>
      </div>
    );
  }

  const wx = user?.world_x ?? 0;
  const wy = user?.world_y ?? 0;
  const stepsBanked = user?.steps_banked ?? 0;

  const gridWidthPx = gridDimensions.width;
  const gridHeightPx = gridDimensions.height;
  const tileWidthPx = gridWidthPx / TILES_WIDE;
  const tileHeightPx = gridHeightPx / TILES_TALL;
  const mapLeft = gridWidthPx / 2 - (tileWidthPx / 2);
  const mapTop = gridHeightPx / 2 - (tileHeightPx / 2);

  const avatarSize = Math.min(Math.min(tileWidthPx, tileHeightPx) - 8, 64);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#1a1c14] flex items-center justify-center"
      style={{ minHeight: `calc(100dvh - ${HEADER_NAV_OFFSET}px)` }}
    >
      {/* Map + grid wrapper: 9:16 full-stretch */}
      <div
        className="relative overflow-hidden"
        style={{ width: gridWidthPx, height: gridHeightPx, backgroundColor: '#6b705c' }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 flex flex-wrap content-start pointer-events-none"
          style={{ width: gridWidthPx, height: gridHeightPx }}
        >
          {visionGrid.map((tile: VisionTile) => {
            const isPlayer = tile.x === wx && tile.y === wy;
            return (
              <div
                key={`${tile.x},${tile.y}`}
                className="flex items-center justify-center border border-white/5 relative"
                style={{ width: tileWidthPx, height: tileHeightPx }}
              >
                {/* Tile Background (Fallback to transparent if no image, revealing the #6b705c parent background) */}
                {tile.imageUrl && (
                  tile.isSpritesheet && tile.frameCount && tile.frameCount > 1 ? (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        width: tileWidthPx * ((tile.frameWidth || 64) / 64),
                        height: tileHeightPx * ((tile.frameHeight || 64) / 64),
                        left: '50%',
                        bottom: 0,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div
                        className="spritesheet-inner-game"
                        style={{
                          width: `${tile.frameCount * 100}%`,
                          height: '100%',
                          backgroundImage: `url(${tile.imageUrl})`,
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          // @ts-ignore
                          '--frame-count': tile.frameCount,
                          '--animation-speed': `${tile.animationSpeed || 0.8}s`,
                        } as any}
                      />
                    </div>
                  ) : (
                    <div 
                      className="absolute inset-0 bg-cover bg-center" 
                      style={{ 
                        backgroundImage: `url(${tile.imageUrl})`,
                        width: tileWidthPx * ((tile.frameWidth || 64) / 64),
                        height: tileHeightPx * ((tile.frameHeight || 64) / 64),
                        left: '50%',
                        bottom: 0,
                        transform: 'translateX(-50%)',
                      }} 
                    />
                  )
                )}

                {tile.node && !isPlayer && (
                  <div className="flex flex-col items-center pointer-events-none relative z-10">
                    {tile.node.icon_url ? (
                      <img
                        src={tile.node.icon_url}
                        alt=""
                        className="w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/50 shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    )}
                    
                    {/* Quest Indicator */}
                    {tile.node.has_quest && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce border border-white/20">
                        {tile.node.quest_status === 'completed' ? '?' : '!'}
                      </div>
                    )}

                    <span className="text-[8px] font-bold uppercase text-white mt-0.5 bg-black/60 px-1 rounded truncate max-w-full drop-shadow">
                      {tile.node.name}
                    </span>
                  </div>
                )}
                {isPlayer && (
                  <div className="pointer-events-none" aria-hidden />
                )}
              </div>
            );
          })}
        </div>

        {/* D-pad: centered, behind avatar */}
        {!travelMenuVisible && !interactionVisible && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: DPAD_SIZE,
              height: DPAD_SIZE,
            }}
          >
            <div className="relative w-full h-full pointer-events-auto">
              {/* North strip - transparent */}
              <button
                type="button"
                onClick={() => move('N')}
                className="absolute left-0 right-0 top-0 flex items-end justify-center rounded-t-lg bg-transparent hover:bg-white/10 active:bg-white/15 transition-colors"
                style={{ height: DPAD_GAP }}
                aria-label="Move North"
              >
                <ChevronUp size={26} className="text-cyan-400 drop-shadow-lg mb-0.5" strokeWidth={2.5} />
              </button>
              {/* South strip - transparent */}
              <button
                type="button"
                onClick={() => move('S')}
                className="absolute left-0 right-0 bottom-0 flex items-start justify-center rounded-b-lg bg-transparent hover:bg-white/10 active:bg-white/15 transition-colors"
                style={{ height: DPAD_GAP }}
                aria-label="Move South"
              >
                <ChevronDown size={26} className="text-cyan-400 drop-shadow-lg mt-0.5" strokeWidth={2.5} />
              </button>
              {/* West strip - transparent */}
              <button
                type="button"
                onClick={() => move('W')}
                className="absolute left-0 bottom-0 top-0 flex items-center justify-end rounded-l-lg bg-transparent hover:bg-white/10 active:bg-white/15 transition-colors"
                style={{ width: DPAD_GAP, top: DPAD_GAP, bottom: DPAD_GAP }}
                aria-label="Move West"
              >
                <ChevronLeft size={26} className="text-cyan-400 drop-shadow-lg mr-0.5" strokeWidth={2.5} />
              </button>
              {/* East strip - transparent, guaranteed width so always visible */}
              <button
                type="button"
                onClick={() => move('E')}
                className="absolute right-0 bottom-0 top-0 flex items-center justify-start rounded-r-lg bg-transparent hover:bg-white/10 active:bg-white/15 transition-colors"
                style={{ width: DPAD_GAP, minWidth: 48, top: DPAD_GAP, bottom: DPAD_GAP }}
                aria-label="Move East"
              >
                <ChevronRight size={26} className="text-cyan-400 drop-shadow-lg ml-0.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
        {/* Avatar: exact center, on top of D-pad, taps pass through */}
        <div
          className="absolute z-20 flex items-center justify-center pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: DPAD_SIZE,
            height: DPAD_SIZE,
          }}
        >
          {user && (
            <div className="rounded-full ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900/50">
              <LayeredAvatar user={user} size={avatarSize} />
            </div>
          )}
        </div>
      </div>

      {/* Transparent HUD: steps + World (no navy bar) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-transparent">
        <div className="flex items-center gap-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          <Footprints size={16} className="text-cyan-400" />
          <span className="font-black text-sm">{stepsBanked}</span>
        </div>
        <button
          type="button"
          onClick={() => setTravelMenuVisible(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent border border-cyan-400/50 hover:bg-white/10 text-cyan-400 transition-colors"
        >
          <Compass size={18} />
          <span className="text-[10px] font-black uppercase tracking-wider">World</span>
        </button>
      </div>

      <TravelMenu
        visible={travelMenuVisible}
        onClose={() => setTravelMenuVisible(false)}
        user={user}
        nodes={nodes}
        onTravelSuccess={(newX, newY, cost) => {
          fastTravel(newX, newY, cost);
          setTravelMenuVisible(false);
        }}
      />

      <InteractionModal
        visible={interactionVisible}
        onClose={() => {
          setInteractionVisible(false);
          setEncounter(null);
        }}
        activeInteraction={encounter}
        onOpenShop={setActiveTab ? () => setActiveTab('shop') : undefined}
        availableQuests={availableQuests}
        userQuests={userQuests}
        onAcceptQuest={acceptQuest}
        onClaimQuestReward={claimQuestReward}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spritesheet-animation-game {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% + (100% / var(--frame-count)))); }
        }
        .spritesheet-inner-game {
          animation: spritesheet-animation-game var(--animation-speed, 0.8s) steps(calc(var(--frame-count) - 1)) infinite;
        }
      ` }} />
    </div>
  );
}
