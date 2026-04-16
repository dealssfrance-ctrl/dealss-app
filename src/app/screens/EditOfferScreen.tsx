import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { offersService, Offer } from '../services/offersService';
import { toast } from 'sonner';
import { EditOfferFormSkeleton } from '../components/Skeleton';
import { FORM_CATEGORIES, getCategoryLabel } from '../utils/categories';

const CATEGORIES = FORM_CATEGORIES;

export function EditOfferScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    storeName: '',
    discount: '',
    description: '',
    category: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
          setImagePreview(response.data.imageUrl);
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

      // Upload new image to Supabase Storage if a new file was selected
      let finalImageUrl = imagePreview || undefined;
      if (imageFile) {
        finalImageUrl = await offersService.uploadImage(imageFile);
      }

      await offersService.updateOffer(id, {
        storeName: formData.storeName.trim(),
        discount: formData.discount.trim(),
        description: formData.description.trim(),
        category: formData.category,
        imageUrl: finalImageUrl
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
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo
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
                  className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
                >
                  <X size={20} />
                </button>
                <label className="absolute bottom-3 right-3 bg-white text-gray-700 px-4 py-2 rounded-full text-sm font-medium shadow-lg cursor-pointer flex items-center gap-2">
                  <Camera size={16} />
                  Changer
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="w-full h-48 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
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
