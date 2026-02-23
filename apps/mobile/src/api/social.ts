import { supabase } from '@/lib/supabase';
import { User, UserCosmetic, ShopItem } from '@/types/user';
import { dateUtils } from '@/utils/dateUtils';

export const api = {
  // Get all friends-related data
  getFriendsData: async (userId: string) => {
    try {
      // 1. Fetch all friendship relations for the current user
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('id, user_id_1, user_id_2, status')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      if (friendsError) throw friendsError;
      if (!friendships) return { friends: [], friendRequests: [], outgoingRequests: [] };

      // 2. Collect all unique user IDs from these friendships
      const userIds = new Set<string>();
      friendships.forEach(f => {
        userIds.add(f.user_id_1);
        userIds.add(f.user_id_2);
      });

      // 3. Fetch all profile data for these users, including cosmetics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          cosmetics:user_cosmetics(
            *,
            shop_items:shop_item_id(*)
          )
        `)
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // 4. Create a map for easy profile lookup
      const profilesMap = new Map(profiles.map(p => [p.id, p]));

      // 5. Build the final arrays with the rich profile data
      const friends = friendships
        .filter(f => f.status === 'accepted')
        .map(f => {
          const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          return profilesMap.get(friendId);
        })
        .filter(Boolean); // Filter out any potential undefined profiles

      const friendRequests = friendships
        .filter(f => f.status === 'pending' && f.user_id_2 === userId)
        .map(f => ({ ...f, requester: profilesMap.get(f.user_id_1) }))
        .filter(f => f.requester); // Ensure requester profile exists

      const outgoingRequests = friendships
        .filter(f => f.status === 'pending' && f.user_id_1 === userId)
        .map(f => ({ ...f, recipient: profilesMap.get(f.user_id_2) }))
        .filter(f => f.recipient); // Ensure recipient profile exists
        
      return {
        friends,
        friendRequests,
        outgoingRequests,
      };
    } catch (error) {
      console.error('Error fetching friends data:', error);
      throw error;
    }
  },

  // Get showcase hunters (weekly vote; one vote per user per week)
  getShowcaseHunters: async (userId: string) => {
    try {
      const voteWeek = dateUtils.getCurrentWeekKey();
      const daysUntilReset = dateUtils.getDaysUntilNextWeek();

      const { data: hunters, error } = await supabase
        .from('profiles')
        .select(`
          *,
          cosmetics:user_cosmetics(
            *,
            shop_items:shop_item_id(*)
          )
        `)
        .order('showcase_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Has this user voted this week?
      const { data: myVotesThisWeek, error: voteError } = await supabase
        .from('showcase_votes')
        .select('target_id, vote_type')
        .eq('voter_id', userId)
        .eq('vote_month', voteWeek);

      if (voteError) throw voteError;
      const userHasVoted = (myVotesThisWeek || []).length > 0;
      const myVoteThisWeek = myVotesThisWeek?.[0] ?? null;

      // This week's vote counts per target (resonate / interfere)
      const { data: weekVotes, error: weekVotesError } = await supabase
        .from('showcase_votes')
        .select('target_id, vote_type')
        .eq('vote_month', voteWeek);

      if (weekVotesError) throw weekVotesError;
      const resonanceByTarget: Record<string, number> = {};
      const interfereByTarget: Record<string, number> = {};
      (weekVotes || []).forEach((v: any) => {
        const id = v.target_id;
        if (v.vote_type === 'resonate') resonanceByTarget[id] = (resonanceByTarget[id] || 0) + 1;
        else interfereByTarget[id] = (interfereByTarget[id] || 0) + 1;
      });

      const huntersWithVotes = (hunters || []).map((h: any) => ({
        ...h,
        userVote: myVoteThisWeek?.target_id === h.id ? myVoteThisWeek.vote_type : null,
        resonance_count: resonanceByTarget[h.id] || 0,
        interference_count: interfereByTarget[h.id] || 0,
      }));

      return {
        hunters: huntersWithVotes,
        userHasVoted,
        daysUntilReset,
      };
    } catch (error) {
      console.error('Error fetching showcase hunters:', error);
      throw error;
    }
  },

  // Get associations
  getAssociations: async () => {
    try {
      const { data, error } = await supabase
        .from('associations')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching associations:', error);
      throw error;
    }
  },

  // Get leaderboard
  getLeaderboard: async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          cosmetics:user_cosmetics(
            *,
            shop_items:shop_item_id(*)
          )
        `)
        .order('exp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },

  // Friend actions
  sendFriendRequest: async (userId1: string, userId2: string) => {
    const { error } = await supabase
      .from('friendships')
      .insert({ user_id_1: userId1, user_id_2: userId2, status: 'pending' });
    if (error) throw error;
  },

  acceptFriendRequest: async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) throw error;
  },

  rejectFriendRequest: async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw error;
  },

  cancelFriendRequest: async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw error;
  },

  // Association actions
  applyToAssociation: async (userId: string, associationId: string) => {
    // In this simplified version, we just update the user's association_id
    // Real logic might involve an 'applications' table
    const { error } = await supabase
      .from('profiles')
      .update({ association_id: associationId })
      .eq('id', userId);
    if (error) throw error;
  },

  handleApplicantDecision: async (applicantId: string, action: 'accept' | 'reject') => {
    // Logic for accepting/rejecting applicants would go here
    // For now, placeholder
  },

  createAssociation: async (userId: string, name: string, emblemUrl: string) => {
    try {
      // 1. Create association
      const { data: association, error: createError } = await supabase
        .from('associations')
        .insert({ name, emblem_url: emblemUrl })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ association_id: association.id })
        .eq('id', userId);

      if (updateError) throw updateError;

      return association;
    } catch (error) {
      console.error('Error creating association:', error);
      throw error;
    }
  },

  voteShowcase: async (voterId: string, targetId: string, voteType: 'resonate' | 'interfere') => {
    const voteWeek = dateUtils.getCurrentWeekKey();
    const value = voteType === 'resonate' ? 1 : -1;

    const { data, error } = await supabase.rpc('vote_showcase_rpc', {
      voter_id_param: voterId,
      target_id_param: targetId,
      vote_type_param: voteType,
      vote_month_param: voteWeek,
      vote_value_param: value
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.message);

    return { newCoins: data?.new_coins };
  },

  searchHunters: async (query: string, excludeUserId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        cosmetics:user_cosmetics(
          *,
          shop_items:shop_item_id(*)
        )
      `)
      .ilike('hunter_name', `%${query}%`)
      .neq('id', excludeUserId)
      .limit(10);
    
    if (error) throw error;
    return data || [];
  },

  getSuggestions: async (excludeUserId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        cosmetics:user_cosmetics(
          *,
          shop_items:shop_item_id(*)
        )
      `)
      .neq('id', excludeUserId)
      .limit(5); // In real app, maybe random or based on level
    
    if (error) throw error;
    return data || [];
  }
};
