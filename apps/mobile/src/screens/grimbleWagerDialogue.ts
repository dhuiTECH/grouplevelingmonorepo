import type { ActionButton, DialogueLine } from '@/components/DialogueScene';
import type { ChestTier } from '@/screens/runCompleteChestRng';

const TIER_LABEL: Record<ChestTier, string> = {
  small: 'Small',
  silver: 'Silver',
  medium: 'Medium',
  large: 'Large',
};

export const GRIMBLE_WAGER_GOLD = 500;

export function grimbleOfferLines(baseChest: ChestTier): DialogueLine[] {
  const label = TIER_LABEL[baseChest];
  return [
    {
      npc_name: 'Grimble',
      text: `Heh, ${label} chest from your run. Gimme ${GRIMBLE_WAGER_GOLD}g, flip the coin: tier up or Small. Pass keeps ${label}. C'mon, what's a little shine?`,
    },
  ];
}

export function grimbleResultLines(won: boolean, finalTier: ChestTier): DialogueLine[] {
  const label = TIER_LABEL[finalTier];
  return [
    {
      npc_name: 'Grimble',
      text: won
        ? `Heh, lucky toss! ${label} chest. Don't spend it all in one place, eh?`
        : `House wins, heh heh. Still a ${label} chest. Could be worse, could be worse.`,
    },
  ];
}

export const GRIMBLE_WAGER_ACTIONS: ActionButton[] = [
  { label: 'Pass', target_event: 'grimble_pass' },
  { label: `Flip ${GRIMBLE_WAGER_GOLD}g`, target_event: 'grimble_wager' },
];
