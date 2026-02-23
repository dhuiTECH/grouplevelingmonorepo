import { useMemo } from 'react';

export const useWeeklyReset = (user: any) => {
    const isResetDue = useMemo(() => {
        if (!user?.id) return false;
        
        const lastReset = user.last_reset ? new Date(user.last_reset) : new Date(0); 
        const now = new Date();
        const day = now.getDay() || 7; // 1 (Mon) - 7 (Sun)
        
        // Calculate the most recent Monday at 00:00:00
        const thisMonday = new Date(now);
        thisMonday.setHours(0, 0, 0, 0);
        thisMonday.setDate(now.getDate() - day + 1);
        
        // If the last reset was before this week's Monday, a reset is due
        return lastReset < thisMonday;
    }, [user?.id, user?.last_reset]);

    return isResetDue;
};
