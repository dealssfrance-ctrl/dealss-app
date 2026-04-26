import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Layout } from '../components/Layout';
import { HyvisHeader } from '../components/HyvisHeader';
import { useNavigate } from 'react-router';
import { Plus, Zap, Sparkles, LogOut, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { toast } from 'sonner';
import { offersService, Offer } from '../services/offersService';
import { OfferCardGridSkeleton, CategoryTabsSkeleton, LoadMoreSkeleton } from '../components/Skeleton';
import { StarRating } from '../components/StarRating';
import { getCategoryImage } from '../constants/categoryImages';

/**
 * Returns the first usable image URL from an offer's `imageUrl` field, which
 * may be a single URL, a comma-separated list, or a JSON-encoded array.
 * Falls back to the per-category placeholder if nothing valid is found.
 *
 * Keeping the home grid thumbnail in sync with the gallery's first image
 * (used on the offer-detail page) prevents the surprise of "I clicked image A
 * but landed on image B".
 */
function getOfferThumbnail(offer: Offer): string {
  const raw = offer.imageUrl;
  if (typeof raw === 'string' && raw.trim()) {
    let candidate: string | undefined;
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const first = parsed.find((v) => typeof v === 'string' && v.trim());
          if (typeof first === 'string') candidate = first.trim();
        }
      } catch {
        // ignore — fall through
      }
    }
    if (!candidate) {
      candidate = trimmed.split(',')[0]?.trim();
    }
    if (candidate && /^(https?:\/\/|data:image\/)/i.test(candidate)) {
      return candidate;
    }
  }
  return getCategoryImage(offer.category);
}

const DEFAULT_CATEGORIES = ['All', 'Fashion', 'Food', 'Sports', 'Electronics', 'Beauty', 'Vols', 'Other'];

const CATEGORY_EMOJIS: Record<string, string> = {
  'All':    '✨',
  'Fashion':'👗',
  'Food':   '🍔',
  'Sports': '🏀',
  'Electronics': '📱',
  'Beauty': '💄',
  'Vols':   '✈️',
  'Other':  '📦',
  'High-tech': '💻',
  'Maison': '🏠',
  'Mode': '👔',
  'Beaute': '💄',
  'Voyage': '✈️',
  'Sport': '🏃',
};

