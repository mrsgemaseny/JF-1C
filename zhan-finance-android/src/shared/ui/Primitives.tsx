import {
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { haptics } from '@/shared/lib/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const bgClass =
    variant === 'primary'
      ? 'bg-emerald-500 active:bg-emerald-600'
      : variant === 'danger'
        ? 'bg-red-500/15 border border-red-500/30 active:bg-red-500/25'
        : variant === 'secondary'
          ? 'bg-zinc-800 border border-white/10 active:bg-zinc-700'
          : 'bg-transparent active:bg-white/5';

  const textClass =
    variant === 'primary'
      ? 'text-zinc-950 font-semibold'
      : variant === 'danger'
        ? 'text-red-400 font-semibold'
        : 'text-zinc-100 font-medium';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      className={`min-h-[46px] px-4 py-3 rounded-md flex-row items-center justify-center ${bgClass} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#0a0a0c' : '#f4f4f5'}
        />
      ) : (
        <Text className={`text-sm ${textClass}`}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SurfaceCard({ children, className = '', ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-surface rounded-lg border border-white/10 p-4 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AppInput({ label, error, ...props }: AppInputProps) {
  return (
    <View className="mb-3.5">
      <Text className="text-xs font-medium text-zinc-400 mb-1.5">{label}</Text>
      <TextInput
        placeholderTextColor="#71717a"
        className="min-h-[46px] bg-surface-elevated border border-white/10 rounded-md px-3.5 py-2.5 text-sm text-zinc-100"
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-400 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}

interface StatusBadgeProps {
  label: string;
  tone?: 'emerald' | 'amber' | 'red' | 'blue' | 'zinc';
}

export function StatusBadge({ label, tone = 'zinc' }: StatusBadgeProps) {
  const toneStyles: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    zinc: 'bg-zinc-800 text-zinc-300 border-white/10',
  };

  return (
    <View className={`px-2 py-0.5 rounded border ${toneStyles[tone]}`}>
      <Text className="text-xs font-medium text-zinc-200">{label}</Text>
    </View>
  );
}
