import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  loading?: boolean;
  success?: boolean;
  showCharCount?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      loading,
      success,
      showCharCount = false,
      className = '',
      required,
      disabled,
      maxLength,
      value,
      type,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation(['common']);
    const isError = Boolean(error);
    const charCount = typeof value === 'string' ? value.length : 0;
    const [showPassword, setShowPassword] = useState(false);
    
    const isPasswordType = type === 'password';
    const currentType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {/* Label Row */}
        {(label || (showCharCount && maxLength)) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={props.id} className="text-sm font-semibold text-brand-green/90">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {showCharCount && maxLength && (
              <span className={`text-xs ${charCount > maxLength ? 'text-red-500' : 'text-brand-green/50'}`}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        {/* Input Wrapper */}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-brand-green/40 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            value={value}
            disabled={disabled || loading}
            aria-required={required}
            maxLength={maxLength}
            type={currentType}
            className={`
              w-full rounded-2xl border px-4 py-3 text-brand-green transition-all
              placeholder:text-brand-green/30
              focus:outline-none focus:ring-2 focus:ring-brand-green/20
              disabled:opacity-60 disabled:bg-brand-beige/20 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${loading || success || isPasswordType ? 'pr-10' : ''}
              ${
                isError
                  ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200'
                  : 'border-brand-green/10 bg-white hover:border-brand-green/20 focus:border-brand-green'
              }
            `}
            {...props}
          />

          {/* Right Accessories (Loading / Success / Password Toggle) */}
          <div className="absolute right-3 flex items-center">
            {loading && <Loader2 className="w-5 h-5 text-brand-green/50 animate-spin" />}
            {!loading && success && !isError && !isPasswordType && <CheckCircle2 className="w-5 h-5 text-green-500 pointer-events-none" />}
            {isPasswordType && !loading && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-brand-green/40 hover:text-brand-green/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/20 rounded-md p-0.5"
                aria-label={showPassword ? t('ui.hidePassword', { defaultValue: 'Скрыть пароль' }) : t('ui.showPassword', { defaultValue: 'Показать пароль' })}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Hint & Error Text */}
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50/80 border border-red-200 text-xs font-medium text-red-600"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
              <span>{error}</span>
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

Input.displayName = 'Input';
