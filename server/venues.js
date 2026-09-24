// Catálogo de Complejos Deportivos y Canchas para MatchSport (Lima Metropolitana)

export const VENUES = [
  {
    id: 'venue_surco_1',
    name: 'Cancha Sintética El Golazo',
    district: 'Surco, Lima',
    address: 'Av. Primavera 1420, Surco',
    lat: -12.115,
    lng: -76.985,
    sports: ['futbol'],
    formats: ['1v1', '5v5', '7v7'],
    courtsCount: 4,
    pricePerHour: 90,
    phone: '+51 987 654 321',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1529900240041-22f1df4d0a3e?w=500&auto=format&fit=crop&q=80',
    amenities: ['Estacionamiento', 'Vestuarios con duchas', 'Iluminación LED', 'Bebidas y snacks']
  },
  {
    id: 'venue_miraflores_1',
    name: 'Complejo Deportivo Manuel Bonilla',
    district: 'Miraflores, Lima',
    address: 'Av. Del Ejército 1300, Miraflores',
    lat: -12.118,
    lng: -77.039,
    sports: ['futbol', 'basket', 'tenis'],
    formats: ['1v1', '3v3', '5v5', '7v7', '11v11'],
    courtsCount: 6,
    pricePerHour: 110,
    phone: '+51 981 234 567',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80',
    amenities: ['Estacionamiento amplio', 'Tribunas', 'Vestuarios', 'Seguridad 24h', 'Cafetería']
  },
  {
    id: 'venue_san_borja_1',
    name: 'Polideportivo Limatambo',
    district: 'San Borja, Lima',
    address: 'Av. Malachowsky 560, San Borja',
    lat: -12.102,
    lng: -77.001,
    sports: ['futbol', 'basket'],
    formats: ['1v1', '3v3', '5v5'],
    courtsCount: 5,
    pricePerHour: 85,
    phone: '+51 993 456 789',
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&auto=format&fit=crop&q=80',
    amenities: ['Pista sintética', 'Tableros de acrílico', 'Agua purificada', 'Primeros auxilios']
  },
  {
    id: 'venue_padel_surco',
    name: 'Pádel Club El Polo',
    district: 'Surco, Lima',
    address: 'Av. El Polo 670, Surco',
    lat: -12.108,
    lng: -76.972,
    sports: ['padel'],
    formats: ['1v1', '2v2'],
    courtsCount: 4,
    pricePerHour: 130,
    phone: '+51 977 112 233',
    rating: 4.95,
    imageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=500&auto=format&fit=crop&q=80',
    amenities: ['Canchas panorámicas de cristal', 'Césped texturizado WPT', 'Alquiler de palas', 'Terraza lounge']
  },
  {
    id: 'venue_san_isidro_1',
    name: 'Complejo Deportivo San Isidro',
    district: 'San Isidro, Lima',
    address: 'Av. Augusto Pérez Araníbar 1595, San Isidro',
    lat: -12.107,
    lng: -77.051,
    sports: ['futbol', 'tenis', 'padel'],
    formats: ['1v1', '2v2', '5v5'],
    courtsCount: 8,
    pricePerHour: 120,
    phone: '+51 966 334 455',
    rating: 4.85,
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&auto=format&fit=crop&q=80',
    amenities: ['Canchas techadas y al aire libre', 'Marcadores digitales', 'Duchas con agua caliente', 'Locker individual']
  },
  {
    id: 'venue_callao_1',
    name: 'Complejo Deportivo Bellavista Callao',
    district: 'Bellavista, Callao',
    address: 'Av. Óscar R. Benavides 2900, Bellavista',
    lat: -12.062,
    lng: -77.112,
    sports: ['futbol', 'basket'],
    formats: ['1v1', '3v3', '5v5', '7v7'],
    courtsCount: 5,
    pricePerHour: 75,
    phone: '+51 955 667 788',
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop&q=80',
    amenities: ['Césped FIFA Quality', 'Gradas', 'Iluminación nocturna', 'Estacionamiento vigilado']
  }
];

// Generador de turnos disponibles de 6:00 AM a 11:00 PM
export function getVenueSlots(venueId, dateStr = null) {
  const hours = [
    '07:00 AM - 08:00 AM',
    '08:00 AM - 09:00 AM',
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM',
    '06:00 PM - 07:00 PM',
    '07:00 PM - 08:00 PM',
    '08:00 PM - 09:00 PM',
    '09:00 PM - 10:00 PM',
    '10:00 PM - 11:00 PM'
  ];

  // Generación determinista de slots ocupados/libres para realismo
  return hours.map((slot, index) => {
    const isPrimeTime = slot.includes('07:00 PM') || slot.includes('08:00 PM') || slot.includes('09:00 PM');
    const isBooked = index % 3 === 1; // 일부 slots ocupados
    return {
      id: `slot_${venueId}_${index}`,
      time: slot,
      available: !isBooked,
      isPrimeTime,
      bookedBy: isBooked ? 'Reserva Club' : null
    };
  });
}
