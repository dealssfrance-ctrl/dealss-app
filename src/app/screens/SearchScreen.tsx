import { useState, useEffect, useCallback, useRef } from 'react';
import { OfferCard } from '../components/OfferCard';
import { Layout } from '../components/Layout';
import { HyvisHeader } from '../components/HyvisHeader';
import { SearchResultsSkeleton, LoadMoreSkeleton } from '../components/Skeleton';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { offersService, Offer } from '../services/offersService';

const CATEGORIES = ['All', 'Fashion', 'Points', 'Food', 'Sports', 'Electronics', 'Beauty', 'Vols', 'Other'];

const CATEGORY_EMOJIS: Record<string, string> = {
  'All': '✨',
  'Fashion': '👗',
  'Points': '🌟',
  'Food': '🍔',
  'Sports': '🏀',
  'Electronics': '📱',
  'Beauty': '💄',
  'Vols': '✈️',
  'Other': '📦',
  'High-tech': '💻',
  'Maison': '🏠',
  'Mode': '👔',
  'Beaute': '💄',
  'Voyage': '✈️',
  'Sport': '🏃',
};

export function SearchScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search when debounced query or category changes
  const searchOffers = useCallback(async (resetPage = true) => {
    if (!debouncedQuery.trim() && activeCategory === 'All') {
      setOffers([]);
      setHasSearched(false);
      setInitialLoad(false);
      return;
    }

    try {
      if (resetPage) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = resetPage ? 1 : page;
      const response = await offersService.searchOffers({
        query: debouncedQuery.trim() || undefined,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        page: currentPage,
        limit: 10
      });

      if (resetPage) {
        setOffers(response.data);
      } else {
        setOffers(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.pagination.hasNext);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoad(false);
    }
  }, [debouncedQuery, activeCategory, page]);

  useEffect(() => {
    searchOffers(true);
  }, [debouncedQuery, activeCategory]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      searchOffers(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setOffers([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-6">
      <HyvisHeader />
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 md:top-0 z-10">
        <div className="px-5 md:px-8 lg:px-10 py-4">
          <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Rechercher</h1>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher des offres, magasins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-full pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774]"
              autoFocus
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-[#1FA774] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_EMOJIS[category] ? `${CATEGORY_EMOJIS[category]} ` : ''}{category}
              </button>
            ))}
          </div>
          </div>{/* End max-w-4xl */}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-5">
        {initialLoad ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400">Commencez à taper pour rechercher</p>
          </div>
        ) : loading ? (
          <SearchResultsSkeleton />
        ) : !hasSearched ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400">Entrez un terme de recherche ou sélectionnez une catégorie</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium mb-2">Aucun résultat trouvé</p>
            <p className="text-gray-400 text-sm">
              Essayez avec d'autres mots-clés ou catégories
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {offers.length} résultat{offers.length > 1 ? 's' : ''} trouvé{offers.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:space-y-0">
              {offers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <OfferCard offer={offer} />
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? (
                    <LoadMoreSkeleton />
                  ) : (
                    'Voir plus de résultats'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
    </Layout>
  );
}
