import { motion } from 'motion/react';
import { useLocation } from 'react-router';

interface PersistentNavbarProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  rightContent?: React.ReactNode;
}

export function PersistentNavbar({
  title = 'Dealss',
  showBackButton = false,
  onBackClick,
  rightContent,
}: PersistentNavbarProps) {
  const location = useLocation();
  
  // Determine page title based on route
  const getTitle = (): string => {
    if (title && title !== 'Dealss') return title;
    
    const path = location.pathname;
    if (path === '/') return 'Accueil';
    if (path === '/messages') return 'Messages';
    if (path === '/profile') return 'Mon profil';
    if (path.startsWith('/chat/')) return 'Chat';
    if (path.startsWith('/offer/')) return 'Détail';
    if (path === '/add-offer') return 'Nouvelle offre';
    return 'Dealss';
  };

  return (
    <motion.div
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className="h-16 bg-white border-b border-gray-100 sticky top-0 z-30 md:hidden"
    >
      <div className="h-full px-5 flex items-center justify-between">
        {/* Left: Back button or logo */}
        <div className="flex-1">
          {showBackButton ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBackClick}
              className="p-1 text-gray-900"
            >
              ← Retour
            </motion.button>
          ) : (
            <h1 className="text-lg font-bold text-[#1FA774]">Dealss</h1>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {getTitle()}
          </h2>
        </div>

        {/* Right: Custom content or empty space */}
        <div className="flex-1 flex justify-end">
          {rightContent || <div className="w-6" />}
        </div>
      </div>
    </motion.div>
  );
}
