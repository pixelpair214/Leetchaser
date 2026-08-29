import React, { useMemo } from 'react';
import { UserStats } from '@/utils/leetcode-api';

export interface DashboardData {
  dailyProblem: { slug: string; title: string; difficulty: string } | null;
  friendSuggestions: any[];
  userStats: UserStats | null;
}

interface DashboardProps {
  data: DashboardData | null;
  isLoading: boolean;
  onOpenProblem: (slug: string, problemData?: any) => void;
}

export default function Dashboard({ data, isLoading, onOpenProblem }: DashboardProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4 space-y-6 animate-pulse">
         <div className="w-full h-24 bg-[var(--muted)] rounded-xl" />
         <div className="w-full h-40 bg-[var(--muted)] rounded-xl" />
         <div className="w-full h-20 bg-[var(--muted)] rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { dailyProblem, friendSuggestions, userStats } = data;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-500 bg-green-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'hard':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getRelativeTime = (timestampStr?: string) => {
    if (!timestampStr) return 'Recently';
    const timestamp = parseInt(timestampStr, 10) * 1000;
    const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };



  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 pb-6">
      
      {/* TODAY'S CHASE */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--muted-foreground)] tracking-wider mb-2 uppercase">Today's Chase</h2>
        <div 
          onClick={() => dailyProblem && onOpenProblem(dailyProblem.slug, dailyProblem)}
          className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 cursor-pointer hover:bg-[var(--muted)] transition-colors group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF8A00]">DAILY FOCUS</span>
              {dailyProblem && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getDifficultyColor(dailyProblem.difficulty)}`}>
                  {dailyProblem.difficulty}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            {dailyProblem ? (
               <div className="flex items-center gap-2">
                  <span className="text-[#FF8A00] opacity-80">#{dailyProblem.id}</span>
                  <span className="truncate">{dailyProblem.title}</span>
               </div>
            ) : 'Loading...'}
          </div>
        </div>
      </section>

      {/* FRIENDS ACTIVITY */}
      {friendSuggestions && friendSuggestions.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold text-[var(--muted-foreground)] tracking-wider mb-2 uppercase">Friends Activity</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
             {friendSuggestions.slice(0, 3).map((item, idx) => {
               const friendUsername = item.friendUsername || item.solvedByFriends?.[0]?.username;
               if (!friendUsername) return null;
               
               const firstLetter = friendUsername.charAt(0).toUpperCase();
               const colors = ['bg-[#FF6B6B]', 'bg-[#4DABF7]', 'bg-[#FFD43B]'];
               const colorClass = colors[idx % colors.length];
               const timestamp = item.timestamp || item.solvedByFriends?.[0]?.timestamp;

               return (
                 <div key={idx} className="p-2.5 flex items-center gap-3 hover:bg-[var(--muted)] transition-colors cursor-pointer" onClick={() => onOpenProblem(item.slug, item)}>
                   <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[var(--background)] font-bold text-xs ${colorClass}`}>
                     {firstLetter}
                   </div>
                   <div className="flex-1 text-xs text-[var(--muted-foreground)]">
                     <span className="text-[var(--foreground)] font-medium">{friendUsername}</span> solved <span className="text-[var(--foreground)] font-bold">{item.title}</span>
                   </div>
                   <div className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                     {getRelativeTime(timestamp)}
                   </div>
                 </div>
               )
             })}
          </div>
        </section>
      )}


    </div>
  );
}
