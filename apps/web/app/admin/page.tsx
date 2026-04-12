"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Clock, Trophy, LogOut, Plus, Sword, Users, Settings, Edit, Edit2, Trash2, Coins, Loader2, Sparkles, Map, CheckCircle, XCircle, Zap, Check, Search, X, PawPrint, Music2, ScrollText, Globe, Newspaper, Package, Hammer } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { adminAuthorizedFetch } from '@/lib/admin-authorized-fetch';
import type { Session } from '@supabase/supabase-js';
import { PendingUser, Dungeon } from '@/components/admin/types';
import AdminNavItem from '@/components/admin/AdminNavItem';
import GachaManager from '@/components/admin/GachaManager';
import AddDungeonForm from '@/components/admin/AddDungeonForm';
import AddShopItemForm from '@/components/admin/AddShopItemForm';
import ApprovalsTab from '@/components/admin/ApprovalsTab';
import UsersTab from '@/components/admin/UsersTab';
import DungeonsTab from '@/components/admin/DungeonsTab';
import ShopTab from '@/components/admin/ShopTab';
import MapTab from '@/components/admin/MapTab';
import QuestsTab from '@/components/admin/QuestsTab';
import SkillsTab from '@/components/admin/SkillsTab';
import MobsTab from '@/components/admin/MobsTab';
import PetsTab from '@/components/admin/PetsTab';
import MusicTab from '@/components/admin/MusicTab';
import BlogEditorTab from '@/components/admin/BlogEditorTab';
import LootManagerTab from '@/components/admin/LootManagerTab';
import RecipeBuilderTab from '@/components/admin/RecipeBuilderTab';
import dynamic from 'next/dynamic';

