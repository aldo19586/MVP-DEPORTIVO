import React, { useState, useEffect } from 'react';
import { MapPin, Phone, DollarSign, Calendar, Clock, CheckCircle2, XCircle, Search, Sparkles } from 'lucide-react';
import { fetchVenues, fetchVenueDetails, bookVenueSlot } from '../services/api';

export default function VenuesScheduleView() {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchVenues().then((res) => {
      if (res.venues && res.venues.length > 0) {
        setVenues(res.venues);
        loadVenueDetails(res.venues[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadVenueDetails = async (venueId) => {
    try {
      const data = await fetchVenueDetails(venueId);
      if (data.venue) {
        setSelectedVenue(data.venue);
        setSlots(data.venue.slots || []);
      }
    } catch (e) {
      console.error('Error cargando complejo:', e);
    }
  };

  const handleBookSlot = async (slot) => {
    if (!slot.available) {
      alert('Este turno ya se encuentra reservado.');
      return;
    }
    const customer = prompt(`Registrar reserva presencial para turno:\n${slot.time}\n\nIngresa nombre del cliente o equipo:`, 'Equipo Retador');
    if (customer) {
      try {
        const res = await bookVenueSlot(selectedVenue.id, slot.id, 'presential_user');
        if (res.success) {
          setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, available: false, bookedBy: customer } : s));
          setActionMsg(`Turno ${slot.time} reservado con éxito a nombre de "${customer}".`);
          setTimeout(() => setActionMsg(''), 5000);
        }
      } catch (e) {
        alert('Error en reserva: ' + e.message);
      }
    }
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>Cargando complejos deportivos...</div>;
  }

  const occupiedCount = slots.filter(s => !s.available).length;
  const occupancyPct = slots.length > 0 ? Math.round((occupiedCount / slots.length) * 100) : 0;
  const estimatedRevenue = occupiedCount * (selectedVenue?.pricePerHour || 90);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Parrilla de Turnos y Canchas (Portal B2B)</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Visualización panorámica de horarios de 7:00 AM a 11:00 PM, tarifas por hora y gestión de cobros de recepción.
          </p>
        </div>

        {/* Selector de Complejo Deportivo */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Complejo:</span>
          <select
            value={selectedVenue?.id || ''}
            onChange={(e) => loadVenueDetails(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.district})</option>
            ))}
          </select>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          ✅ {actionMsg}
        </div>
      )}

      {selectedVenue && (
        <>
          {/* Tarjeta de Métricas Rápidas del Complejo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="admin-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Canchas Habilitadas</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>{selectedVenue.courtsCount} Canchas</div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>{selectedVenue.sports.join(', ').toUpperCase()}</div>
            </div>

            <div className="admin-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tarifa por Hora</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8' }}>S/ {selectedVenue.pricePerHour}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Precio oficial público</div>
            </div>

            <div className="admin-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Ocupación de Turnos</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: occupancyPct > 60 ? '#10b981' : '#f59e0b' }}>
                {occupancyPct}%
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {occupiedCount} de {slots.length} turnos reservados
              </div>
            </div>

            <div className="admin-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Ingreso Estimado Hoy</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>S/ {estimatedRevenue}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Cobros de alquiler calculados</div>
            </div>
          </div>

          {/* Grilla de Turnos Horarios (Panorámica 1080p) */}
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Horarios y Parrilla de Reservas</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{selectedVenue.address} • Tel: {selectedVenue.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="badge badge-lime">● Disponible para reserva</span>
                <span className="badge badge-red">● Ocupado / Reservado</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => handleBookSlot(slot)}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: slot.available ? '#0b111d' : '#1e1b2e',
                    border: `1px solid ${slot.available ? '#1e293b' : 'rgba(239, 68, 68, 0.4)'}`,
                    cursor: slot.available ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {slot.isPrimeTime && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff'
                    }}>
                      PRIME TIME
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Clock size={16} color={slot.available ? '#10b981' : '#f87171'} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>{slot.time}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: slot.available ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {slot.available ? '🟢 Libre' : `🔴 ${slot.bookedBy || 'Reservado'}`}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                      S/ {selectedVenue.pricePerHour}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
