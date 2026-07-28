const apiUrl = process.env.PRODUCTION_API_URL?.replace(/\/$/, '');
const email = process.env.PRODUCTION_ADMIN_EMAIL;
const password = process.env.PRODUCTION_ADMIN_PASSWORD;

if (!apiUrl || !email || !password || process.env.CONFIRM_PRODUCTION_SAMPLE_EVENTS !== 'yes') {
  throw new Error(
    'Informe PRODUCTION_API_URL, PRODUCTION_ADMIN_EMAIL, PRODUCTION_ADMIN_PASSWORD e CONFIRM_PRODUCTION_SAMPLE_EVENTS=yes.',
  );
}

const samples = [
  {
    title: 'Noite Urbana',
    description: 'Uma noite com música ao vivo, DJs e diferentes estilos em um encontro pensado para quem gosta de descobrir novos sons.',
    venue: 'Opinião', address: 'Rua José do Patrocínio, 834', zipCode: '90050-002',
    startDate: '2027-09-19T01:00:00.000Z', endDate: '2027-09-19T07:00:00.000Z', doorsOpen: '2027-09-19T00:00:00.000Z',
    price: 35, coverImage: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Festival da Cidade',
    description: 'Uma experiência com shows, gastronomia e atrações locais reunidas em uma programação especial.',
    venue: 'Pepsi on Stage', address: 'Avenida Severo Dullius, 1995', zipCode: '90200-310',
    startDate: '2027-10-17T19:00:00.000Z', endDate: '2027-10-18T04:00:00.000Z', doorsOpen: '2027-10-17T18:00:00.000Z',
    price: 45, coverImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Sons do Guaíba',
    description: 'Uma noite especial com artistas convidados e repertório inspirado na cena musical contemporânea.',
    venue: 'Auditório Araújo Vianna', address: 'Avenida Osvaldo Aranha, 685', zipCode: '90035-191',
    startDate: '2027-11-20T23:30:00.000Z', endDate: '2027-11-21T02:45:00.000Z', doorsOpen: '2027-11-20T22:30:00.000Z',
    price: 50, coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=82',
  },
];

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

const login = await request('/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
});
const authorized = (method, body) => ({
  method,
  headers: { Authorization: `Bearer ${login.accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

const adminEvents = await request('/events/admin/all?limit=100', authorized('GET'));
const results = [];

for (const sample of samples) {
  const matches = adminEvents.data.filter((event) => event.title === sample.title);
  if (matches.length > 1) throw new Error(`Mais de um evento encontrado com o título ${sample.title}; operação interrompida.`);

  let event = matches[0];
  if (event && (event.venue !== sample.venue || new Date(event.startDate).getTime() !== new Date(sample.startDate).getTime())) {
    throw new Error(`${sample.title} já existe com local ou data divergente; operação interrompida.`);
  }
  if (!event) {
    event = await request('/events', authorized('POST', {
      title: sample.title, description: sample.description, venue: sample.venue, address: sample.address,
      city: 'Porto Alegre', state: 'RS', zipCode: sample.zipCode, startDate: sample.startDate,
      endDate: sample.endDate, doorsOpen: sample.doorsOpen, ageRating: 16, category: 'Shows',
      tags: ['música', 'porto alegre', 'ao vivo'], coverImage: sample.coverImage,
    }));
  }

  if (event.status === 'DRAFT') {
    const managedEvent = await request(`/events/${event.id}/manage`, authorized('GET'));
    const initialBatches = managedEvent.batches.filter((batch) => batch.name === 'Lote inicial');
    if (initialBatches.length > 1) throw new Error(`${sample.title} possui lotes iniciais duplicados; operação interrompida.`);
    if (initialBatches.length === 0) await request(`/events/${event.id}/batches`, authorized('POST', {
      name: 'Lote inicial', price: sample.price, quantity: 500,
      startsAt: '2026-01-01T03:00:00.000Z', endsAt: new Date(new Date(sample.startDate).getTime() - 86_400_000).toISOString(),
      ticketType: 'GENERAL', sortOrder: 0,
    }));
    event = await request(`/events/${event.id}/publish`, authorized('PATCH'));
  }

  if (event.status !== 'PUBLISHED') throw new Error(`${sample.title} não está publicável (status ${event.status}).`);
  if (event.featured) throw new Error(`${sample.title} está indevidamente destacado; nenhum evento foi alterado.`);
  results.push({ id: event.id, slug: event.slug, title: event.title, status: event.status, featured: event.featured });
}

console.log(JSON.stringify({ environment: apiUrl, events: results }, null, 2));
