import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout } from '../components/Layout';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, TrendingUp, Zap, Sparkles, LogOut, User, RefreshCw, Search, ChevronRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { offersService, Offer } from '../services/offersService';
import { OfferCardGridSkeleton, HotDealsSkeleton, CategoryTabsSkeleton, LoadMoreSkeleton } from '../components/Skeleton';
import { CATEGORY_KEYS, getCategoryLabel, getCategoryName, CATEGORIES, orderCategories } from '../utils/categories';

const DEFAULT_CATEGORIES = CATEGORY_KEYS;
const CACHE_KEY = 'dealss_home_cache';
const LIMIT = 10;

interface HomeCache {
  offers: Offer[];
  hotDeals: Offer[];
  categories: string[];
  selectedCategory: string;
  total: number;
  ts: number;
}

function readCache(category: string): HomeCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: HomeCache = JSON.parse(raw);
    if (cache.selectedCategory !== category) return null;
    // Cache valid for 10 minutes
    if (Date.now() - cache.ts > 10 * 60 * 1000) return null;
    return cache;
  } catch { return null; }
}

function writeCache(data: Omit<HomeCache, 'ts'>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [hotDeals, setHotDeals] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Total count of offers from server for the current category
  const [serverTotal, setServerTotal] = useState(0);
  // How many pages have actually been fetched from the server
  const [serverPage, setServerPage] = useState(0);

  // ─── Load cache on mount / category change ───
  useEffect(() => {
    const cached = readCache(selectedCategory);
    if (cached && cached.offers.length > 0) {
      setOffers(cached.offers);
      setHotDeals(cached.hotDeals);
      if (cached.categories.length > 0) setCategories(cached.categories);
      setServerTotal(cached.total);
      const cachedPages = Math.ceil(cached.offers.length / LIMIT);
      setServerPage(cachedPages);
      setPage(1);
      setHasMore(cached.offers.length < cached.total);
      setLoading(false);
      // Background refresh to keep data fresh
      fetchFromServer(true, true);
    } else {
      fetchFromServer(true, false);
    }
  }, [selectedCategory]);

  // ─── Fetch from server ───
  const fetchFromServer = useCallback(async (reset: boolean, silent: boolean) => {
    try {
      if (!silent) setLoading(true);
      if (reset) setPage(1);

      const currentPage = reset ? 1 : page;
      const result = await offersService.searchOffers({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        page: currentPage,
        limit: LIMIT,
      });

      if (result.success) {
        let newOffers: Offer[];
        if (reset) {
          newOffers = result.data;
          setOffers(newOffers);
          setServerPage(1);
        } else {
          newOffers = [...offers, ...result.data];
          // Deduplicate by id in case cache and server overlap
          const seen = new Set<string>();
          newOffers = newOffers.filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; });
          setOffers(newOffers);
          setServerPage(currentPage);
        }
        setServerTotal(result.pagination.total);
        setHasMore(result.pagination.hasNext);

        // Hot deals
        if (reset || currentPage === 1) {
          const allOffers = await offersService.getOffers(1, 50);
          const deals = allOffers.data.filter(offer => {
            const discountValue = parseInt(offer.discount.replace(/[^0-9]/g, ''));
            return discountValue >= 30;
          });
          const newHotDeals = deals.slice(0, 5);
          setHotDeals(newHotDeals);

          // Save to cache
          writeCache({
            offers: newOffers,
            hotDeals: newHotDeals,
            categories,
            selectedCategory,
            total: result.pagination.total,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      if (!silent) toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedCategory, page, offers, categories]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await offersService.getCategories();
      if (result.success) {
        const ordered = orderCategories(result.data.filter(c => c !== 'All'));
        setCategories(ordered);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Read category from URL on navigation (e.g. from sidebar)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== selectedCategory) {
      setSelectedCategory(cat);
    } else if (!cat && selectedCategory !== 'All') {
      setSelectedCategory('All');
    }
  }, [searchParams]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const cachedCount = offers.length;
    const neededFromCache = nextPage * LIMIT;

    // If we already have enough offers cached, just show more from the existing list
    if (cachedCount >= neededFromCache) {
      setPage(nextPage);
      setLoadingMore(false);
      return;
    }

    // Otherwise fetch the next server page
    setPage(prev => prev + 1);
  };

  // Fetch next page from server when page increments beyond cache
  useEffect(() => {
    if (page > 1 && page > serverPage) {
      fetchFromServer(false, false);
    }
  }, [page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache and fetch fresh data
    localStorage.removeItem(CACHE_KEY);
    await fetchFromServer(true, false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/welcome');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-[#f5f6f8] pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="px-5 md:px-8 lg:px-10 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="md:hidden">
              <p className="text-xs text-gray-400 font-medium">Bonjour{user ? ` ${user.name?.split(' ')[0]}` : ''} 👋</p>
              <h1 className="text-xl font-bold text-gray-900 -mt-0.5">Dealss</h1>
            </div>
            <h1 className="hidden md:block text-xl font-bold text-gray-900">Accueil</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 rounded-xl transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#1FA774] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-medium">{user.name?.split(' ')[0] || 'User'}</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:hidden"
                title="Se déconnecter"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="px-5 md:px-8 lg:px-10 pt-4 pb-3">
          <button
            onClick={() => navigate('/search')}
            className="w-full md:max-w-xl bg-white rounded-2xl px-4 py-3 text-left text-gray-400 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all border border-gray-100/80 flex items-center gap-3 group"
          >
            <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-[#1FA774]/10 transition-colors">
              <Search size={16} className="text-gray-400 group-hover:text-[#1FA774] transition-colors" />
            </div>
            <span className="text-sm">Rechercher des offres...</span>
          </button>
        </div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-5 md:mx-8 lg:mx-10 mb-5 bg-gradient-to-br from-[#1FA774] via-[#1a9868] to-[#0f7a4e] rounded-[20px] p-5 md:p-8 lg:p-10 text-white overflow-hidden relative"
        >
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-3">
              <Zap size={14} fill="white" />
              <span className="text-xs font-semibold uppercase tracking-wider">Flash Deals</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1.5 leading-tight">Jusqu'à 40% de réduction</h2>
            <p className="text-white/80 text-sm font-medium">Réductions exclusives employés</p>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-sm" />
          <div className="absolute right-12 -top-10 w-44 h-44 bg-white/[0.05] rounded-full" />
          <div className="absolute left-1/2 -bottom-3 w-24 h-24 bg-white/[0.07] rounded-full" />
        </motion.div>

        {/* Category Tabs */}
        <div className="px-5 md:px-8 lg:px-10 mb-5 overflow-x-auto scrollbar-hide">
          {loading && categories.length === 0 ? (
            <CategoryTabsSkeleton />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex gap-2 pb-1"
            >
              {categories.map((category) => {
                const isActive = selectedCategory === category;
                const catConfig = CATEGORIES.find(c => c.key === category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-[#1FA774] text-white shadow-[0_2px_8px_rgba(31,167,116,0.35)]'
                        : 'bg-white text-gray-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:text-gray-900'
                    }`}
                  >
                    {catConfig ? `${catConfig.emoji} ${catConfig.label}` : category}
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Hot Deals Section */}
        <div className="mb-6">
          <div className="px-5 md:px-8 lg:px-10 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <TrendingUp size={16} className="text-orange-500" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Bons Plans</h3>
              <span className="text-lg">🔥</span>
            </div>
            {hotDeals.length > 0 && (
              <button className="flex items-center gap-0.5 text-xs font-semibold text-[#1FA774] hover:text-[#16865c] transition-colors">
                Voir tout
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="px-5 md:px-8 lg:px-10 overflow-x-auto scrollbar-hide">
            {loading ? (
              <HotDealsSkeleton count={3} />
            ) : hotDeals.length > 0 ? (
              <div className="flex gap-3 pb-2">
                {hotDeals.map((offer, index) => (
                  <motion.button
                    key={offer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(`/offer/${offer.id}`)}
                    className="flex-shrink-0 w-[160px] md:w-52 lg:w-60 bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 text-left group"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={offer.imageUrl}
                        alt={offer.storeName}
                        className="w-full h-28 md:h-36 object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute top-2.5 right-2.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-lg">
                        {offer.discount}
                      </div>
                      <div className="absolute bottom-2 left-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-0.5">
                        <Clock size={10} className="text-white/80" />
                        <span className="text-[10px] text-white/90 font-medium">Nouveau</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-gray-900 text-sm mb-0.5 truncate">{offer.storeName}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{offer.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">Aucun hot deal disponible</p>
            )}
          </div>
        </div>

        {/* All Offers Section */}
        <div className="px-5 md:px-8 lg:px-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Sparkles size={16} className="text-purple-500" />
              </div>
              <h3 className="font-bold text-base text-gray-900">
                {selectedCategory === 'All' ? 'Toutes les offres' : getCategoryLabel(selectedCategory)}
              </h3>
            </div>
            {!loading && (
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {offers.length} {offers.length === 1 ? 'offre' : 'offres'}
              </span>
            )}
          </div>

          {/* Grid Layout */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <OfferCardGridSkeleton count={6} />
              </motion.div>
            ) : offers.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Search size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 mb-1 font-medium">Aucune offre dans cette catégorie</p>
                <p className="text-gray-300 text-sm mb-4">Essayez une autre catégorie</p>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="text-[#1FA774] font-semibold text-sm hover:underline"
                >
                  Voir toutes les offres
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-4">
                  {offers.map((offer, index) => (
                    <motion.button
                      key={offer.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.25), duration: 0.4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/offer/${offer.id}`)}
                      className="bg-white rounded-2xl overflow-hidden text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 group"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={offer.imageUrl}
                          alt={offer.storeName}
                          className="w-full h-32 md:h-40 lg:h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-2.5 right-2.5 bg-[#1FA774] text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-md">
                          {offer.discount}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{offer.storeName}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">{offer.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-lg">
                            {getCategoryName(offer.category)}
                          </span>
                          {offer.userName && (
                            <span className="text-[10px] text-gray-300 font-medium truncate max-w-[70px]">
                              {offer.userName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pb-6 pt-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-white text-[#1FA774] font-semibold text-sm rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(31,167,116,0.15)] transition-all disabled:opacity-50 border border-[#1FA774]/10"
                    >
                      {loadingMore ? (
                        <LoadMoreSkeleton />
                      ) : (
                        'Charger plus d\'offres'
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Add Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => navigate('/add-offer')}
        className="fixed bottom-28 right-5 bg-[#1FA774] text-white w-14 h-14 rounded-2xl shadow-[0_4px_16px_rgba(31,167,116,0.4)] flex items-center justify-center z-20 hover:bg-[#18a689] transition-colors md:hidden"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

    </div>
    </Layout>
  );
}
