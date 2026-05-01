'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Search, MapPin } from 'lucide-react';

function FilterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? '');

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    router.push(`/?${params.toString()}`);
  }, [search, city, router]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-8">
      <div className="relative flex-1">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#555' }} />
        <input
          type="text"
          placeholder="Buscar evento, artista ou local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-[#555] outline-none transition-colors"
          style={{ background: '#1a1a1a', border: '1px solid #252525' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
          onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
        />
      </div>
      <div className="relative">
        <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#555' }} />
        <input
          type="text"
          placeholder="Cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="w-full sm:w-44 pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-[#555] outline-none transition-colors"
          style={{ background: '#1a1a1a', border: '1px solid #252525' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
          onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
        />
      </div>
      <button
        onClick={applyFilters}
        className="font-semibold text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-85"
        style={{ background: '#67bed9', color: '#fff' }}
      >
        Buscar
      </button>
    </div>
  );
}

export function EventsFilter() {
  return (
    <Suspense>
      <FilterForm />
    </Suspense>
  );
}
