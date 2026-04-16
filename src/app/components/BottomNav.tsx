import { Home, Search, MessageCircle, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';
import { playMessageSound } from '../utils/sounds';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const count = await chatService.getTotalUnreadCount(user.id);
      if (count > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        // Don't play on initial load
        if (prevUnreadRef.current > 0) {
          playMessageSound();
        }
      }
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const isChatPage = location.pathname === '/messages' || location.pathname.startsWith('/chat/');
    const interval = setInterval(fetchUnread, isChatPage ? 3000 : 30000);
    return () => clearInterval(interval);
  }, [fetchUnread, location.pathname]);

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: Search, label: 'Rechercher', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', badge: unreadCount },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  // Hide on individual chat screens
  if (location.pathname.startsWith('/chat/')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom md:hidden z-30">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-1 py-2 px-3 min-w-[60px]"
            >
              <div className="relative">
                <Icon
                  size={24}
                  className={isActive ? 'text-[#1FA774]' : 'text-gray-400'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-xs ${isActive ? 'text-[#1FA774] font-semibold' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
