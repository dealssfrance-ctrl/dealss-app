import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { MultiImageUploader } from '../components/MultiImageUploader';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { offersService } from '../services/offersService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const CATEGORIES = ['Fashion', 'Food', 'Sports', 'Electronics', 'Beauty', 'Vols', 'Other'];

const CATEGORY_EMOJIS: Record<string, string> = {
  'Fashion': '👗',
  'Food': '🍔',
  'Sports': '🏀',
  'Electronics': '📱',
  'Beauty': '💄',
  'Vols': '✈️',
  'Other': '📦',
};

export function AddOfferScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    storeName: '',
    discount: '',
    description: '',
    category: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      toast.error('Vous devez être connecté pour publier une offre');
      navigate('/signin');
    }
  }, [user, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Le nom du magasin est requis';
    }

    if (!formData.discount.trim()) {
      newErrors.discount = 'La réduction est requise';
    } else if (!formData.discount.includes('%') && !formData.discount.toLowerCase().includes('buy')) {
      newErrors.discount = 'Format invalide (ex: -30%, Buy 1 Get 1)';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }

    if (!formData.category) {
      newErrors.category = 'La catégorie est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté pour publier une offre');
      navigate('/signin');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      
      // Upload images to Supabase Storage if files were selected
      let imageUrl = '';
      if (selectedFiles.length > 0) {
        const imageUrls = await offersService.uploadMultipleImages(selectedFiles, (percent) => {
          setUploadProgress(percent);
        });
        // Store as JSON array for multi-image support
        imageUrl = JSON.stringify(imageUrls);
      }
      
      await offersService.createOffer({
        storeName: formData.storeName.trim(),
        discount: formData.discount.trim(),
        description: formData.description.trim(),
        category: formData.category,
        imageUrl
      }, user.id);

      toast.success('Offre publiée avec succès ! 🎉');
      navigate('/');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Erreur lors de la publication de l\'offre');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 md:top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Nouvelle offre</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-5 md:px-8 py-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload - Multi-image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos <span className="text-gray-400">(optionnel)</span>
            </label>
            <MultiImageUploader
              onImagesSelected={setSelectedFiles}
              isLoading={loading}
              uploadProgress={uploadProgress}
            />
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du magasin <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder="ex: Zara, Nike, Starbucks"
              className={`w-full bg-white border rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent ${
                errors.storeName ? 'border-red-300' : 'border-gray-200'
              }`}
              disabled={loading}
            />
            {errors.storeName && (
              <p className="mt-1 text-sm text-red-500">{errors.storeName}</p>
            )}
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réduction <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.discount}
              onChange={(e) => handleChange('discount', e.target.value)}
              placeholder="ex: -30%, Buy 1 Get 1"
              className={`w-full bg-white border rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent ${
                errors.discount ? 'border-red-300' : 'border-gray-200'
              }`}
              disabled={loading}
            />
            {errors.discount && (
              <p className="mt-1 text-sm text-red-500">{errors.discount}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleChange('category', category)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.category === category
                      ? 'bg-[#1FA774] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1FA774]'
                  } disabled:opacity-50`}
                >
                  {CATEGORY_EMOJIS[category] ? `${CATEGORY_EMOJIS[category]} ` : ''}{category}
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Décrivez les détails de l'offre..."
              rows={4}
              className={`w-full bg-white border rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent resize-none ${
                errors.description ? 'border-red-300' : 'border-gray-200'
              }`}
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 text-right">
              {formData.description.length}/500 caractères
            </p>
          </div>

          {/* Submit Button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1FA774] text-white py-4 rounded-2xl font-semibold text-lg hover:bg-[#16A15C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Publication...
                </>
              ) : (
                'Publier l\'offre'
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
    </Layout>
  );
}
