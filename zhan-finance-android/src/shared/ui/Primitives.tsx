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
      ? 'bg-[#00562D]'
      : variant === 'danger'
        ? 'bg-red-500/10 border border-red-500/20'
        : variant === 'secondary'
          ? 'bg-[#F5F5DC] border border-[#00562D]/15'
          : 'bg-transparent';

  const textClass =
    variant === 'primary'
      ? 'text-[#F5F5DC] font-bold uppercase tracking-wider'
      : variant === 'danger'
        ? 'text-red-600 font-semibold'
        : 'text-[#00562D] font-bold';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      className={`min-h-[50px] px-5 py-3.5 rounded-2xl flex-row items-center justify-center shadow-md shadow-[#00562D]/10 ${bgClass} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#F5F5DC' : '#00562D'}
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
      className={`bg-white rounded-3xl border border-[#00562D]/10 p-6 shadow-xl shadow-black/5 ${className}`}
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
    <View className="mb-4">
      <Text className="text-xs font-bold text-[#00562D]/75 uppercase tracking-wide mb-1.5">{label}</Text>
      <TextInput
        placeholderTextColor="#9ca3af"
        className="min-h-[48px] bg-white border border-[#00562D]/20 focus:border-[#00562D] rounded-xl px-4 py-3 text-sm text-[#00562D] font-medium"
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-600 mt-1.5 font-medium">{error}</Text>
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
