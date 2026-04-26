import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OfferGalleryProps {
  imageUrl: string; // Can be single URL, JSON array, or comma-separated URLs
  storeName: string;
  onImageError?: () => void;
}

function parseImageUrls(imageUrl: string): string[] {
  if (!imageUrl || typeof imageUrl !== 'string') return [];

  const toUrls = (value: string): string[] => {
    const trimmed = value.trim();

    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => {
            if (typeof item !== 'string') return [];
            const itemTrimmed = item.trim();
            if (!itemTrimmed) return [];
            // Some records may contain a JSON array string inside another array.
            return itemTrimmed.startsWith('[') ? toUrls(itemTrimmed) : [itemTrimmed];
          });
        }
      } catch {
        // Continue to fallback parsing
      }
    }

    const commaSeparated = trimmed
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    return commaSeparated.length > 0 ? commaSeparated : [trimmed];
  };

  const parsed = toUrls(imageUrl).filter((url) => /^(https?:\/\/|data:image\/)/i.test(url));
  return parsed;
}

export function OfferGallery({ imageUrl, storeName, onImageError }: OfferGalleryProps) {
  const images = useMemo(() => parseImageUrls(imageUrl), [imageUrl]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  const validImages = images.filter((_, idx) => !imageErrors.has(idx));
  const safeIndex = Math.min(currentIndex, Math.max(validImages.length - 1, 0));
  const currentImage = validImages[safeIndex] || images[0];
  
  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
        <span className="text-sm text-gray-400">No image available</span>
      </div>
    );
  }

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-sm font-medium text-slate-600">Image indisponible</p>
          <p className="text-xs text-slate-500 mt-1">Le visuel de cette offre ne peut pas etre charge</p>
        </div>
      </div>
    );
  }
  
  const handleImageError = (idx: number) => {
    const newErrors = new Set(imageErrors);
    newErrors.add(idx);
    setImageErrors(newErrors);
    if (newErrors.size === images.length) {
      onImageError?.();
    }
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };
  
  const selectImage = (idx: number) => {
    setCurrentIndex(idx);
  };
  
  return (
    <div className="flex gap-3 items-start">
      {/* Thumbnails - Left side (vertical on desktop, hidden on mobile) */}
      {validImages.length > 1 && (
        <div className="hidden md:flex flex-col gap-2">
          {validImages.map((img, idx) => (
            <motion.button
              key={idx}
              onClick={() => selectImage(idx)}
              whileTap={{ scale: 0.95 }}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                idx === currentIndex
                  ? 'border-[#1FA774]'
                  : 'border-gray-200 hover:border-[#1FA774]/50'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={() => handleImageError(idx)}
              />
            </motion.button>
          ))}
        </div>
      )}
      
      {/* Main image area */}
      <div className="flex-1 relative rounded-2xl overflow-hidden group">
        <motion.img
          key={safeIndex}
          src={currentImage}
          alt={storeName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-auto max-h-[80vh] object-contain block"
          onError={() => handleImageError(safeIndex)}
        />
        
        {/* Navigation arrows (visible on desktop, mobile carousel dots) */}
        {validImages.length > 1 && (
          <>
            {/* Desktop arrows */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </motion.button>
            
            {/* Mobile dot indicators */}
            <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {validImages.map((_, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => selectImage(idx)}
                  whileTap={{ scale: 1.2 }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
            
            {/* Image counter */}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
              {safeIndex + 1} / {validImages.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
