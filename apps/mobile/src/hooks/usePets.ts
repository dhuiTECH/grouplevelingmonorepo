import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPet } from '@/types/pet';
import { useUserGameDataStore } from '@/store/useUserGameDataStore';

export function usePets() {
  const { user } = useAuth();
  const storeHydrated = useUserGameDataStore((s) => s._hasHydrated);
  const storePets = useUserGameDataStore((s) => (user ? s.pets[user.id] : undefined));

  const [pets, setPets] = useState<UserPet[]>(storePets ?? []);
  const [loading, setLoading] = useState(!storePets || storePets.length === 0);

  useEffect(() => {
    if (storeHydrated && storePets && storePets.length > 0 && pets.length === 0) {
      setPets(storePets);
      setLoading(false);
    }
  }, [storeHydrated, storePets]);

  const fetchPets = useCallback(async () => {
    if (!user) return;
    try {
      const hasCache = pets.length > 0;
      if (!hasCache) setLoading(true);
      const { data, error } = await supabase
        .from('user_pets')
        .select(`
          *,
          pet_details:encounter_pool(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      const result = (data as any[]) || [];
      setPets(result);
      useUserGameDataStore.getState().setPets(user.id, result);
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, pets.length]);

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
      setPets(prev => {
        const updated = prev.map(p => p.id === petId ? { ...p, level: newLevel, experience: newExp } : p);
        if (user) useUserGameDataStore.getState().setPets(user.id, updated);
        return updated;
      });
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
        setPets(prev => {
          const updated = prev.map(p => p.id === petId ? { ...p, nickname: data.nickname } : p);
          if (user) useUserGameDataStore.getState().setPets(user.id, updated);
          return updated;
        });
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
      setPets(prev => {
        const updated = prev.map(p => p.id === petId ? { ...p, metadata } : p);
        if (user) useUserGameDataStore.getState().setPets(user.id, updated);
        return updated;
      });
    } catch (error) {
      console.error('Error updating pet metadata:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;
    if (storeHydrated && storePets && storePets.length > 0) {
      setPets(storePets);
      setLoading(false);
      fetchPets().catch(() => {});
    } else {
      fetchPets();
    }
  }, [user?.id]);

  return { pets, loading, fetchPets, addPet, levelUpPet, renamePet, updatePetMetadata };
}