export function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { filters } = useFilters();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedOfferImageIds, setFailedOfferImageIds] = useState<Set<string>>(new Set());

  // Generation counter: any in-flight fetch whose gen !== current is stale and discarded.
  const fetchGenRef = useRef(0);

  // Apply filters to offers
  useEffect(() => {
    let result = offers;

    // Filter by discount
    result = result.filter(offer => {
      const discount = parseInt(offer.discount.replace(/[^0-9]/g, '')) || 0;
      return discount >= filters.discountMin && discount <= filters.discountMax;
    });

    // Filter by rating
    if (filters.minRating > 0) {
      result = result.filter(offer => (offer.averageRating || 0) >= filters.minRating);
    }

    // Filter by comments
    if (filters.minComments > 0) {
      result = result.filter(offer => (offer.reviewCount || 0) >= filters.minComments);
    }

    // Sort by date
    if (filters.sortByDate === 'newest') {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (filters.sortByDate === 'oldest') {
      result = [...result].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    setFilteredOffers(result);
  }, [offers, filters]);

  const fetchOffers = useCallback(async (reset: boolean, pageNum: number) => {
    const gen = ++fetchGenRef.current;

    if (reset) {
      // Clear offers synchronously so no stale items flash under the new category.
      setOffers([]);
      setLoading(true);
    }

    try {
      const result = await offersService.searchOffers({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        page: pageNum,
        limit: 10
      });

      // Discard result if a newer fetch has already started (race-condition guard).
      if (gen !== fetchGenRef.current) return;

      if (result.success) {
        if (reset) {
          setOffers(result.data);
        } else {
          // Deduplicate by ID when appending pages.
          setOffers(prev => {
            const map = new Map([...prev, ...result.data].map(o => [o.id, o]));
            return Array.from(map.values());
          });
        }
        setHasMore(result.pagination.hasNext);
      }
    } catch (error) {
      if (gen !== fetchGenRef.current) return;
      console.error('Error fetching offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      if (gen === fetchGenRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  // fetchOffers only changes when selectedCategory changes; page is now an explicit parameter.
  }, [selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await offersService.getCategories();
      if (result.success) {
        // Deduplicate and ensure 'All' is first
        const seen = new Set<string>();
        const deduped: string[] = [];
        for (const c of result.data) {
          const key = c.toLowerCase();
          if (!seen.has(key)) { seen.add(key); deduped.push(c); }
        }
        setCategories(deduped);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset page and fetch fresh results whenever the selected category changes.
  // `fetchOffers` is stable while category stays the same, so no extra fetches occur.
  useEffect(() => {
    setPage(1);
    fetchOffers(true, 1);
  }, [selectedCategory, fetchOffers]);

  // When the tab/app resumes after being backgrounded, the previous query may
  // have been frozen → skeleton stays forever. Re-trigger a fresh fetch.
  useEffect(() => {
    const onResume = () => {
      setPage(1);
      fetchOffers(true, 1);
    };
    window.addEventListener('app:resume', onResume);
    return () => window.removeEventListener('app:resume', onResume);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOffers(false, nextPage);
    }
  }, [loadingMore, hasMore, loading, page, fetchOffers]);

  // Auto-load more when the sentinel near the bottom of the list enters the viewport.
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: '600px 0px' }, // start loading well before the sentinel is visible
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchOffers(true, 1);
  };

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-6">
      {/* Mobile fixed header via shared component */}
      <HyvisHeader
        right={
          <>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {user ? (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={20} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/signin')}
                className="text-sm font-semibold text-white bg-[#1FA774] px-4 py-2 rounded-full hover:bg-[#16865c] transition-colors"
              >
                Connexion
              </button>
            )}
          </>
        }
      />

      {/* Desktop header */}
      <div className="bg-white border-b border-gray-200 hidden md:block sticky top-0 z-10">
        <div className="px-8 lg:px-10 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Accueil</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
              {user && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                  <User size={16} />
                  <span className="font-medium">{user.name?.split(' ')[0] || 'User'}</span>
                </div>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut size={20} />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/signin')}
                  className="text-sm font-semibold text-white bg-[#1FA774] px-4 py-2 rounded-full hover:bg-[#16865c] transition-colors"
                >
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="px-5 md:px-8 lg:px-10 pt-5 pb-4">
          <button
            onClick={() => navigate('/search')}
            className="w-full md:max-w-xl bg-white rounded-full px-5 py-3.5 text-left text-gray-400 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            Rechercher des offres...
          </button>
        </div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 md:mx-8 lg:mx-10 mb-6 bg-gradient-to-br from-[#1FA774] to-[#16865c] rounded-3xl p-6 md:p-8 lg:p-10 text-white overflow-hidden relative"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} fill="white" />
              <span className="text-sm font-semibold uppercase tracking-wide">Flash Deals</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Jusqu'à 40% de réduction</h2>
            <p className="text-white/90 text-sm">Réductions exclusives employés</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        </motion.div>

        {/* Category Tabs */}
        <div className="px-5 md:px-8 lg:px-10 mb-6 overflow-x-auto scrollbar-hide">
          {loading && categories.length === 0 ? (
            <CategoryTabsSkeleton />
          ) : (
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-[#1FA774] text-white shadow-sm'
                      : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                  }`}
                >
                  {CATEGORY_EMOJIS[category] ? `${CATEGORY_EMOJIS[category]} ` : ''}{category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* All Offers Section */}
        <div className="px-5 md:px-8 lg:px-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-gray-600" />
              <h3 className="font-bold text-lg text-gray-900">Toutes les offres</h3>
            </div>
            {!loading && (
              <span className="text-sm text-gray-500">
                {filteredOffers.length} {filteredOffers.length === 1 ? 'offre' : 'offres'}
              </span>
            )}
          </div>

          {/* Grid Layout */}
          {loading ? (
            <OfferCardGridSkeleton count={6} />
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Aucune offre correspondant à vos critères</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-[#1FA774] font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOffers.map((offer, index) => (
                  <motion.button
                    key={offer.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/offer/${offer.id}`)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm text-left hover:shadow-md transition-shadow"
                  >
                    <div className="relative">
                      <img
                        src={getOfferThumbnail(offer)}
                        alt={offer.storeName}
                        className="w-full h-36 md:h-44 lg:h-48 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getCategoryImage(offer.category);
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-[#1FA774] text-white text-sm font-bold px-2.5 py-1 rounded-full shadow-md">
                        {offer.discount}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-gray-900 mb-1 truncate">{offer.storeName}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{offer.description}</p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRating
                          rating={offer.sellerAverageRating ?? 0}
                          reviewCount={offer.sellerReviewCount ?? 0}
                          size={12}
                        />
                        <span className="text-[11px] text-gray-500">
                          {(offer.sellerAverageRating ?? 0) > 0
                            ? `${(offer.sellerAverageRating ?? 0).toFixed(1)} · ${offer.sellerReviewCount ?? 0} avis`
                            : 'Aucun avis vendeur'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full shrink-0">
                          {offer.category}
                        </span>
                        {offer.userName && (
                          <span className="text-[11px] text-gray-400 truncate ml-2">
                            par {offer.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Auto load-more sentinel + manual fallback button */}
              {hasMore && (
                <>
                  <div ref={loadMoreSentinelRef} className="h-1 w-full" aria-hidden />
                  <div className="text-center pb-4 mt-6">
                    {loadingMore ? (
                      <LoadMoreSkeleton />
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-2.5 bg-white text-[#1FA774] font-medium rounded-full shadow-sm hover:shadow-md transition-all"
                      >
                        Charger plus
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/add-offer')}
        className="fixed bottom-20 right-5 bg-[#1FA774] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-20 hover:bg-[#18a689] transition-colors md:hidden"
      >
        <Plus size={28} strokeWidth={2.5} />
      </motion.button>

    </div>
    </Layout>
  );
}
