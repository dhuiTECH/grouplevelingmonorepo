import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { calculateDerivedStats, getRank } from '@/utils/stats';

export const resolveAvatar = (avatar: string | null) => {
  if (!avatar) return require('../../assets/sungjinwoo.png');
  if (avatar.startsWith('http')) return { uri: avatar };
  
  // Handle local assets
  const cleanName = avatar.replace(/^\//, '');
  switch (cleanName) {
    case 'NoobMan.png':
    case 'NoobMan':
      return require('../../assets/NoobMan.png');
    case 'NoobWoman.png':
    case 'NoobWoman':
      return require('../../assets/NoobWoman.png');
    case 'Noobnonbinary.png':
    case 'Noobnonbinary':
      return require('../../assets/Noobnonbinary.png');
    default:
      return { uri: avatar };
  }
};

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseAuthUser | null;
  isLoading: boolean;
  signInWithOtp: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkProfileExists: (identifier: string) => Promise<any>;
  refreshProfile: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  linkAccount: (provider: 'google' | 'apple') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to sync local coordinates to AsyncStorage
  const saveLocalCoords = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem('last_known_coords', JSON.stringify({ x, y }));
    } catch (e) {
      console.warn('Failed to save local coordinates:', e);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          cosmetics:user_cosmetics(
            id,
            equipped,
            shop_item_id,
            quantity,
            created_at:acquired_at,
            shop_items:shop_item_id(*)
          )
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error refreshing profile:', profileError);
        return;
      }

      if (profile) {
        const profileAsUser = { ...profile, level: profile.level || 1 } as User;
        const derived = calculateDerivedStats(profileAsUser);
        const maxHP = derived.maxHP ?? 100;
        const maxMP = derived.maxMP ?? 50;
        const syncedHP = profile.max_hp == null || profile.max_hp < maxHP ? maxHP : Math.min(profile.current_hp ?? maxHP, maxHP);
        const syncedMP = profile.max_mp == null || profile.max_mp < maxMP ? maxMP : Math.min(profile.current_mp ?? maxMP, maxMP);
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile.hunter_name || session.user.user_metadata?.display_name || 'User',
          level: profile.level || 1,
          exp: Number(profile.exp) || 0,
          coins: Number(profile.coins) || 0,
          gems: profile.gems || 0,
          hunter_rank: profile.hunter_rank || getRank(profile.level || 1),
          current_class: profile.current_class,
          gender: profile.gender,
          onboarding_completed: profile.onboarding_completed,
          onboarding_step:
            (profile as { onboarding_step?: User['onboarding_step'] }).onboarding_step ??
            (profile.onboarding_completed ? 'done' : 'basics'),
          tutorial_completed: profile.tutorial_completed,
          cosmetics: profile.cosmetics || [],
          submittedIds: [],
          slotsUsed: 0,
          createdAt: new Date(profile.created_at || new Date()),
          updatedAt: new Date(profile.updated_at || new Date()),
          current_hp: syncedHP,
          max_hp: maxHP,
          current_mp: syncedMP,
          max_mp: maxMP,
          profilePicture: resolveAvatar(profile.avatar),
          rank_tier: profile.rank_tier,
          next_advancement_attempt: profile.next_advancement_attempt,
          current_title: profile.current_title,
          unassigned_stat_points: profile.unassigned_stat_points,
          skill_loadout: profile.skill_loadout,
          last_reset: profile.last_reset,
          base_body_silhouette_url: profile.base_body_silhouette_url,
          base_body_tint_hex: profile.base_body_tint_hex,
          hair_tint_hex: profile.hair_tint_hex,
          current_ap: profile.current_ap || 3,
          max_ap: profile.max_ap || 3,
          world_x: profile.world_x ?? 24.00,
          world_y: profile.world_y ?? 64.50,
          steps_banked: profile.steps_banked ?? 0,
          last_sync_time: profile.last_sync_time,
        } as User);

        // Save fresh coords to local storage
        saveLocalCoords(profile.world_x ?? 24.00, profile.world_y ?? 64.50);
      }
    } catch (err) {
      console.error('Fatal error refreshing profile:', err);
    }
  };

  useEffect(() => {
    // Handle deep links for OAuth
    const handleDeepLink = async (url: string) => {
      const { queryParams } = Linking.parse(url);
      const access_token = queryParams?.access_token as string;
      const refresh_token = queryParams?.refresh_token as string;

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) console.error('Error setting session from deep link:', error);
      }
    };

    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Check active sessions and sets the user
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        setSupabaseUser(session.user);
        
        // 1. Load local coordinates IMMEDIATELY to prevent 0,0 map flash
        try {
          const stored = await AsyncStorage.getItem('last_known_coords');
          if (stored) {
            const { x, y } = JSON.parse(stored);
            setUser(prev => {
              if (prev) return { ...prev, world_x: x, world_y: y };
              // If no profile yet, provide a skeleton user with the local coords
              return {
                id: session.user.id,
                email: session.user.email || '',
                name:
                  session.user.user_metadata?.display_name ||
                  session.user.user_metadata?.full_name ||
                  'Hunter',
                world_x: x,
                world_y: y,
                level: 1,
                exp: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                submittedIds: [],
                slotsUsed: 0,
              } as User;
            });
          }
        } catch (e) {
          console.warn('Failed to load local coords:', e);
        }

        // 2. Fetch full profile from DB
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              *,
              cosmetics:user_cosmetics(
                id,
                equipped,
                shop_item_id,
                quantity,
                created_at:acquired_at,
                shop_items:shop_item_id(*)
              )
            `)
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          if (profile) {
            const profileAsUser = { ...profile, level: profile.level || 1, str_stat: profile.str_stat, spd_stat: profile.spd_stat, end_stat: profile.end_stat, int_stat: profile.int_stat, lck_stat: profile.lck_stat, per_stat: profile.per_stat, wil_stat: profile.wil_stat } as User;
            const derived = calculateDerivedStats(profileAsUser);
            const maxHP = derived.maxHP ?? 100;
            const maxMP = derived.maxMP ?? 50;
            const syncedHP = profile.max_hp == null || profile.max_hp < maxHP ? maxHP : Math.min(profile.current_hp ?? maxHP, maxHP);
            const syncedMP = profile.max_mp == null || profile.max_mp < maxMP ? maxMP : Math.min(profile.current_mp ?? maxMP, maxMP);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile.hunter_name || session.user.user_metadata?.display_name || 'User',
              level: profile.level || 1,
              exp: Number(profile.exp) || 0,
              coins: Number(profile.coins) || 0,
              gems: profile.gems || 0,
              hunter_rank: profile.hunter_rank || getRank(profile.level || 1),
              current_class: profile.current_class,
              gender: profile.gender,
              onboarding_completed: profile.onboarding_completed,
              onboarding_step:
                (profile as { onboarding_step?: User['onboarding_step'] }).onboarding_step ??
                (profile.onboarding_completed ? 'done' : 'basics'),
              tutorial_completed: profile.tutorial_completed,
              cosmetics: profile.cosmetics || [],
              submittedIds: [],
              slotsUsed: 0,
              createdAt: new Date(profile.created_at || new Date()),
              updatedAt: new Date(profile.updated_at || new Date()),
              current_hp: syncedHP,
              max_hp: maxHP,
              current_mp: syncedMP,
              max_mp: maxMP,
              profilePicture: resolveAvatar(profile.avatar),
              rank_tier: profile.rank_tier,
              next_advancement_attempt: profile.next_advancement_attempt,
              current_title: profile.current_title,
              unassigned_stat_points: profile.unassigned_stat_points,
              skill_loadout: profile.skill_loadout,
              last_reset: profile.last_reset,
              base_body_silhouette_url: profile.base_body_silhouette_url,
              base_body_tint_hex: profile.base_body_tint_hex,
              current_ap: profile.current_ap || 3,
              max_ap: profile.max_ap || 3,
              world_x: profile.world_x ?? 24.00,
              world_y: profile.world_y ?? 64.50,
              steps_banked: profile.steps_banked ?? 0,
              last_sync_time: profile.last_sync_time,
            } as User);

            // Sync fresh coords to local storage
            saveLocalCoords(profile.world_x ?? 24.00, profile.world_y ?? 64.50);
          }
        } catch (err) {
          console.error('Fatal error in getInitialSession:', err);
        }
      }
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session) {
          try {
             const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select(`
                  *,
                  cosmetics:user_cosmetics(
                    id,
                    equipped,
                    shop_item_id,
                    quantity,
                    created_at:acquired_at,
                    shop_items:shop_item_id(*)
                  )
                `)
                .eq('id', session.user.id)
                .maybeSingle();

             if (profileError) {
               console.error('Error fetching profile in onAuthStateChange:', profileError);
             }

             if (profile) {
               const profileAsUser = { ...profile, level: profile.level || 1, str_stat: profile.str_stat, spd_stat: profile.spd_stat, end_stat: profile.end_stat, int_stat: profile.int_stat, lck_stat: profile.lck_stat, per_stat: profile.per_stat, wil_stat: profile.wil_stat } as User;
               const derived = calculateDerivedStats(profileAsUser);
               const maxHP = derived.maxHP ?? 100;
               const maxMP = derived.maxMP ?? 50;
               const syncedHP = profile.max_hp == null || profile.max_hp < maxHP ? maxHP : Math.min(profile.current_hp ?? maxHP, maxHP);
               const syncedMP = profile.max_mp == null || profile.max_mp < maxMP ? maxMP : Math.min(profile.current_mp ?? maxMP, maxMP);
               setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.hunter_name || session.user.user_metadata?.display_name || 'User',
                level: profile.level || 1,
                exp: Number(profile.exp) || 0,
                coins: Number(profile.coins) || 0,
                gems: profile.gems || 0,
                hunter_rank: profile.hunter_rank || getRank(profile.level || 1),
              current_class: profile.current_class,
                gender: profile.gender,
                onboarding_completed: profile.onboarding_completed,
                onboarding_step:
                  (profile as { onboarding_step?: User['onboarding_step'] }).onboarding_step ??
                  (profile.onboarding_completed ? 'done' : 'basics'),
                tutorial_completed: profile.tutorial_completed,
                cosmetics: profile.cosmetics || [],
                submittedIds: [],
                slotsUsed: 0,
                createdAt: new Date(profile.created_at || new Date()),
                updatedAt: new Date(profile.updated_at || new Date()),
                current_hp: syncedHP,
                max_hp: maxHP,
                current_mp: syncedMP,
                max_mp: maxMP,
                world_x: profile.world_x ?? 24.00,
                world_y: profile.world_y ?? 64.50,
                steps_banked: profile.steps_banked ?? 0,
                last_sync_time: profile.last_sync_time,
                profilePicture: resolveAvatar(profile.avatar),
                rank_tier: profile.rank_tier,
                next_advancement_attempt: profile.next_advancement_attempt,
                current_title: profile.current_title,
                unassigned_stat_points: profile.unassigned_stat_points,
                skill_loadout: profile.skill_loadout,
                last_reset: profile.last_reset,
                base_body_silhouette_url: profile.base_body_silhouette_url,
                base_body_tint_hex: profile.base_body_tint_hex,
                hair_tint_hex: profile.hair_tint_hex,
                current_ap: profile.current_ap || 3,
                max_ap: profile.max_ap || 3,
                world_x: profile.world_x ?? 24.00,
                world_y: profile.world_y ?? 64.50,
                steps_banked: profile.steps_banked ?? 0,
                last_sync_time: profile.last_sync_time,
              } as User);

              // Sync fresh coords to local storage
              saveLocalCoords(profile.world_x ?? 24.00, profile.world_y ?? 64.50);
             }
          } catch (err) {
            console.error('Fatal error in onAuthStateChange:', err);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSupabaseUser(null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOtp = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        
        if (result.type === 'success' && result.url) {
          const { queryParams } = Linking.parse(result.url);
          const access_token = queryParams?.access_token as string;
          const refresh_token = queryParams?.refresh_token as string;

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }
        }
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, token: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const checkProfileExists = async (identifier: string): Promise<any> => {
    // Use maybeSingle() so "no row" is not an error (single() returns 406 when 0 rows)
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', identifier)
      .maybeSingle();

    if (profileByEmail) return profileByEmail;

    const { data: profileByName } = await supabase
      .from('profiles')
      .select('*')
      .eq('hunter_name', identifier)
      .maybeSingle();

    return profileByName;
  };

  const signInAsGuest = async (): Promise<void> => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.session?.user) setSupabaseUser(data.session.user);
    await refreshProfile();
  };

  const linkAccount = async (provider: 'google' | 'apple'): Promise<void> => {
    if (provider === 'apple') {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS.');
      }
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error('Apple Sign-In is not available on this device.');
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }
      const { error } = await supabase.auth.linkIdentity({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      await refreshProfile();
      return;
    }

    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const access_token = queryParams?.access_token as string;
        const refresh_token = queryParams?.refresh_token as string;
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    }
    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
        signInWithOtp,
        signInWithGoogle,
        verifyOtp,
        logout,
        setUser,
        checkProfileExists,
        refreshProfile,
        signInAsGuest,
        linkAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
