import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface MultiImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  isLoading?: boolean;
  uploadProgress?: number;
}

interface ImagePreview {
  file: File;
  preview: string;
  id: string;
}

export function MultiImageUploader({
  onImagesSelected,
  isLoading = false,
  uploadProgress = 0,
}: MultiImageUploaderProps) {
  const [images, setImages] = useState<ImagePreview[]>([]);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Validate files
      let validFiles: File[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 5 Mo`);
          continue;
        }
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // Create previews
      const previews: ImagePreview[] = [];
      let loaded = 0;

      for (const file of validFiles) {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push({
            file,
            preview: reader.result as string,
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          });
          loaded++;
          if (loaded === validFiles.length) {
            setImages((prev) => [...prev, ...previews]);
            onImagesSelected([...images.map((img) => img.file), ...validFiles]);
            // Reset input so same file can be selected again
            e.target.value = '';
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [images, onImagesSelected]
  );

  const removeImage = (id: string) => {
    const newImages = images.filter((img) => img.id !== id);
    setImages(newImages);
    onImagesSelected(newImages.map((img) => img.file));
  };

  const clearAll = () => {
    setImages([]);
    onImagesSelected([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {images.length === 0 ? (
        <label className="w-full h-48 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
          <Camera size={40} className="text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-600">Ajouter des photos</span>
          <span className="text-xs text-gray-400 mt-1">Sélectionnez plusieurs fichiers</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      ) : (
        <div className="space-y-2">
          {/* Add More Button */}
          <label className="w-full h-24 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#1FA774] transition-colors">
            <ImagePlus size={24} className="text-gray-400 mb-1" />
            <span className="text-xs font-medium text-gray-600">Ajouter plus</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading}
            />
          </label>
        </div>
      )}

      {/* Image Previews Grid */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {images.length} image{images.length > 1 ? 's' : ''} sélectionnée{images.length > 1 ? 's' : ''}
            </p>
            {images.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Effacer tout
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence>
              {images.map((img, idx) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square group"
                >
                  <img
                    src={img.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Order number */}
                  <div className="absolute top-1 left-1 bg-[#1FA774] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  
                  {/* Remove button */}
                  {!isLoading && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute inset-0 bg-black/0 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    >
                      <X size={24} className="text-white" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Upload Progress */}
          {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Envoi en cours...</span>
                <span className="font-medium text-[#1FA774]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#1FA774]"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Upload Status */}
      {isLoading && uploadProgress === 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-[#1FA774] text-sm font-medium"
        >
          <Loader2 size={16} className="animate-spin" />
          Traitement en cours...
        </motion.div>
      )}
    </div>
  );
}
