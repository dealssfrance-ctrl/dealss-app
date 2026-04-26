import { Home, Search, MessageCircle, User, Plus, Sliders } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { useState } from 'react';

export function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { filters, setFilters, resetFilters } = useFilters();
  const [expandFilters, setExpandFilters] = useState(false);

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: Search, label: 'Rechercher', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-gray-200 sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="text-2xl font-bold text-gray-900 hover:text-[#1FA774] transition-colors">
          Hyvis
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
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Filters Section */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-3 max-h-64 overflow-y-auto">
        <button
          onClick={() => setExpandFilters(!expandFilters)}
          className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Sliders size={18} />
          <span>Filtres</span>
          {expandFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              className="ml-auto text-xs text-[#1FA774] hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </button>

        {expandFilters && (
          <div className="space-y-4 px-4">
            {/* Discount Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Réduction: {filters.discountMin}% - {filters.discountMax}%
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.discountMin}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      discountMin: Math.min(parseInt(e.target.value), filters.discountMax),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.discountMax}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      discountMax: Math.max(parseInt(e.target.value), filters.discountMin),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Sort by Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Tri par date</label>
              <select
                value={filters.sortByDate}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortByDate: e.target.value as 'newest' | 'oldest' | 'none',
                  })
                }
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1FA774]"
              >
                <option value="none">Aucun</option>
                <option value="newest">Plus récent</option>
                <option value="oldest">Plus ancien</option>
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Note minimale: {filters.minRating}⭐
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minRating: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Min Comments */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Minimum de commentaires: {filters.minComments}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={filters.minComments}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minComments: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

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
