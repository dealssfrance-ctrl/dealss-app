import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react';
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      
      // Upload image to Supabase Storage if a file was selected
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await offersService.uploadImage(imageFile, (percent) => {
          setUploadProgress(percent);
        });
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5 Mo');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
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
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo <span className="text-gray-400">(optionnel)</span>
            </label>
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <label className="w-full h-48 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
                <Camera size={40} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Ajouter une photo</span>
                <span className="text-xs text-gray-400 mt-1">Appuyez pour télécharger</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
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

          {/* Upload Progress */}
          {loading && imageFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">
                  {uploadProgress < 100 ? 'Téléchargement de l\'image...' : 'Création de l\'offre...'}
                </span>
                <span className="text-[#1FA774] font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#1FA774] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  {imageFile && uploadProgress < 100 ? `Téléchargement ${uploadProgress}%` : 'Publication en cours...'}
                </span>
              ) : (
                'Publier l\'offre'
              )}
            </Button>
          </div>
        </form>
      </motion.div>

    </div>
    </Layout>
  );
}
