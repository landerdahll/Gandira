'use client';

import { useTheme } from '@/components/providers/theme-provider';

type BrandMarkProps = {
  kind?: 'logo' | 'icon';
  lightBackground?: 'brand' | 'light';
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
};

export function BrandMark({
  kind = 'logo',
  lightBackground = 'light',
  alt = 'Pago',
  style,
  className,
}: BrandMarkProps) {
  const { theme } = useTheme();
  const color = theme === 'dark' ? 'blue' : lightBackground === 'brand' ? 'white' : 'black';

  return <img src={`/${kind}-${color}.svg`} alt={alt} className={className} style={style} />;
}
