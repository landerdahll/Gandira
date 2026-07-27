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
  const classes = [
    'brand-mark',
    `brand-mark--${kind}`,
    `brand-mark--on-${lightBackground}`,
    className,
  ].filter(Boolean).join(' ');

  const src = kind === 'logo' ? '/logo-full-blue.svg' : '/icon-blue.svg';

  return <img src={src} alt={alt} className={classes} style={style} />;
}
