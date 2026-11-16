import { forwardRef, TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      className = '',
      required,
      disabled,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const isError = Boolean(error);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {/* Label Row */}
        {(label || maxLength) && (
          <div className="flex items-center justify-between">
            {label && (
              <label className="text-sm font-semibold text-brand-green/90">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {maxLength && (
              <span className={`text-xs ${charCount > maxLength ? 'text-red-500' : 'text-brand-green/50'}`}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        {/* Textarea Wrapper */}
        <textarea
          ref={ref}
          value={value}
          disabled={disabled}
          aria-required={required}
          maxLength={maxLength}
          className={`
            w-full rounded-2xl border px-4 py-3 text-brand-green transition-all min-h-[100px] resize-y
            placeholder:text-brand-green/30
            focus:outline-none focus:ring-2 focus:ring-brand-green/20
            disabled:opacity-60 disabled:bg-brand-beige/20 disabled:cursor-not-allowed
            ${
              isError
                ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200'
                : 'border-brand-green/10 bg-white hover:border-brand-green/20 focus:border-brand-green'
            }
          `}
          {...props}
        />

        {/* Hint & Error Text */}
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="text-xs font-medium text-red-500 pl-1"
            >
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-brand-green/50 pl-1"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
