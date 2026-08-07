'use client';

import { useEffect, useState } from 'react';

function formatPrice(price: number) {
  if (price === 0) return 'Gratuito';
  return `A partir de ${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}

export function MobilePurchaseCta({ checkoutId, lowestPrice }: { checkoutId: string; lowestPrice: number }) {
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  useEffect(() => {
    const checkout = document.getElementById(checkoutId);
    if (!checkout) return;
    const observer = new IntersectionObserver(
      entries => setCheckoutVisible(entries.some(entry => entry.isIntersecting)),
      { threshold: 0.08 },
    );
    observer.observe(checkout);
    return () => observer.disconnect();
  }, [checkoutId]);

  if (checkoutVisible) return null;

  return (
    <aside className="event-mobile-purchase-cta" aria-label="Atalho para compra de ingresso">
      <span>{formatPrice(lowestPrice)}</span>
      <button type="button" onClick={() => document.getElementById(checkoutId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
        Comprar ingresso
      </button>
    </aside>
  );
}
