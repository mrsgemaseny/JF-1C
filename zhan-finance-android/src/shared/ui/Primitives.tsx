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
        ? 'bg-red-50 border border-red-200'
        : variant === 'secondary'
          ? 'bg-white border border-gray-200'
          : 'bg-transparent';

  const textClass =
    variant === 'primary'
      ? 'text-white font-semibold'
      : variant === 'danger'
        ? 'text-red-600 font-semibold'
        : variant === 'secondary'
          ? 'text-gray-700 font-semibold'
          : 'text-[#00562D] font-semibold';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      className={`min-h-[46px] px-4 py-2.5 rounded-xl flex-row items-center justify-center ${bgClass} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#00562D'}
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
      className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, ...props }: AppInputProps) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-xs font-semibold text-gray-700 mb-1.5">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        className="min-h-[46px] bg-white border border-gray-200 focus:border-[#00562D] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium"
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-600 mt-1.5 font-medium">{error}</Text>
      ) : null}
    </View>
  );
}

export interface StatusBadgeProps {
  label: string;
  tone?: 'emerald' | 'amber' | 'red' | 'blue' | 'zinc';
  color?: string;
}

export function StatusBadge({ label, tone = 'zinc', color }: StatusBadgeProps) {
  if (color) {
    return (
      <View
        style={{ backgroundColor: color }}
        className="px-2.5 py-0.5 rounded-full items-center justify-center self-start"
      >
        <Text className="text-xs font-semibold text-white">{label}</Text>
      </View>
    );
  }

  const toneStyles: Record<
    NonNullable<StatusBadgeProps['tone']>,
    { container: string; text: string }
  > = {
    emerald: {
      container: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
    },
    amber: {
      container: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
    },
    red: {
      container: 'bg-red-50 border-red-200',
      text: 'text-red-800',
    },
    blue: {
      container: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
    },
    zinc: {
      container: 'bg-gray-100 border-gray-200',
      text: 'text-gray-700',
    },
  };

  const current = toneStyles[tone] ?? toneStyles.zinc;

  return (
    <View
      className={`px-2.5 py-0.5 rounded-full border items-center justify-center self-start ${current.container}`}
    >
      <Text className={`text-xs font-semibold ${current.text}`}>{label}</Text>
    </View>
  );
}
