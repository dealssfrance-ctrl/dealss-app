import { Home, Search, MessageCircle, User, Plus } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';
import { playMessageSound } from '../utils/sounds';
import { FORM_CATEGORIES } from '../utils/categories';

export function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const count = await chatService.getTotalUnreadCount(user.id);
      if (count > prevUnreadRef.current && prevUnreadRef.current > 0) {
        playMessageSound();
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

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-gray-200 sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="text-2xl font-bold text-gray-900 hover:text-[#1FA774] transition-colors">
          Dealss
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                isActive
                  ? 'bg-[#1FA774]/10 text-[#1FA774] font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {(item as any).badge > 99 ? '99+' : (item as any).badge}
                  </span>
                )}
              </div>
              <span className="text-sm flex-1">{item.label}</span>
              {'badge' in item && (item as any).badge > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                  {(item as any).badge > 99 ? '99+' : (item as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Category Filters — visible only on home */}
      {(location.pathname === '/' || location.pathname === '') && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <p className="px-4 pt-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Catégories</p>
          <div className="space-y-0.5 max-h-[220px] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => navigate('/')}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-left transition-colors ${
                !searchParams.get('category') ? 'bg-[#1FA774]/10 text-[#1FA774] font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🏷️ Toutes
            </button>
            {FORM_CATEGORIES.map((cat) => {
              const isActive = searchParams.get('category') === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => navigate(`/?category=${encodeURIComponent(cat.key)}`)}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-left transition-colors ${
                    isActive ? 'bg-[#1FA774]/10 text-[#1FA774] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Offer CTA */}
      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={() => navigate('/add-offer')}
          className="w-full flex items-center justify-center gap-2 bg-[#1FA774] text-white py-3 rounded-full font-semibold hover:bg-[#16865c] transition-colors"
        >
          <Plus size={20} />
          <span>Nouvelle offre</span>
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#1FA774] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
