interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-t-2 border-b-2',
    md: 'h-8 w-8 border-t-2 border-b-2',
    lg: 'h-12 w-12 border-t-2 border-b-2',
  };

  return (
    <div className={`flex justify-center items-center ${size === 'lg' ? 'p-8' : 'p-2'} ${className}`}>
      <div className={`animate-spin rounded-full border-current ${sizeClasses[size]}`}></div>
    </div>
  );
}

export function InlineSpinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-green border-r-transparent"></span>
  );
}
