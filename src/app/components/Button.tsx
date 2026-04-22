import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
}

export function Button({ children, variant = 'primary', onClick, type = 'button', className = '', disabled = false }: ButtonProps) {
  const baseStyles = 'w-full py-4 rounded-full font-semibold text-base transition-all';
  const variantStyles = variant === 'primary'
    ? 'bg-[#1FA774] text-white shadow-sm active:shadow-md'
    : 'bg-gray-100 text-gray-900 active:bg-gray-200';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${disabledStyles} ${className}`}
    >
      {children}
    </motion.button>
  );
}
