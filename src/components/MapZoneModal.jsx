import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Check, X, Search, Target, Map } from 'lucide-react';
import ALL_PERU_DISTRICTS from '../data/peru_districts.json';

// Distritos con coordenadas para el cálculo de distancias y cobertura
const DISTRICTS_WITH_COORDS = ALL_PERU_DISTRICTS.filter(d => d.lat !== null && d.lng !== null);

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

// Atajos rápidos para centros de zona populares
const POPULAR_SHORTCUTS = [
  { name: 'Surco', lat: -12.137, lng: -76.985 },
  { name: 'San Borja', lat: -12.108, lng: -77.001 },
  { name: 'Miraflores', lat: -12.122, lng: -77.030 },
  { name: 'San Isidro', lat: -12.098, lng: -77.035 },
  { name: 'La Molina', lat: -12.083, lng: -76.946 },
  { name: 'San Miguel', lat: -12.076, lng: -77.086 },
  { name: 'Los Olivos', lat: -11.992, lng: -77.070 },
  { name: 'Callao', lat: -12.056, lng: -77.118 },
  { name: 'Arequipa', lat: -16.409, lng: -71.537 },
  { name: 'Trujillo', lat: -8.111, lng: -79.028 },
  { name: 'Cusco', lat: -13.531, lng: -71.967 }
];

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
  const [mapType, setMapType] = useState('streets'); // 'streets' o 'satellite'
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const tileLayerRef = useRef(null);

  // Filtrar distritos de búsqueda por nombre, provincia o departamento (1,812 de INEI)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return ALL_PERU_DISTRICTS.filter(d =>
      d.distrito.toLowerCase().includes(q) ||
      d.provincia.toLowerCase().includes(q) ||
      d.departamento.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Calcular dinámicamente qué distritos están dentro del área circular de alcance
  const coveredDistricts = useMemo(() => {
    return DISTRICTS_WITH_COORDS.filter((d) => {
      const dist = getDistanceKm(lat, lng, d.lat, d.lng);
      return dist <= radiusKm;
    });
  }, [lat, lng, radiusKm]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializar mapa de Leaflet con soporte de alta resolución
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      maxZoom: 20
    });
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Google Maps HD Tiles (Ultra Nítido, Calles y Nombres completos)
    const googleStreets = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      detectRetina: true
    });

    googleStreets.addTo(map);
    tileLayerRef.current = googleStreets;


    // Pin de centro de área
    const customIcon = L.divIcon({
      className: 'custom-reach-pin',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
        ">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    // Círculo de área de alcance
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

  // Cambiar tipo de mapa (Calles vs Satélite Híbrido) dinámicamente
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileUrl = mapType === 'satellite'
      ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Google Hybrid Satellite HD
      : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Streets HD

    const newLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; Google Maps',
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      detectRetina: true
    });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

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
  const handleSelectDistrict = (targetLat, targetLng, name) => {
    setLat(targetLat);
    setLng(targetLng);
    setSearchQuery('');

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.setView([targetLat, targetLng], 14);
      markerRef.current.setLatLng([targetLat, targetLng]);
      circleRef.current.setLatLng([targetLat, targetLng]);
    }
  };

  const [gpsStatusMsg, setGpsStatusMsg] = useState('');

  // Usar GPS con Fallback inteligente (Brave / HTTP local suelen bloquear GPS por seguridad)
  const handleUseGPS = async () => {
    setGpsLoading(true);
    setGpsStatusMsg('');

    const applyLocation = (uLat, uLng, sourceMsg) => {
      setLat(uLat);
      setLng(uLng);

      if (mapInstanceRef.current && markerRef.current && circleRef.current) {
        mapInstanceRef.current.setView([uLat, uLng], 13);
        markerRef.current.setLatLng([uLat, uLng]);
        circleRef.current.setLatLng([uLat, uLng]);
      }
      setGpsLoading(false);
      setGpsStatusMsg(sourceMsg);
      setTimeout(() => setGpsStatusMsg(''), 4000);
    };

    // Intentar siempre Geolocation API del dispositivo primero
    if (navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyLocation(pos.coords.latitude, pos.coords.longitude, '📍 Ubicación GPS satelital detectada');
        },
        async (err) => {
          console.warn('[GPS] Error de sensor o permisos en navegador:', err.message);
          // Si el navegador bloquea el GPS por ser HTTP o permisos, fallback a IP
          await fallbackToIpLocation(applyLocation);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      await fallbackToIpLocation(applyLocation);
    }
  };

  const fallbackToIpLocation = async (applyLocation) => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        applyLocation(data.latitude, data.longitude, `🌐 Ubicación por Red: ${data.city || 'Lima'}`);
        return;
      }
    } catch (e) {
      // Segundo intento con ipwhois si ipapi falla
      try {
        const res2 = await fetch('https://ipwho.is/');
        const data2 = await res2.json();
        if (data2 && data2.latitude && data2.longitude) {
          applyLocation(data2.latitude, data2.longitude, `🌐 Ubicación por Red: ${data2.city || 'Lima'}`);
          return;
        }
      } catch (err2) {
        console.warn('IP Geo fallback failed:', err2);
      }
    }

    // Si ambos fallan (ej. sin conexión a internet externa o bloqueador total)
    setGpsLoading(false);
    applyLocation(-12.122, -77.030, '📍 Ubicación central en Lima seleccionada (Puedes elegir tu distrito arriba)');
  };

  const handleSave = () => {
    // Generar resumen de los distritos abarcados
    const summary = coveredDistricts.length > 0
      ? coveredDistricts.map(d => d.distrito).slice(0, 3).join(', ') + (coveredDistricts.length > 3 ? ` +${coveredDistricts.length - 3} distritos` : '')
      : 'Zona Personalizada';

    onSave({
      lat,
      lng,
      radiusKm,
      district: summary,
      coveredDistricts: coveredDistricts.map(d => d.distrito)
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '94vh' }}>
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
                RADIO DE BÚSQUEDA • PERÚ INEI
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              Radio de Búsqueda en el Mapa
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Toggle de Google Maps (Calles / Satélite HD) */}
            <div style={{
              display: 'flex',
              background: '#1e293b',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                type="button"
                onClick={() => setMapType('streets')}
                style={{
                  background: mapType === 'streets' ? '#10b981' : 'transparent',
                  color: mapType === 'streets' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🗺️ Calles
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                style={{
                  background: mapType === 'satellite' ? '#10b981' : 'transparent',
                  color: mapType === 'satellite' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🛰️ Satélite
              </button>
            </div>

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>


        {/* Buscador de distritos de todo el Perú (INEI: 1,812 distritos) */}
        <div style={{ padding: '10px 16px 6px', background: 'rgba(11, 15, 25, 0.95)', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar distrito en Perú (ej. Miraflores, Surco, Yanahuara)..."
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px 8px 34px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '8px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocompletado de búsqueda INEI */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '46px',
              left: '16px',
              right: '16px',
              zIndex: 1000,
              background: '#0f172a',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.lat && item.lng) {
                      handleSelectDistrict(item.lat, item.lng, item.distrito);
                    } else {
                      // Coordenadas aproximadas si es provincia sin GPS individual
                      handleSelectDistrict(lat, lng, item.distrito);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{item.distrito}</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({item.provincia}, {item.departamento})</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    INEI
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atajos de Centro de Área */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '6px 16px 10px',
          background: 'rgba(11, 15, 25, 0.95)',
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
              padding: '5px 10px',
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
            {gpsLoading ? 'GPS...' : 'Mi GPS'}
          </button>

          {POPULAR_SHORTCUTS.map((dist) => (
            <button
              key={dist.name}
              onClick={() => handleSelectDistrict(dist.lat, dist.lng, dist.name)}
              style={{
                flexShrink: 0,
                padding: '5px 10px',
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

        {/* Mensaje de estado GPS / Fallback IP */}
        {gpsStatusMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '5px 16px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#a7f3d0',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            {gpsStatusMsg}
          </div>
        )}


        {/* Mapa Interactivo con Leaflet Dark Mode (Sin marcas de agua, sin API Key) */}
        <div
          ref={mapContainerRef}
          className="map-dark-tiles"
          style={{
            width: '100%',
            height: '260px',
            position: 'relative',
            background: '#0b0f19'
          }}
        />

        {/* Panel de Control de Alcance */}
        <div style={{ padding: '14px 18px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Slider de Radio */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={15} color="#10b981" /> Radio de Búsqueda:
              </span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#10b981', fontFamily: 'Outfit' }}>
                {radiusKm} km a la redonda
              </span>
            </div>

            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              <span>2 km (Cercano)</span>
              <span>8 km (Vecinos)</span>
              <span>25 km (Metropolitano)</span>
            </div>
          </div>

          {/* Lista dinámica de distritos cubiertos en tiempo real */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📍 Distritos dentro de tu radio ({coveredDistricts.length}):
              </span>
              <span style={{ fontSize: '10px', color: '#6ee7b7' }}>
                Canchas disponibles
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '68px', overflowY: 'auto' }}>
              {coveredDistricts.length > 0 ? (
                coveredDistricts.map((d) => (
                  <span
                    key={d.id || d.distrito}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '5px'
                    }}
                  >
                    ✓ {d.distrito}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Aumenta el radio para abarcar más distritos
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px' }}
          >
            <Check size={17} />
            Confirmar Zona ({radiusKm} km)
          </button>
        </div>
      </div>
    </div>
  );
}

