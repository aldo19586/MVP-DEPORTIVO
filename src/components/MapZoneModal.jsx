import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Check, X, Sliders, Target, Eye } from 'lucide-react';

// Distritos de Lima con coordenadas para calcular el área de alcance
const LIMA_DISTRICTS = [
  { name: 'Surco', lat: -12.137, lng: -76.985 },
  { name: 'San Borja', lat: -12.108, lng: -77.001 },
  { name: 'Miraflores', lat: -12.122, lng: -77.030 },
  { name: 'San Isidro', lat: -12.098, lng: -77.035 },
  { name: 'Surquillo', lat: -12.112, lng: -77.017 },
  { name: 'Barranco', lat: -12.148, lng: -77.021 },
  { name: 'La Molina', lat: -12.083, lng: -76.946 },
  { name: 'Magdalena', lat: -12.091, lng: -77.069 },
  { name: 'Jesús María', lat: -12.074, lng: -77.049 },
  { name: 'Lince', lat: -12.083, lng: -77.034 },
  { name: 'Pueblo Libre', lat: -12.073, lng: -77.063 },
  { name: 'San Miguel', lat: -12.076, lng: -77.086 },
  { name: 'Chorrillos', lat: -12.176, lng: -77.018 }
];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapZoneModal({
  currentLocation,
  onSave,
  onClose
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [lat, setLat] = useState(currentLocation?.lat || -12.122);
  const [lng, setLng] = useState(currentLocation?.lng || -77.030);
  const [radiusKm, setRadiusKm] = useState(currentLocation?.radiusKm || 6);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Calcular dinámicamente qué distritos están dentro del área circular de alcance
  const coveredDistricts = LIMA_DISTRICTS.filter((d) => {
    const dist = getDistanceKm(lat, lng, d.lat, d.lng);
    return dist <= radiusKm;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializar mapa de Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false
    });
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Dark Matter tiles (modo oscuro tecnológico)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Pin de centro de área
    const customIcon = L.divIcon({
      className: 'custom-reach-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 14px;
        ">
          📍
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    // Círculo de área de alcance (Estilo promoción de Instagram)
    const circle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.22,
      weight: 3,
      dashArray: '6, 6'
    }).addTo(map);
    circleRef.current = circle;

    // Al arrastrar el marcador central
    marker.on('drag', (e) => {
      const pos = e.target.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      circle.setLatLng(pos);
    });

    // Al hacer clic en cualquier punto del mapa
    map.on('click', (e) => {
      const pos = e.latlng;
      setLat(pos.lat);
      setLng(pos.lng);
      marker.setLatLng(pos);
      circle.setLatLng(pos);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Actualizar círculo cuando cambia el radio (slider)
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), { padding: [25, 25] });
      }
    }
  }, [radiusKm]);

  // Cambiar punto de referencia rápido
  const handleSelectDistrict = (dist) => {
    setLat(dist.lat);
    setLng(dist.lng);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.setView([dist.lat, dist.lng], 13);
      markerRef.current.setLatLng([dist.lat, dist.lng]);
      circleRef.current.setLatLng([dist.lat, dist.lng]);
    }
  };

  // Usar GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setLat(uLat);
        setLng(uLng);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.setView([uLat, uLng], 13);
          markerRef.current.setLatLng([uLat, uLng]);
          circleRef.current.setLatLng([uLat, uLng]);
        }
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        alert('No se pudo obtener la ubicación GPS.');
      },
      { timeout: 8000 }
    );
  };

  const handleSave = () => {
    // Generar resumen de los distritos abarcados
    const summary = coveredDistricts.length > 0
      ? coveredDistricts.map(d => d.name).slice(0, 3).join(', ') + (coveredDistricts.length > 3 ? ` +${coveredDistricts.length - 3} distritos` : '')
      : 'Zona Personalizada';

    onSave({
      lat,
      lng,
      radiusKm,
      district: summary,
      coveredDistricts: coveredDistricts.map(d => d.name)
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '94vh' }}>
        {/* Header con Radio de Búsqueda */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                RADIO DE BÚSQUEDA
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              Radio de Búsqueda en el Mapa
            </h3>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>
              Elige tu punto y ajusta el radio en km para encontrar rivales a la redonda
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Atajos de Centro de Área */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '8px 16px',
          background: 'rgba(11, 15, 25, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={handleUseGPS}
            disabled={gpsLoading}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              color: '#93c5fd',
              cursor: 'pointer'
            }}
          >
            <Navigation size={12} />
            {gpsLoading ? 'GPS...' : 'Mi Ubicación'}
          </button>

          {LIMA_DISTRICTS.slice(0, 7).map((dist) => (
            <button
              key={dist.name}
              onClick={() => handleSelectDistrict(dist)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              {dist.name}
            </button>
          ))}
        </div>

        {/* Mapa Interactivo con el círculo de área de alcance */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '270px',
            position: 'relative',
            background: '#0a0f1d'
          }}
        />

        {/* Panel de Control de Alcance (Estilo Instagram) */}
        <div style={{ padding: '16px 20px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Slider de Radio */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={15} color="#10b981" /> Radio de Búsqueda:
              </span>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#10b981', fontFamily: 'Outfit' }}>
                {radiusKm} km a la redonda
              </span>
            </div>

            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              <span>2 km (Cercano)</span>
              <span>8 km (Distritos vecinos)</span>
              <span>20 km (Todo Lima)</span>
            </div>
          </div>

          {/* Lista dinámica de distritos cubiertos en tiempo real */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📍 Distritos dentro de tu radio ({coveredDistricts.length}):
              </span>
              <span style={{ fontSize: '10px', color: '#6ee7b7' }}>
                Empareja en cualquier cancha aquí
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {coveredDistricts.length > 0 ? (
                coveredDistricts.map((d) => (
                  <span
                    key={d.name}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    ✓ {d.name}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Aumenta el radio para abarcar distritos cercanos
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '14px', borderRadius: '12px' }}
          >
            <Check size={18} />
            Confirmar Radio ({radiusKm} km)
          </button>
        </div>
      </div>
    </div>
  );
}
