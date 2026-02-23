import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DungeonInstance {
  id: string;
  name: string;
  difficulty: string;
  xp_reward: number;
  coin_reward: number;
  requirement: string;
  boss: string;
  target_distance_meters: number;
  image_url?: string | null;
  description?: string;
  tier?: string;
}

export const useDungeons = () => {
  const [dungeons, setDungeons] = useState<DungeonInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDungeons = async () => {
      try {
        setLoading(true);
        // Attempt to fetch from 'dungeons' table
        const { data, error } = await supabase
          .from('dungeons')
          .select('*')
          .order('target_distance_meters', { ascending: true }); 

        if (error) {
          console.log('Error fetching dungeons, using fallback:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          setDungeons(data);
        } else {
          throw new Error('No dungeons found');
        }
      } catch (err) {
        // FALLBACK DATA (Matches Supabase DB)
        setDungeons([
          {
            id: '425dc861-6ce0-4ef3-bde3-79c71ae47f8e',
            name: 'Cave of Shadows',
            difficulty: 'E-Rank', 
            xp_reward: 500,
            coin_reward: 100,
            requirement: '5km',
            boss: 'Shadow Stalker',
            target_distance_meters: 5000,
            image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
            tier: '5k',
            description: 'A dark cavern specifically for novice hunters testing their endurance.'
          },
          {
            id: 'd1767643446167',
            name: 'The Sunday Track Raid',
            difficulty: 'E-rank', 
            xp_reward: 500,
            coin_reward: 100,
            requirement: '10km',
            boss: 'Interval Ogre',
            target_distance_meters: 10000,
            image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
            tier: '10k',
            description: ''
          },
          {
            id: '803b1360-3f64-421e-a068-a6630fea2c41',
            name: 'Iron Fortress',
            difficulty: 'C-Rank', 
            xp_reward: 1500,
            coin_reward: 300,
            requirement: '15km',
            boss: 'Iron Golem',
            target_distance_meters: 15000,
            image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
            tier: '15k',
            description: 'A grueling fortress run that requires steel determination.'
          },
          {
            id: '0ba6b897-f90a-4891-83f6-ece117b7028d',
            name: 'Crystal Citadel',
            difficulty: 'B-Rank', 
            xp_reward: 2500,
            coin_reward: 600,
            requirement: '20km',
            boss: 'Crystal Guardian',
            target_distance_meters: 20000,
            image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
            tier: '20k',
            description: 'Only elite hunters can reach the heart of this crystalline maze.'
          },
          {
            id: 'f6314787-9811-4ea7-b06f-f61705f46944',
            name: 'Abyss of Void',
            difficulty: 'S-Rank', 
            xp_reward: 5000,
            coin_reward: 1500,
            requirement: '40km',
            boss: 'Void Dragon',
            target_distance_meters: 40000,
            image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
            tier: '40k',
            description: 'The ultimate test. Few enter, even fewer return.'
          }
        ]);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDungeons();
  }, []);

  return { dungeons, loading, error };
};
