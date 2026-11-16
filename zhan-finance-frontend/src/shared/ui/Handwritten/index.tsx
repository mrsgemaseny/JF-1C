import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HandwrittenProps {
  text: string;
  className?: string;
}

export function HandwrittenArrow({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge("w-12 h-12 stroke-brand-accent stroke-2", className)}
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      <path d="M20 80 Q 50 20 80 20 M 80 20 L 60 25 M 80 20 L 75 40" />
    </svg>
  );
}

export function HandwrittenText({ text, className }: HandwrittenProps) {
  // A simple handwriting-style font or just cursive styling
  return (
    <motion.div 
      initial={{ opacity: 0, rotate: -5, scale: 0.9 }}
      whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      viewport={{ once: true }}
      className={twMerge(
        "font-['Caveat',cursive,'Comic_Sans_MS'] italic text-brand-accent text-2xl md:text-3xl font-bold tracking-wider", 
        className
      )}
    >
      {text}
    </motion.div>
  );
}
