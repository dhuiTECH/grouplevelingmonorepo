import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPet } from '@/types/pet';

export function usePets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<UserPet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_pets')
        .select(`
          *,
          pet_details:encounter_pool(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setPets((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addPet = async (petId: string, nickname: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_pets')
        .insert({
          user_id: user.id,
          pet_id: petId,
          nickname,
          level: 1,
          experience: 0
        });

      if (error) throw error;
      await fetchPets();
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  };

  const levelUpPet = async (petId: string, newLevel: number, newExp: number) => {
    try {
      const { error } = await supabase
        .from('user_pets')
        .update({
          level: newLevel,
          experience: newExp
        })
        .eq('id', petId);

      if (error) throw error;
      await fetchPets();
    } catch (error) {
      console.error('Error leveling up pet:', error);
      throw error;
    }
  };

  const renamePet = async (petId: string, newName: string) => {
    try {
      const { data, error } = await supabase
        .from('user_pets')
        .update({ nickname: newName })
        .eq('id', petId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        console.log('Pet renamed successfully:', data);
        if (data.nickname !== newName) {
            console.warn('Rename mismatch: requested', newName, 'got', data.nickname);
        }
        setPets(prev => prev.map(p => p.id === petId ? { ...p, nickname: data.nickname } : p));
      } else {
        throw new Error("Pet not found or permission denied.");
      }
    } catch (error) {
      console.error('Error renaming pet:', error);
      throw error;
    }
  };

  const updatePetMetadata = async (petId: string, metadata: any) => {
    try {
      const { error } = await supabase
        .from('user_pets')
        .update({ metadata })
        .eq('id', petId);

      if (error) throw error;
      setPets(prev => prev.map(p => p.id === petId ? { ...p, metadata } : p));
    } catch (error) {
      console.error('Error updating pet metadata:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  return { pets, loading, fetchPets, addPet, levelUpPet, renamePet, updatePetMetadata };
}
