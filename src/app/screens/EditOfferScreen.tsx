import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ArrowLeft, Camera, X, Loader2, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { offersService, Offer } from '../services/offersService';
import { toast } from 'sonner';
import { EditOfferFormSkeleton } from '../components/Skeleton';
import { FORM_CATEGORIES, getCategoryLabel } from '../utils/categories';

const CATEGORIES = FORM_CATEGORIES;
const MAX_IMAGES = 5;

export function EditOfferScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    storeName: '',
    discount: '',
    description: '',
    category: ''
  });
  // existingUrls = URLs already saved in DB; newFiles/newPreviews = newly added
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;
      try {
        const response = await offersService.getOfferById(id);
        if (response.success) {
          setOffer(response.data);
          setFormData({
            storeName: response.data.storeName,
            discount: response.data.discount,
            description: response.data.description,
            category: response.data.category
          });
          setExistingUrls(response.data.images.length > 0 ? response.data.images : [response.data.imageUrl].filter(Boolean));
        }
      } catch (error) {
        console.error('Error fetching offer:', error);
        toast.error('Erreur lors du chargement de l\'offre');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);

      // Upload new images
      let newUploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        newUploadedUrls = await offersService.uploadImages(newFiles);
      }

      const allUrls = [...existingUrls, ...newUploadedUrls];
      const imageUrl = allUrls.length <= 1 ? (allUrls[0] || '') : JSON.stringify(allUrls);

      await offersService.updateOffer(id, {
        storeName: formData.storeName.trim(),
        discount: formData.discount.trim(),
        description: formData.description.trim(),
        category: formData.category,
        imageUrl
      });
      toast.success('Offre mise à jour avec succès ! ✅');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalCount = existingUrls.length + newFiles.length;
    const remaining = MAX_IMAGES - totalCount;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error('Chaque image ne doit pas dépasser 5 Mo');
      return;
    }

    setNewFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExisting = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNew = (index: number) => {
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return <EditOfferFormSkeleton />;
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Offre introuvable</p>
        <button onClick={() => navigate('/profile')} className="text-[#1FA774] font-medium">
          Retour au profil
        </button>
      </div>
    );
  }

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Modifier l'offre</h1>
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
          {/* Photo Upload — Multi-image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos <span className="text-gray-400">(max {MAX_IMAGES})</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <AnimatePresence>
                {existingUrls.map((url, idx) => (
                  <motion.div
                    key={`existing-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`relative aspect-square rounded-2xl overflow-hidden bg-gray-100 ${idx === 0 && newPreviews.length === 0 ? 'ring-2 ring-[#1FA774] ring-offset-2' : ''}`}
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && newPreviews.length === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-[#1FA774] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Principal</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExisting(idx)}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                {newPreviews.map((preview, idx) => (
                  <motion.div
                    key={`new-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100"
                  >
                    <img src={preview} alt={`Nouvelle photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Nouveau</span>
                    <button
                      type="button"
                      onClick={() => removeNew(idx)}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {(existingUrls.length + newFiles.length) < MAX_IMAGES && (
                <label className="aspect-square flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
                  <Plus size={24} className="text-gray-400 mb-1" />
                  <span className="text-[11px] text-gray-500 font-medium">Ajouter</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du magasin
            </label>
            <input
              type="text"
              value={formData.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder="ex: Zara, Nike, Starbucks"
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
              required
              disabled={saving}
            />
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réduction
            </label>
            <input
              type="text"
              value={formData.discount}
              onChange={(e) => handleChange('discount', e.target.value)}
              placeholder="ex: -30%, Buy 1 Get 1"
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
              required
              disabled={saving}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleChange('category', cat.key)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.category === cat.key
                      ? 'bg-[#1FA774] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1FA774]'
                  } disabled:opacity-50`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Décrivez les détails de l'offre..."
              rows={4}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent resize-none"
              required
              disabled={saving}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Sauvegarde en cours...
                </span>
              ) : (
                'Sauvegarder les modifications'
              )}
            </Button>
          </div>
        </form>
      </motion.div>

    </div>
    </Layout>
  );
}
