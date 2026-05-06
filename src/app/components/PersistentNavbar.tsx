import { motion } from 'motion/react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';

interface PersistentNavbarProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  rightContent?: React.ReactNode;
}

export function PersistentNavbar({
  title = 'Troqly',
  showBackButton = false,
  onBackClick,
  rightContent,
}: PersistentNavbarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  // Determine page title based on route
  const getTitle = (): string => {
    if (title && title !== 'Troqly') return title;

    const path = location.pathname;
    if (path === '/') return t('navbar.home', 'Accueil');
    if (path === '/messages') return t('navbar.messages', 'Messages');
    if (path === '/profile') return t('navbar.my_profile', 'Mon profil');
    if (path.startsWith('/chat/')) return t('navbar.chat', 'Chat');
    if (path.startsWith('/offer/')) return t('navbar.detail', 'Détail');
    if (path === '/add-offer') return t('navbar.new_offer', 'Nouvelle offre');
    return 'Troqly';
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
              ← {t('common.back', 'Retour')}
            </motion.button>
          ) : (
            <Logo className="h-7 w-auto" />
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
