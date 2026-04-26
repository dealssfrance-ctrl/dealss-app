import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ArrowLeft, Camera, X, Loader2, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { offersService, Offer } from '../services/offersService';
import { toast } from 'sonner';
import { EditOfferFormSkeleton } from '../components/Skeleton';

const CATEGORIES = ['Fashion', 'Food', 'Sports', 'Electronics', 'Beauty', 'Vols', 'Other'];

// Parse the stored imageUrl which may be a JSON-stringified array, a CSV, or a single URL.
function parseImageUrls(value?: string): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch { /* fall through */ }
  }
  if (trimmed.includes(',') && /https?:\/\//i.test(trimmed)) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

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
  // Existing image URLs already stored on the offer (may be removed by the user).
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  // Newly picked files to upload on save.
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

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
          setExistingUrls(parseImageUrls(response.data.imageUrl));
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

      // Upload any newly added files, then concatenate with kept existing URLs.
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await offersService.uploadMultipleImages(newFiles);
      }
      const finalUrls = [...existingUrls, ...uploadedUrls];
      const finalImageUrl =
        finalUrls.length === 0 ? '' :
        finalUrls.length === 1 ? finalUrls[0] :
        JSON.stringify(finalUrls);

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} dépasse 5 Mo`); continue; }
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} n'est pas une image`); continue; }
      valid.push(f);
    }
    if (valid.length === 0) { e.target.value = ''; return; }
    setNewFiles((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeExistingImage = (idx: number) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewImage = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
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
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 md:top-0 z-10">
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
          {/* Photos (multi) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>
            {existingUrls.length === 0 && newPreviews.length === 0 ? (
              <label className="w-full h-48 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
                <Camera size={40} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Ajouter des photos</span>
                <span className="text-xs text-gray-400 mt-1">Sélectionnez un ou plusieurs fichiers</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={saving}
                />
              </label>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {existingUrls.map((url, idx) => (
                  <div key={`ex-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      disabled={saving}
                      aria-label="Supprimer la photo"
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {newPreviews.map((src, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 ring-1 ring-[#1FA774]/40">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      disabled={saving}
                      aria-label="Supprimer la photo"
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
                  <Plus size={24} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 mt-1">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
              </div>
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
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleChange('category', category)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.category === category
                      ? 'bg-[#1FA774] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1FA774]'
                  } disabled:opacity-50`}
                >
                  {category}
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