const WorldMapEngine = dynamic(
  () => import('@/components/admin/WorldMap/WorldMapEngine').then(mod => mod.WorldMapEngine),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-[500px] bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }
);

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddDungeon, setShowAddDungeon] = useState(false);
  const [editingDungeonId, setEditingDungeonId] = useState<string | null>(null);
  const [showAddShopItem, setShowAddShopItem] = useState(false);
  const [showAddOtherItem, setShowAddOtherItem] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<any>(null);
  const [shopSlotFilter, setShopSlotFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('approvals');
  const [dungeonRegistrations, setDungeonRegistrations] = useState<{[dungeonId: string]: any[]}>({});
  const [selectedDungeonForRegistrations, setSelectedDungeonForRegistrations] = useState<string | null>(null);
  const [gachaCollections, setGachaCollections] = useState<any[]>([]);
  const [showAddGachaCollection, setShowAddGachaCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);


  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 STATE CHANGED - isLoading:', isLoading, 'isAdmin:', isAdmin, 'currentUser:', currentUser?.email);
  }, [isLoading, isAdmin, currentUser]);

  // Session management and Auth initialization
  useEffect(() => {
    console.log('🚀 Component mounted - initializing auth');
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        if (!supabase) {
          console.error('❌ Supabase client is null!');
          setIsLoading(false);
          router.push('/admin/login');
          return;
        }
        
        // Use getSession for initial check - this is more reliable for persistence
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ getSession error:', error);
          if (isMounted) {
            setIsLoading(false);
            router.push('/admin/login');
          }
          return;
        }
        
        if (session) {
          console.log('✅ Session restored! Verifying admin status...', session.user.email);
          if (isMounted) {
            setSession(session);
            await verifyAdminInDatabase(session.user);
          }
        } else {
          console.log('❌ No session found, redirecting to login');
          if (isMounted) {
            setSession(null);
            setIsLoading(false);
            router.push('/admin/login');
          }
        }
      } catch (err) {
        console.error('💥 Auth init error:', err);
        if (isMounted) {
          setIsLoading(false);
          router.push('/admin/login');
        }
      }
    };
    
    initAuth();

    // Listen for auth state changes to handle logouts/logins in other tabs or after session expires
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('🔔 Auth state changed:', event, 'hasSession:', !!currentSession);
      
      if (!isMounted) return;

      if (currentSession) {
        setSession(currentSession);
        // Only verify if we don't already have admin access or if it's a new login
        if (!isAdmin || event === 'SIGNED_IN') {
          await verifyAdminInDatabase(currentSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        router.push('/admin/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Only run once on mount

  const checkAuthAndAdminStatus = async () => {
    console.log('🔍 checkAuthAndAdminStatus called');
    
    if (!supabase) {
      console.log('❌ No supabase client');
      setIsLoading(false);
      router.push('/admin/login');
      return;
    }

    try {
      console.log('🔍 Getting session...');
      // Require Supabase auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('📋 Session result:', { 
        hasSession: !!session, 
        hasError: !!sessionError,
        userId: session?.user?.id,
        email: session?.user?.email 
      });
      
      if (session && !sessionError) {
        // Now verify the user has is_admin = true in the users table
        console.log('✅ Supabase Auth session found - checking admin status in database...');
        await verifyAdminInDatabase(session.user);
      } else {
        // No valid session - redirect to login
        console.log('❌ No Supabase session found. Redirecting to login.');
        setIsLoading(false);
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setIsLoading(false);
      router.push('/admin/login');
    }
  };

  const verifyAdminInDatabase = async (authUser: any) => {
    console.log('🔍 Verifying admin access for:', authUser.email);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin, hunter_name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('❌ profiles lookup failed:', error);
        setIsLoading(false);
        setIsAdmin(false);
        router.push('/admin/login');
        return;
      }

      if (!profile?.is_admin) {
        console.log('❌ User is not an admin (profiles.is_admin)');
        setIsLoading(false);
        setIsAdmin(false);
        setSession(null);
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      grantAdminAccess(authUser, profile);
    } catch (error) {
      console.error('❌ Error verifying admin status:', error);
      setIsLoading(false);
      router.push('/admin/login');
    }
  };

  const grantAdminAccess = (authUser: any, profile?: { is_admin?: boolean; hunter_name?: string | null }) => {
    console.log('🎯 grantAdminAccess called for:', authUser.email);

    const userData = {
      id: authUser.id,
      auth_user_id: authUser.id,
      name: profile?.hunter_name || authUser.email?.split('@')[0] || 'Admin',
      email: authUser.email || '',
      is_admin: profile?.is_admin === true,
    };
    console.log('👤 Setting currentUser:', userData);
      setCurrentUser(userData);
    
    // Set admin and loading states immediately - don't wait for data
    console.log('🔓 Setting isAdmin = true');
      setIsAdmin(true);
    console.log('⏹️ Setting isLoading = false');
    setIsLoading(false);
    
    console.log('🏁 Admin panel ready - loading data in background...');
    
    // Load all data in background (don't block UI)
    Promise.allSettled([
      loadUsers(),
      loadDungeons(),
      loadShopItems(),
      loadGachaCollections()
    ]).then((results) => {
      // Log results
      results.forEach((result, index) => {
        const names = ['users', 'dungeons', 'shopItems', 'gachaCollections'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${names[index]} loaded successfully`);
        } else {
          console.error(`❌ ${names[index]} failed:`, result.reason);
        }
      });
      console.log('✅ All background data loading completed');
    }).catch((error) => {
      console.error('❌ Error in background data loading:', error);
    });
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/admin/login');
    }
  };

  const loadUsers = async () => {
    try {
      console.log('📋 Loading users via API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds
      
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/users', {
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error loading users:', errorData);
        const errorMessage = errorData.details || errorData.error || 'Failed to load users';
        console.error('❌ Error details:', errorMessage);
        // Set empty arrays so UI doesn't break, but log the error
        setPendingUsers([]);
        setApprovedUsers([]);
        // Show error to user (non-blocking)
        if (errorData.details) {
          console.error('Database error:', errorData.details, 'Code:', errorData.code);
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Users loaded - Pending:', data.pendingUsers?.length || 0, 'Approved:', data.approvedUsers?.length || 0);
      
      // Validate data structure
      if (!data.pendingUsers || !data.approvedUsers) {
        console.error('❌ Invalid response structure:', data);
        setPendingUsers([]);
        setApprovedUsers([]);
        return;
      }
      
      setPendingUsers(data.pendingUsers || []);
      setApprovedUsers(data.approvedUsers || []);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('⏱️ Users API call timed out');
      } else {
        console.error('💥 Failed to load users:', error);
      }
      // Set empty arrays on error
      setPendingUsers([]);
      setApprovedUsers([]);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, action: 'approve' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve user');
      }

      console.log('✅ User approved');
      // Log success message
      console.log('✅ Hunter approved! User will receive access to the system.');
      // Refresh the user lists
      loadUsers();
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, action: 'reject' })
      });

      if (!response.ok) {
        throw new Error('Failed to reject user');
      }

      console.log('✅ User rejected');
      // Refresh the user lists
      loadUsers();
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, action: 'toggle_admin', value: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle admin status');
      }

      console.log('✅ Admin status toggled');
      // Refresh the user lists
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle admin status:', error);
    }
  };

  const loadDungeons = async () => {
    try {
      console.log('🏰 Loading dungeons...');
      const { data, error } = await supabase
        .from('dungeons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading dungeons:', error);
      } else {
        console.log('✅ Dungeons loaded:', data?.length || 0);
        setDungeons(data || []);
      }
    } catch (error) {
      console.error('💥 Failed to load dungeons:', error);
    }
  };

  const loadDungeonRegistrations = async (dungeonId: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/dungeon-registrations?dungeon_id=${dungeonId}`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load registrations');
      }

      const data = await response.json();
      setDungeonRegistrations(prev => ({
        ...prev,
        [dungeonId]: data.registrations || []
      }));
    } catch (error) {
      console.error('Failed to load dungeon registrations:', error);
    }
  };

  const handleUpdateRegistration = async (registrationId: string, action: 'approve' | 'ban' | 'remove', dungeonId: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/dungeon-registrations', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ registrationId, action })
      });

      if (!response.ok) {
        throw new Error('Failed to update registration');
      }

      // Reload registrations
      await loadDungeonRegistrations(dungeonId);
    } catch (error) {
      console.error('Failed to update registration:', error);
    }
  };

  const loadShopItems = async () => {
    try {
      console.log('🛒 Client: Calling /api/admin/shop');
      const response = await adminAuthorizedFetch('/api/admin/shop', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('🛒 Client: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log('🛒 Client: Response not ok:', errorText);
        setShopItems([]);
        return;
      }

      const data = await response.json();
      console.log('🛒 Client: Response data:', data);
      if (data.shopItems) {
        setShopItems(data.shopItems);
      } else {
        setShopItems([]);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('⏱️ Shop items API call timed out');
        alert('Loading shop items timed out — check your connection and try again.');
      } else {
        console.error('Failed to load shop items:', error);
      }
      setShopItems([]);
    }
  };

  const handleAddDungeon = async (dungeonData: Omit<Dungeon, 'id' | 'created_at'>) => {
    try {
      // Generate a unique ID for the dungeon (e.g., 'd3', 'd4', etc.)
      const existingDungeons = await supabase
        .from('dungeons')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      
      let newId = 'd1';
      if (existingDungeons.data && existingDungeons.data.length > 0) {
        const lastId = existingDungeons.data[0].id;
        const match = lastId.match(/^d(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          newId = `d${num + 1}`;
        } else {
          // Fallback: use timestamp-based ID
          newId = `d${Date.now()}`;
        }
      }

      const fullDungeonData = {
        ...dungeonData,
        id: newId,
      };

      const { data, error } = await supabase
        .from('dungeons')
        .insert([fullDungeonData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        const errorMsg = error.message || 'Unknown database error';
        alert(`Failed to add dungeon: ${errorMsg}\n\nHint: Check if all columns exist in the database.`);
        throw error;
      }

      setShowAddDungeon(false);
      loadDungeons();
    } catch (error) {
      console.error('Failed to add dungeon:', error);
    }
  };

  const handleUpdateDungeon = async (dungeonId: string, dungeonData: Omit<Dungeon, 'id' | 'created_at'>) => {
    try {
      console.log('🔄 Updating dungeon:', dungeonId, dungeonData);

      const { error } = await supabase
        .from('dungeons')
        .update(dungeonData)
        .eq('id', dungeonId);

      if (error) {
        console.error('❌ Supabase update error:', error);
        const errorMsg = error.message || 'Unknown database error';
        alert(`Failed to update dungeon: ${errorMsg}\n\nHint: Check if all columns exist in the database.`);
        throw error;
      }

      console.log('✅ Dungeon updated successfully');
      setEditingDungeonId(null);
      loadDungeons();
    } catch (error: any) {
      console.error('💥 Failed to update dungeon:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
  };

  const handleDeleteDungeon = async (dungeonId: string) => {
    // Auto-proceed with dungeon deletion (confirmation removed)
    console.log('Deleting dungeon:', dungeonId);

    try {
      const { error } = await supabase
        .from('dungeons')
        .delete()
        .eq('id', dungeonId);

      if (error) throw error;

      loadDungeons();
    } catch (error) {
      console.error('Failed to delete dungeon:', error);
    }
  };

  const loadGachaCollections = async () => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gacha', { headers });
      const data = await response.json();
      if (data.collections) {
        setGachaCollections(data.collections);
      }
    } catch (error) {
      console.error('Error loading gacha collections:', error);
    }
  };

  const handleCreateGachaCollection = async (data: any) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gacha', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (response.ok) {
        await loadGachaCollections();
        setShowAddGachaCollection(false);
      }
    } catch (error) {
      console.error('Error creating gacha collection:', error);
    }
  };

  const handleUpdateGachaCollection = async (data: any) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gacha', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (response.ok) {
        await loadGachaCollections();
        setShowAddGachaCollection(false);
        setEditingCollection(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error updating gacha collection:', error);
    }
  };

  const handleActivateGachaTheme = async (id: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gacha', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'activate', id })
      });
      if (response.ok) {
        await loadGachaCollections();
      }
    } catch (error) {
      console.error('Error activating gacha theme:', error);
    }
  };

  const handleUpdateCollectionItems = async (id: string, itemIds: string[]) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gacha', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'update_items', id, item_ids: itemIds })
      });
      if (response.ok) {
        await loadGachaCollections();
      }
    } catch (error) {
      console.error('Error updating collection items:', error);
    }
  };

  const handleDeleteGachaCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/gacha?id=${id}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        await loadGachaCollections();
      }
    } catch (error) {
      console.error('Error deleting gacha collection:', error);
    }
  };

  const handleAddShopItem = async (itemData: any) => {
    console.log('ADMIN SENDING TO API (ADD):', itemData);

    try {
      const response = await adminAuthorizedFetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData: { error?: string; details?: string } = {};
        try {
          errorData = text ? JSON.parse(text) : {};
        } catch {
          errorData = { error: text || 'Unknown error', details: `Status ${response.status}` };
        }
        const message = errorData.details || errorData.error || `Request failed (${response.status})`;
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to create shop item: ${message}`);
      }

      const data = await response.json();
      if (data.shopItem) {
        console.log('✅ Shop item created:', data.shopItem);
        setShowAddShopItem(false);
        loadShopItems();
      } else {
        console.error('No shopItem in response:', data);
        throw new Error('Server did not return a shop item — try again.');
      }
    } catch (error: any) {
      console.error('Failed to add shop item:', error);
      if (error?.name === 'AbortError') {
        throw new Error('Request timed out — check your connection and try again.');
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  const handleToggleShopItem = async (itemId: string, isActive: boolean) => {
    try {
      const response = await adminAuthorizedFetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, is_active: !isActive }),
      });

      if (response.ok) {
        loadShopItems();
      } else {
        const text = await response.text().catch(() => '');
        let msg = `Request failed (${response.status})`;
        try {
          const j = text ? JSON.parse(text) : {};
          msg = j.details || j.error || msg;
        } catch {
          if (text) msg = text;
        }
        console.error('Failed to toggle shop item:', msg);
        alert(`Could not update shop item: ${msg}`);
      }
    } catch (error) {
      console.error('Failed to toggle shop item:', error);
      const msg =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out — check your connection.'
          : error instanceof Error
            ? error.message
            : String(error);
      alert(`Could not update shop item: ${msg}`);
    }
  };

  const handleToggleFeatured = async (itemId: string, isFeatured: boolean) => {
    try {
      const response = await adminAuthorizedFetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, is_featured: !isFeatured }),
      });

      if (response.ok) {
        loadShopItems();
      } else {
        const text = await response.text().catch(() => '');
        let msg = `Request failed (${response.status})`;
        try {
          const j = text ? JSON.parse(text) : {};
          msg = j.details || j.error || msg;
        } catch {
          if (text) msg = text;
        }
        console.error('Failed to toggle featured status:', msg);
        alert(`Could not update featured status: ${msg}`);
      }
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      const msg =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out — check your connection.'
          : error instanceof Error
            ? error.message
            : String(error);
      alert(`Could not update featured status: ${msg}`);
    }
  };

  const handleEditShopItem = (item: any) => {
    setEditingShopItem(item);
    setShowAddShopItem(true);
  };

  const handleCopyShopItem = (item: any) => {
    // Create a copy without the id and metadata
    const { id, created_at, updated_at, ...itemData } = item;
    const copiedItem = {
      ...itemData,
      name: `${item.name} (Copy)`
    };
    // Note: We intentionally DON'T include the id here so it's treated as a new item
    setEditingShopItem(copiedItem);
    setShowAddShopItem(true);
  };

  const handleEditShopItemComplete = async (itemData: any) => {
    console.log('🔄 Updating shop item:', editingShopItem.id, 'with data:', itemData);

    try {
      const response = await adminAuthorizedFetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingShopItem.id,
          ...itemData,
        }),
      });

      const responseData = await response.json().catch(() => ({}));
      console.log('📡 API Response:', response.status, responseData);

      if (!response.ok) {
        console.error('❌ Failed to update shop item:', responseData);
        const msg =
          typeof responseData.details === 'string'
            ? responseData.details
            : typeof responseData.error === 'string'
              ? responseData.error
              : responseData.error?.message ??
                JSON.stringify(responseData.error ?? 'Unknown error');
        throw new Error(`Failed to update shop item: ${msg}`);
      }

      console.log('✅ Shop item updated successfully');
      if (responseData.shopItem) {
        setShopItems((prev) =>
          prev.map((item) =>
            item.id === responseData.shopItem.id ? responseData.shopItem : item,
          ),
        );
      }
      loadShopItems();
      setShowAddShopItem(false);
      setEditingShopItem(null);
    } catch (error) {
      console.error('💥 Failed to update shop item:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out — check your connection and try again.');
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  const handleDeleteShopItem = async (itemId: string) => {
    // Auto-proceed with shop item deletion (confirmation removed)
    console.log('Deleting shop item:', itemId);

    try {
      const response = await adminAuthorizedFetch(`/api/admin/shop?id=${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        loadShopItems();
      } else {
        const text = await response.text().catch(() => '');
        let msg = `Request failed (${response.status})`;
        try {
          const j = text ? JSON.parse(text) : {};
          msg = j.details || j.error || msg;
        } catch {
          if (text) msg = text;
        }
        console.error('Failed to delete shop item:', msg);
        alert(`Could not delete shop item: ${msg}`);
      }
    } catch (error) {
      console.error('Failed to delete shop item:', error);
      const msg =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out — check your connection.'
          : error instanceof Error
            ? error.message
            : String(error);
      alert(`Could not delete shop item: ${msg}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-8 font-mono">
        <div className="text-center space-y-4">
          <Clock className="animate-spin w-12 h-12 mx-auto text-blue-400" />
          <h1 className="text-xl font-black italic tracking-tighter text-blue-500">LOADING ADMIN PANEL</h1>
          <p className="text-xs text-gray-500">isLoading: {String(isLoading)} | isAdmin: {String(isAdmin)}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-red-900 text-red-400 flex flex-col items-center justify-center p-8 font-mono">
        <div className="text-center space-y-4">
          <div className="inline-block p-1 bg-gradient-to-r from-red-600 to-red-400 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.6)]">
            <div className="bg-black px-8 py-6 rounded-md border border-red-500/50">
              <h2 className="text-xl font-black italic tracking-tighter text-white mb-2 uppercase">Access Denied</h2>
              <div className="h-px w-full bg-red-900 mb-4" />
              <p className="text-sm font-bold text-red-100 uppercase leading-relaxed">
                Admin access required.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-100 font-mono relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse" />
      </div>

      <header className="p-3 md:p-4 border-b border-red-900/30 bg-black/90 backdrop-blur-3xl relative z-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
              ADMIN PANEL
            </h1>
            <p className="text-xs uppercase tracking-[0.4em] font-bold text-red-200 opacity-70">
              Hunter Management System
            </p>
            {currentUser && (
              <p className="text-[10px] text-gray-500 mt-1">Logged in as: {currentUser.email}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 md:gap-4">
            <Link 
              href="/asset-forge"
              className="px-3 py-2 md:px-4 md:py-2 clip-tech-button bg-purple-700 hover:bg-purple-600 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Sparkles size={16} className="md:w-[18px] md:h-[18px]" /> Asset Generator
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab('blog')}
              className={`px-3 py-2 md:px-4 md:py-2 clip-tech-button text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.35)] ${
                activeTab === 'blog'
                  ? 'bg-cyan-600 ring-2 ring-cyan-400/80'
                  : 'bg-cyan-900 hover:bg-cyan-700'
              }`}
            >
              <Newspaper size={16} className="md:w-[18px] md:h-[18px]" /> Blog editor
            </button>
            <div className="text-right">
              <div className="text-xs text-red-400 uppercase">Pending Approvals</div>
              <div className="text-lg md:text-xl font-black text-red-500">{pendingUsers.length}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 md:px-4 md:py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              <LogOut size={16} className="md:w-[18px] md:h-[18px]" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Admin Navigation Bar */}
      <nav className="bg-black/95 backdrop-blur-3xl border-b border-blue-900/30 px-4 py-3 z-40 md:px-6 md:py-4">
        <div className="max-w-6xl mx-auto">
          {/* Mobile: Horizontal scroll container */}
          <div className="flex overflow-x-auto scrollbar-hide md:justify-center md:overflow-visible">
            <div className="flex gap-1 md:gap-0 min-w-max md:min-w-0">
          <AdminNavItem id="approvals" icon={Clock} label={`Approvals (${pendingUsers.length})`} active={activeTab === 'approvals'} onClick={setActiveTab} />
          <AdminNavItem id="users" icon={Users} label={`Users (${approvedUsers.length})`} active={activeTab === 'users'} onClick={setActiveTab} />
          <AdminNavItem id="dungeons" icon={Sword} label={`Dungeons (${dungeons.length})`} active={activeTab === 'dungeons'} onClick={setActiveTab} />
          <AdminNavItem id="shop" icon={Plus} label={`Shop (${shopItems.length})`} active={activeTab === 'shop'} onClick={setActiveTab} />
          <AdminNavItem id="loot" icon={Package} label="Loot" active={activeTab === 'loot'} onClick={setActiveTab} />
          <AdminNavItem id="recipes" icon={Hammer} label="Recipes" active={activeTab === 'recipes'} onClick={setActiveTab} />
          <AdminNavItem id="gacha" icon={Sparkles} label="Gacha System" active={activeTab === 'gacha'} onClick={setActiveTab} />
          <AdminNavItem id="quests" icon={ScrollText} label="Quests" active={activeTab === 'quests'} onClick={setActiveTab} />
          <AdminNavItem id="skills" icon={Zap} label="Skills" active={activeTab === 'skills'} onClick={setActiveTab} />
          <AdminNavItem id="mobs" icon={Users} label="Mobs" active={activeTab === 'mobs'} onClick={setActiveTab} />
          <AdminNavItem id="pets" icon={PawPrint} label="Pets" active={activeTab === 'pets'} onClick={setActiveTab} />
          <AdminNavItem id="music" icon={Music2} label="Music" active={activeTab === 'music'} onClick={setActiveTab} />
          <AdminNavItem id="map_generator" icon={Globe} label="World Editor" active={activeTab === 'map_generator'} onClick={setActiveTab} />
            </div>
          </div>
        </div>
      </nav>

      <main className={`relative z-10 flex-1 ${activeTab === 'map_generator' ? 'w-full h-full' : activeTab === 'blog' ? 'p-3 md:p-4 max-w-7xl mx-auto w-full' : 'p-3 md:p-4 max-w-6xl mx-auto'}`}>

        {/* Tab Content */}
        {activeTab === 'approvals' && (
          <section>
            <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
            <Clock size={22} /> Pending Approvals
          </h2>

          {pendingUsers.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-gray-900/40 border border-red-900/30 p-3 md:p-4 rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      {user.avatar ? (
                      <img
                          src={user.avatar}
                        alt={user.hunter_name || user.name || 'User'}
                          className="w-12 h-12 rounded-full border-2 border-red-500/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const displayName = user.hunter_name || user.name || 'U';
                              parent.innerHTML = `<div class="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center text-red-400 font-black text-lg">${displayName[0].toUpperCase()}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center">
                          <span className="text-red-400 font-black text-lg">
                            {(user.hunter_name || user.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-black italic">{user.hunter_name || user.name}</div>
                        {user.email && (
                          <div className="text-xs text-gray-500">Email: {user.email}</div>
                        )}
                        <div className="text-xs text-gray-600">
                          Applied: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleApproveUser(user.id)}
                        className="px-3 py-2 md:px-4 md:py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} className="md:w-[18px] md:h-[18px]" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectUser(user.id)}
                        className="px-3 py-2 md:px-4 md:py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                      >
                        <XCircle size={16} className="md:w-[18px] md:h-[18px]" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {activeTab === 'users' && (
        <section>
            <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
            <User size={22} /> Approved Hunters
          </h2>

          {approvedUsers.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl text-center">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No approved users yet</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {approvedUsers.map((user) => (
                <div key={user.id} className="bg-gray-900/40 border border-red-900/30 p-3 md:p-4 rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      {user.avatar ? (
                      <img
                          src={user.avatar}
                        alt={user.hunter_name || user.name || 'User'}
                          className="w-12 h-12 rounded-full border-2 border-red-500/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const displayName = user.hunter_name || user.name || 'U';
                              parent.innerHTML = `<div class="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center text-red-400 font-black text-lg">${displayName[0].toUpperCase()}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center">
                          <span className="text-red-400 font-black text-lg">
                            {(user.hunter_name || user.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-black italic">{user.hunter_name || user.name}</div>
                        {user.email && (
                          <div className="text-xs text-gray-500">Email: {user.email}</div>
                        )}
                        <div className="text-xs text-red-400 flex items-center gap-1">
                          <Trophy size={14} />
                          Approved: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        user.is_admin
                          ? 'bg-yellow-600 text-yellow-100'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {user.is_admin ? 'ADMIN' : 'HUNTER'}
                      </span>
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        className={`px-3 py-1 rounded text-xs font-bold w-full sm:w-auto ${
                          user.is_admin
                            ? 'bg-gray-600 hover:bg-gray-500 text-white'
                            : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        }`}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {activeTab === 'dungeons' && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                <Sword size={22} /> Dungeon Management
              </h2>
            <button
              onClick={() => {
                setShowAddDungeon(!showAddDungeon);
                setEditingDungeonId(null);
              }}
              className="px-4 py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            >
              <Plus size={18} /> Add Dungeon
            </button>
          </div>

          {showAddDungeon && !editingDungeonId && (
            <div className="bg-gray-900/40 border border-purple-900/30 p-6 rounded-2xl mb-4 relative z-20">
              <AddDungeonForm onAdd={handleAddDungeon} onCancel={() => setShowAddDungeon(false)} />
            </div>
          )}

          <div className="space-y-4">
            {dungeons.map((dungeon) => (
              <div key={dungeon.id}>
                {editingDungeonId === dungeon.id ? (
                  <div className="bg-gray-900/40 border border-purple-900/30 p-6 rounded-2xl mb-4 relative z-20">
                    <AddDungeonForm 
                      dungeon={dungeon}
                      onAdd={(dungeonData) => handleUpdateDungeon(dungeon.id, dungeonData)}
                      onCancel={() => setEditingDungeonId(null)} 
                    />
                  </div>
                ) : (
                  <div className="bg-gray-900/40 border border-red-900/30 p-3 md:p-4 rounded-2xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black italic text-white">{dungeon.name}</div>
                          {dungeon.auto_start && (
                            <span className="text-[8px] bg-cyan-600/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{dungeon.type} • {dungeon.requirement}</div>
                        <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs">
                          <span className="text-green-400">XP: {dungeon.xp_reward}</span>
                          <span className="text-yellow-400">Coins: {dungeon.coin_reward}</span>
                          <span className="text-blue-400">Difficulty: {dungeon.difficulty}</span>
                          <span className="text-purple-400">Status: {dungeon.status}</span>
                          <span className="text-orange-400 truncate">Boss: {dungeon.boss}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                          {dungeon.scheduled_start && (
                            <div className="text-cyan-400 font-semibold">
                              Scheduled: {new Date(dungeon.scheduled_start).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                timeZone: 'America/Los_Angeles'
                              })} {new Date(dungeon.scheduled_start).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'America/Los_Angeles'
                              })} PST
                            </div>
                          )}
                          <div>Created: {new Date(dungeon.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:ml-4">
                        <button
                          onClick={() => {
                            setSelectedDungeonForRegistrations(
                              selectedDungeonForRegistrations === dungeon.id ? null : dungeon.id
                            );
                            if (selectedDungeonForRegistrations !== dungeon.id) {
                              loadDungeonRegistrations(dungeon.id);
                            }
                          }}
                          className="px-2 py-1 md:px-3 md:py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Users size={14} className="md:w-4 md:h-4" /> {selectedDungeonForRegistrations === dungeon.id ? 'Hide' : 'View'} Party
                        </button>
                        <button
                          onClick={() => {
                            setEditingDungeonId(dungeon.id);
                            setShowAddDungeon(false);
                          }}
                          className="px-2 py-1 md:px-3 md:py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Edit size={14} className="md:w-4 md:h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDungeon(dungeon.id)}
                          className="px-2 py-1 md:px-3 md:py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 size={14} className="md:w-4 md:h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show registrations for this dungeon */}
                {selectedDungeonForRegistrations === dungeon.id && (
                  <div className="mt-4 bg-gray-800/40 border border-purple-900/20 p-4 rounded-xl">
                    <div className="text-sm font-black text-purple-400 mb-3">Party Members ({dungeonRegistrations[dungeon.id]?.length || 0})</div>
                    {dungeonRegistrations[dungeon.id] && dungeonRegistrations[dungeon.id].length > 0 ? (
                      <div className="space-y-2">
                        {dungeonRegistrations[dungeon.id].map((registration: any) => {
                          const profile = registration.profiles || {};
                          return (
                            <div key={registration.id} className="flex items-center justify-between bg-gray-900/40 p-3 rounded-lg border border-gray-700/50">
                              <div className="flex items-center gap-3">
                                {profile.avatar ? (
                                  <img src={profile.avatar} alt={profile.hunter_name} className="w-10 h-10 rounded-full border border-purple-500/50" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full border border-purple-500/50 bg-gray-800 flex items-center justify-center">
                                    👤
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-bold text-white">{profile.hunter_name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-400">
                                    Level {profile.level || 1} • Rank {profile.hunter_rank || 'E'}
                                    {profile.email && ` • ${profile.email}`}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Status: <span className={`font-bold ${
                                      registration.status === 'approved' ? 'text-green-400' :
                                      registration.status === 'banned' ? 'text-red-400' :
                                      registration.status === 'rejected' ? 'text-orange-400' :
                                      'text-yellow-400'
                                    }`}>{registration.status.toUpperCase()}</span>
                                    {' • '}Registered: {new Date(registration.registered_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {registration.status !== 'approved' && (
                                  <button
                                    onClick={() => handleUpdateRegistration(registration.id, 'approve', dungeon.id)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold"
                                  >
                                    Approve
                                  </button>
                                )}
                                {registration.status !== 'banned' && (
                                  <button
                                    onClick={() => handleUpdateRegistration(registration.id, 'ban', dungeon.id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                                  >
                                    Ban
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateRegistration(registration.id, 'remove', dungeon.id)}
                                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">No registrations yet</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        {activeTab === 'shop' && (
          <ShopTab
            shopItems={shopItems}
            baseBodyShopItems={shopItems} // Pass full shop items list to use for base body references
            gachaCollections={gachaCollections}
            showAddShopItem={showAddShopItem}
            setShowAddShopItem={setShowAddShopItem}
            showAddOtherItem={showAddOtherItem}
            setShowAddOtherItem={setShowAddOtherItem}
            shopSlotFilter={shopSlotFilter}
            setShopSlotFilter={setShopSlotFilter}
            editingShopItem={editingShopItem}
            setEditingShopItem={setEditingShopItem}
            onAddShopItem={handleAddShopItem}
            onEditShopItemComplete={handleEditShopItemComplete}
            onToggleFeatured={handleToggleFeatured}
            onToggleShopItem={handleToggleShopItem}
            onDeleteShopItem={handleDeleteShopItem}
            onCopyShopItem={handleCopyShopItem}
            onEditShopItem={handleEditShopItem}
          />
        )}

        {activeTab === 'loot' && <LootManagerTab shopItems={shopItems} />}

        {activeTab === 'recipes' && <RecipeBuilderTab shopItems={shopItems} />}

        {activeTab === 'gacha' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                <Sparkles size={22} /> Gacha Collection Manager
              </h2>
              <button
                onClick={() => setShowAddGachaCollection(!showAddGachaCollection)}
                className="px-4 py-2 clip-tech-button bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold flex items-center gap-2"
              >
                <Plus size={18} /> New Collection
              </button>
            </div>

            {showAddGachaCollection && (
              <div className="bg-gray-900/60 border border-purple-900/30 p-6 rounded-2xl animate-in slide-in-from-top-4">
                <h3 className="text-sm font-black uppercase text-purple-300 mb-4">
                  {editingCollection ? 'Edit Collection' : 'Create New Collection'}
                </h3>
                <form onSubmit={async (e: any) => {
                  e.preventDefault();
                  setUploading(true);

                  try {
                    let coverUrl = editingCollection?.cover_image_url || '';

                    // Upload file if selected
                    if (selectedFile) {
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', selectedFile);

                      const uploadResponse = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                        },
                        body: uploadFormData
                      });

                      if (!uploadResponse.ok) {
                        const errorData = await uploadResponse.json();
                        throw new Error(errorData.error || 'Failed to upload file');
                      }

                      const uploadResult = await uploadResponse.json();
                      coverUrl = uploadResult.path;
                    }

                    const formData = new FormData(e.target);

                    if (editingCollection) {
                      // Update existing collection
                      handleUpdateGachaCollection({
                        id: editingCollection.id,
                        name: formData.get('name'),
                        description: formData.get('description'),
                        cover_image_url: coverUrl,
                        pool_type: formData.get('pool_type')
                      });
                    } else {
                      // Create new collection
                      handleCreateGachaCollection({
                        name: formData.get('name'),
                        description: formData.get('description'),
                        cover_image_url: coverUrl,
                        pool_type: formData.get('pool_type')
                      });
                    }
                  } catch (error) {
                    console.error('Upload error:', error);
                    alert('Failed to upload file. Please try again.');
                  } finally {
                    setUploading(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Theme Name</label>
                      <input name="name" required defaultValue={editingCollection?.name || ''} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" placeholder="e.g. Shadow Realm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Pool Type</label>
                      <select name="pool_type" required defaultValue={editingCollection?.pool_type || 'gate'} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none">
                        <option value="gate">Gacha Gate</option>
                        <option value="gachapon">Gachapon</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Upload Cover (Video/Image)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none file:bg-purple-600 file:text-white file:border-none file:px-2 file:py-1 file:rounded file:mr-2 file:text-xs"
                    />
                    <p className="text-[9px] text-gray-500 mt-1">Supported: Images (PNG, JPG, GIF, WebP) and Videos (WebM, MP4)</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Description</label>
                    <textarea name="description" rows={2} defaultValue={editingCollection?.description || ''} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" placeholder="Describe this collection..." />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => {
                      setShowAddGachaCollection(false);
                      setEditingCollection(null);
                      setSelectedFile(null);
                    }} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white uppercase">Cancel</button>
                    <button type="submit" disabled={uploading} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white text-xs font-black uppercase rounded shadow-lg shadow-purple-500/20 flex items-center gap-2">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {uploading ? 'Uploading...' : (editingCollection ? 'Update Collection' : 'Create Collection')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-12">
              {[
                { id: 'gate', label: 'Gacha Gate Themes (Avatars)', color: 'purple' },
                { id: 'gachapon', label: 'Gachapon Themes (Items)', color: 'blue' }
              ].map(pool => (
                <div key={pool.id} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-[1px] w-8 ${pool.color === 'purple' ? 'bg-purple-500/50' : 'bg-blue-500/50'}`} />
                    <h3 className={`text-[10px] font-black ${pool.color === 'purple' ? 'text-purple-400' : 'text-blue-400'} uppercase tracking-[0.4em] italic`}>{pool.label}</h3>
                    <div className={`h-[1px] flex-1 bg-gradient-to-r ${pool.color === 'purple' ? 'from-purple-500/50' : 'from-blue-500/50'} to-transparent`} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gachaCollections.filter(c => pool.id === 'gate' ? (c.pool_type === 'gate' || !c.pool_type) : c.pool_type === 'gachapon').map((collection) => (
                      <div key={collection.id} className={`bg-gray-900/40 border ${collection.is_active ? (pool.color === 'purple' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]') : 'border-gray-800'} p-5 rounded-2xl relative overflow-hidden transition-all hover:bg-gray-900/60`}>
                        {collection.is_active && (
                          <div className={`absolute top-3 right-3 ${pool.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'} text-[10px] font-black px-2 py-1 rounded text-white uppercase tracking-tighter animate-pulse`}>
                            Live Now
                          </div>
                        )}
                        
                        <div className="flex gap-4 mb-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-gray-800">
                            {collection.cover_image_url?.match(/\.(mp4|webm|mov)$/i) ? (
                              <video src={collection.cover_image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={collection.cover_image_url || '/placeholder.jpg'} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-black text-gray-100 uppercase tracking-tight">{collection.name}</h3>
                            <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 uppercase leading-tight font-bold">{collection.description}</p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleActivateGachaTheme(collection.id)}
                                disabled={collection.is_active}
                                className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${collection.is_active ? (pool.color === 'purple' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400') + ' cursor-default' : (pool.color === 'purple' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500') + ' text-white shadow-lg'}`}
                              >
                                {collection.is_active ? 'Active' : 'Activate Theme'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCollection(collection);
                                  setSelectedFile(null);
                                  setShowAddGachaCollection(true);
                                }}
                                className="px-3 py-1.5 bg-blue-900/20 hover:bg-blue-900/40 text-blue-500 rounded text-[10px] font-black uppercase transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteGachaCollection(collection.id)}
                                className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded text-[10px] font-black uppercase transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
                            Attached Items ({
                              shopItems.filter((item: any) => 
                                item.is_gacha_exclusive && (
                                  item.collection_id === collection.id || 
                                  collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id)
                                )
                              ).length
                            })
                          </label>
                          <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-1">
                              {shopItems.filter(item => 
                                item.is_gacha_exclusive && (
                                  item.collection_id === collection.id || 
                                  collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id)
                                )
                              ).map(item => {
                                const isLinkedViaColumn = item.collection_id === collection.id;
                                const isLinkedViaJunction = collection.collection_items?.some((ci: any) => ci.shop_item_id === item.id);
                                const isAttached = isLinkedViaColumn || isLinkedViaJunction;
                                return (
                                  <label key={item.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${isAttached ? (pool.color === 'purple' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-blue-500/10 border border-blue-500/30') : 'bg-black/20 border border-gray-800 hover:border-gray-700'}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isAttached}
                                      disabled={isLinkedViaColumn}
                                      onChange={(e) => {
                                        const currentIds = collection.collection_items?.map((ci: any) => ci.shop_item_id) || [];
                                        const newIds = e.target.checked 
                                          ? [...currentIds, item.id]
                                          : currentIds.filter((id: string) => id !== item.id);
                                        handleUpdateCollectionItems(collection.id, newIds);
                                      }}
                                      className={`w-3 h-3 ${pool.color === 'purple' ? 'text-purple-600' : 'text-blue-600'} bg-black border-gray-700 rounded ${isLinkedViaColumn ? 'opacity-50' : ''}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-gray-300 truncate uppercase">{item.name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      {isLinkedViaColumn && (
                                        <div className="text-[7px] font-black px-1 py-0.5 rounded bg-blue-900/40 text-blue-400 uppercase border border-blue-500/30">
                                          Linked
                                        </div>
                                      )}
                                      <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                                        {item.slot}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {shopItems.filter(item => item.is_gacha_exclusive).length === 0 && (
                            <p className="text-[10px] text-gray-600 italic">No items marked as &quot;Gacha Exclusive&quot; found. Set items to Gacha Exclusive in Shop Management first.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {gachaCollections.filter(c => pool.id === 'gate' ? (c.pool_type === 'gate' || !c.pool_type) : c.pool_type === 'gachapon').length === 0 && (
                    <div className="bg-black/20 border border-dashed border-gray-800 p-8 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">No {pool.label} themes created yet</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'quests' && (
          <QuestsTab />
        )}

        {activeTab === 'skills' && (
          <SkillsTab />
        )}

        {activeTab === 'mobs' && (
          <MobsTab />
        )}

        {activeTab === 'pets' && (
          <PetsTab />
        )}

        {activeTab === 'music' && (
          <MusicTab />
        )}

        {activeTab === 'blog' && (
          <BlogEditorTab />
        )}

        {activeTab === 'map_generator' && (
          <WorldMapEngine shopItems={shopItems} />
        )}

      </main>
    </div>
  );
}

// Add Dungeon Form Component
// Remove AddDungeonForm, CustomDropdown, and AddShopItemFormComponent
// (These have been extracted to separate files)
// Keep the rest of the file logic (state, effects, handlers) as they are used by the new components


<style>{`
  /* Mobile scrollbar hide */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`}</style>