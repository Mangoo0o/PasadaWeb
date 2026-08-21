import React from 'react';
import { 
  Car, AlertTriangle, DollarSign, MapPin, TrendingUp 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell 
} from 'recharts';
import type { Terminal, Driver, Booking, Complaint } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';

// Fix Leaflet marker icon asset issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Terminal Marker Icon
const terminalIcon = L.divIcon({
  className: 'custom-terminal-marker',
  html: `<div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 0 10px rgba(37,99,235,0.6);">T</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Custom Driver Marker Icon
const driverIcon = L.divIcon({
  className: 'custom-driver-marker',
  html: `<div style="background:#10b981;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;border:2px solid #fff;box-shadow:0 0 8px rgba(16,185,129,0.6);">🛺</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

interface DashboardPageProps {
  terminals: Terminal[];
  drivers: Driver[];
  bookings: Booking[];
  complaints: Complaint[];
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  terminals, drivers, bookings, complaints, setActiveTab 
}) => {
  const activeDriversCount = drivers.filter(d => d.verification_status === 'approved').length;
  const pendingDriversCount = drivers.filter(d => d.verification_status === 'pending').length;
  const openComplaintsCount = complaints.filter(c => c.status !== 'resolved').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.final_fare || b.computed_fare || b.estimated_fare || 0), 0);

  // Dynamic Calculation of Hourly Ride Trend Chart from Live Bookings Data
  const hoursList = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const rideTrendData = hoursList.map(time => {
    const targetHour = parseInt(time.split(':')[0], 10);
    const matchingBookings = bookings.filter(b => {
      if (!b.created_at) return false;
      const date = new Date(b.created_at);
      const h = date.getHours();
      return h >= targetHour && h < targetHour + 2;
    });

    const totalFares = matchingBookings.reduce((sum, b) => sum + (b.final_fare || b.computed_fare || b.estimated_fare || 0), 0);

    return {
      time,
      rides: matchingBookings.length,
      revenue: Math.round(totalFares)
    };
  });

  // Dynamic Terminal Occupancy Distribution
  const terminalDistData = terminals.slice(0, 5).map(t => {
    const driversInTerminal = drivers.filter(d => d.terminal_id === t.id).length;
    return {
      name: t.name.replace(' Terminal', ''),
      value: driversInTerminal > 0 ? driversInTerminal : (t.active_drivers_count || 1)
    };
  });

  const PIE_COLORS = ['#00346F', '#00C1FD', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="page-container" id="dashboard-audit-report">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <TrendingUp size={28} /> Bauang TODA Operations Center
          </h2>
          <p className="page-subtitle">
            Live municipal transport telemetry, tariff regulation compliance, & fleet monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <PDFExportButton
            elementId="dashboard-audit-report"
            filename="PasadaGuide_LGU_Dashboard_Summary"
            title="LGU Transport Telemetry & Operational Summary"
          />
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 18,
        marginBottom: 24
      }}>
        {/* Total Active Fleet */}
        <div 
          className="glass-card" 
          onClick={() => setActiveTab('drivers')}
          style={{ padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Registered Drivers</span>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--info-bg)', color: 'var(--info)' }}>
              <Car size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 10, color: 'var(--text-main)' }}>
            {drivers.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.75rem', color: 'var(--success)' }}>
            <span>{activeDriversCount} active verified</span>
            {pendingDriversCount > 0 && (
              <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                {pendingDriversCount} Pending
              </span>
            )}
          </div>
        </div>

        {/* Total Terminals Managed */}
        <div 
          className="glass-card" 
          onClick={() => setActiveTab('terminals')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>TODA Terminals</span>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <MapPin size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 10, color: 'var(--text-main)' }}>
            {terminals.length}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Barangay route hubs covered
          </div>
        </div>

        {/* Complaints Open */}
        <div 
          className="glass-card" 
          onClick={() => setActiveTab('complaints')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Complaints</span>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 10, color: openComplaintsCount > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
            {openComplaintsCount}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {complaints.filter(c => c.category === 'overcharging').length} Overcharging reports
          </div>
        </div>

        {/* Revenue Regulated */}
        <div 
          className="glass-card" 
          onClick={() => setActiveTab('bookings')}
          style={{ padding: '20px 22px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Computed Fares</span>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--success-bg)', color: 'var(--success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 10, color: 'var(--success)' }}>
            ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {bookings.length} recorded rides
          </div>
        </div>
      </div>

      {/* Main Telemetry & Visual Analytics Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr',
        gap: 20,
        marginBottom: 24
      }}>
        {/* Live Interactive GIS Map */}
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Bauang TODA Live GIS Map</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Terminals (Blue), Coverage Radii (Circles), & Active Tricycles (Green)
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              ● Realtime Sync
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 350, borderRadius: 12, overflow: 'hidden' }}>
            <MapContainer
              center={[16.5333, 120.3333]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Terminals & Coverage */}
              {terminals.map(term => (
                <React.Fragment key={term.id}>
                  <Marker position={[term.lat, term.lng]} icon={terminalIcon}>
                    <Popup>
                      <div style={{ padding: 4 }}>
                        <div style={{ fontWeight: 800, color: '#00346F', fontSize: '0.85rem' }}>{term.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>Code: {term.code || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                          {term.active_drivers_count || 8} Active Drivers
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[term.lat, term.lng]}
                    radius={(term.coverage_radius_km || 3.0) * 1000}
                    pathOptions={{ color: '#004A99', fillColor: '#00C1FD', fillOpacity: 0.08, weight: 1.5 }}
                  />
                </React.Fragment>
              ))}

              {/* Active Drivers */}
              {drivers.filter(d => d.current_lat && d.current_lng).map(d => (
                <Marker key={d.profile_id || d.id} position={[d.current_lat!, d.current_lng!]} icon={driverIcon}>
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        {d.profile?.full_name || 'Driver'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#333' }}>Plate: <strong>{d.plate_number}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>Model: {d.tricycle_model}</div>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>
                        ★ {d.rating ? d.rating.toFixed(1) : '5.0'} Rating
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Charts Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hourly Ride Activity Chart */}
          <div className="glass-card" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>Hourly Ride Demand (Today)</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Passenger trip requests across municipal terminals
            </p>

            <div style={{ flex: 1, minHeight: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rideTrendData}>
                  <defs>
                    <linearGradient id="rideGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C1FD" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00346F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.75rem' }}
                  />
                  <Area type="monotone" dataKey="rides" stroke="#00346F" strokeWidth={2.5} fillOpacity={1} fill="url(#rideGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Terminal Fleet Allocation Pie */}
          <div className="glass-card" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>Terminal Fleet Distribution</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              Tricycle driver distribution by TODA terminal
            </p>

            <div style={{ flex: 1, minHeight: 150, display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={terminalDistData}
                    innerRadius={36}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {terminalDistData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem' }}>
                {terminalDistData.slice(0, 4).map((item, idx) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span style={{ color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    <strong style={{ marginLeft: 'auto' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
