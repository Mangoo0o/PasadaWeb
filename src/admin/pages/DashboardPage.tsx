import React from 'react';
import { 
  Car, AlertTriangle, MapPin, TrendingUp 
} from 'lucide-react';

const PesoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M7 4h7a5 5 0 0 1 0 10H7V4z" />
    <path d="M7 14v7" />
    <line x1="4" y1="8" x2="17" y2="8" />
    <line x1="4" y1="11" x2="17" y2="11" />
  </svg>
);
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { HourlyDemandBarChart } from '../components/charts/HourlyDemandBarChart';
import { FleetDistributionPieChart } from '../components/charts/FleetDistributionPieChart';
import type { Terminal, Driver, Booking, Complaint, LocationFare } from '../types';
import { getLocationIconEmoji } from '../../services/fareService';


// Fix Leaflet marker icon asset issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Driver Marker Icon
const driverIcon = L.divIcon({
  className: 'custom-driver-marker',
  html: `<div style="background:#10b981;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;border:2px solid #fff;box-shadow:0 0 8px rgba(16,185,129,0.6);">🛺</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

// Custom Location Landmark Marker Icon
const createLocationPin = (loc: LocationFare) => {
  const emoji = getLocationIconEmoji(loc.icon, loc.location_name);
  return L.divIcon({
    className: 'dashboard-loc-pin',
    html: `<div style="background:#0052d1;color:#ffffff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #ffffff;box-shadow:0 3px 10px rgba(0,82,209,0.45);cursor:pointer;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

interface DashboardPageProps {
  terminals: Terminal[];
  drivers: Driver[];
  bookings: Booking[];
  complaints: Complaint[];
  locationFares?: LocationFare[];
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  terminals, drivers, bookings, complaints, locationFares = [], setActiveTab 
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

  // Fleet Distribution (by terminal or active driver status)
  const terminalDistData = terminals.length > 0
    ? terminals.slice(0, 5).map(t => {
        const driversInTerminal = drivers.filter(d => d.terminal_id === t.id).length;
        return {
          name: t.name.replace(' Terminal', ''),
          value: driversInTerminal > 0 ? driversInTerminal : (t.active_drivers_count || 1)
        };
      })
    : [
        { name: 'Active (Approved)', value: Math.max(activeDriversCount, 1) },
        { name: 'Pending Verification', value: Math.max(pendingDriversCount, 0) },
        { name: 'Live On-Duty', value: Math.max(drivers.filter(d => d.current_lat).length, 1) }
      ].filter(item => item.value > 0);

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="dashboard-audit-report">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <TrendingUp size={24} />
            </span>
            <span>Bauang TODA Operations Center</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time overview of municipal transit network, tariff regulation, &amp; fleet monitoring.
          </p>
        </div>


      </div>

      {/* Stitch 4 Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Drivers */}
        <div 
          onClick={() => setActiveTab('drivers')}
          className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="w-11 h-11 bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
            <Car size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Registered Drivers</p>
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/70 dark:border-emerald-800 shrink-0">
                <TrendingUp size={11} /> {activeDriversCount > 0 ? `${Math.round((activeDriversCount / (drivers.length || 1)) * 100)}% Active` : 'Live'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {drivers.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {pendingDriversCount > 0 ? `${pendingDriversCount} pending verification` : 'All operators verified'}
            </p>
          </div>
        </div>

        {/* Card 2: Regulated Locations */}
        <div 
          onClick={() => setActiveTab('fare-matrix')}
          className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="w-11 h-11 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
            <MapPin size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Regulated Locations</p>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                Bauang LGU
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">
              {locationFares.length > 0 ? `${locationFares.length} Locations` : '10 Locations'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Active proximity tariff destinations
            </p>
          </div>
        </div>

        {/* Card 3: Active Complaints */}
        <div 
          onClick={() => setActiveTab('complaints')}
          className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="w-11 h-11 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Complaints</p>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200/70 dark:border-rose-800 shrink-0">
                {openComplaintsCount} Open
              </span>
            </div>
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none my-1 ${openComplaintsCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {openComplaintsCount}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {complaints.filter(c => c.category === 'overcharging').length} Overcharging reports
            </p>
          </div>
        </div>

        {/* Card 4: Computed Fares (Today) */}
        <div 
          onClick={() => setActiveTab('bookings')}
          className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
            <PesoIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Computed Fares (Today)</p>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/70 dark:border-emerald-800 shrink-0">
                Tariff Regulated
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">
              ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Across {bookings.length} recorded rides
            </p>
          </div>
        </div>
      </div>

      {/* Stitch Bento Grid: Map + Right Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8-col: Regulated Locations Map */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden relative flex flex-col min-h-[480px]">
          {/* Floating Glass Panel */}
          <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-lg p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-md pointer-events-auto">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">Regulated Locations</h3>
            <p className="text-[11px] text-slate-500 font-medium">Live view of Bauang TODA operations</p>
          </div>

          <div className="w-full h-full min-h-[480px] flex-1 relative">
            <MapContainer
              center={[16.5333, 120.3333]}
              zoom={13}
              zoomControl={false}
              style={{ height: '100%', width: '100%', minHeight: '480px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Regulated Places & Landmarks */}
              {locationFares.map(loc => (
                <Marker 
                  key={`loc-${loc.id}`} 
                  position={[loc.lat, loc.lng]} 
                  icon={createLocationPin(loc)}
                >
                  <Popup>
                    <div className="p-1 min-w-[150px]">
                      <div className="font-bold text-[#0052d1] text-xs">{loc.location_name}</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                        Regulated Fare: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">₱{Number(loc.standard_fare).toFixed(2)}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{loc.notes || 'Regulated Destination'}</div>
                      <button
                        onClick={() => setActiveTab('fare-matrix')}
                        className="mt-2 text-[10px] text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer block"
                      >
                        View in Fare Matrix →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Live Driver Locations */}
              {drivers.filter(d => d.current_lat && d.current_lng).map(d => (
                <Marker key={d.profile_id || d.id} position={[d.current_lat!, d.current_lng!]} icon={driverIcon}>
                  <Popup>
                    <div className="p-1">
                      <div className="font-black text-xs text-slate-900">
                        {d.profile?.full_name || 'Driver'}
                      </div>
                      <div className="text-[10px] text-slate-600">Plate: <strong>{d.plate_number}</strong></div>
                      <div className="text-[10px] text-slate-500">Model: {d.tricycle_model}</div>
                      <div className="text-[10px] text-amber-500 font-bold mt-0.5">
                        ★ {d.rating ? d.rating.toFixed(1) : '5.0'} Rating
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right 4-col: Charts (TailAdmin Style) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Hourly Ride Demand (TailAdmin Bar Chart 2) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Hourly Ride Demand</h3>
                <p className="text-[11px] text-slate-400 font-medium">Passenger trips &amp; fare revenue index</p>
              </div>
              <span className="text-[10px] font-bold text-[#0052d1] dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/70 dark:border-blue-800 shrink-0">
                Today
              </span>
            </div>

            <div className="flex-1 min-h-[190px] w-full mt-1">
              <HourlyDemandBarChart data={rideTrendData} />
            </div>
          </div>

          {/* Terminal Fleet Distribution (TailAdmin Pie / Donut Chart) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Fleet Distribution</h3>
                <p className="text-[11px] text-slate-400 font-medium">Driver allocation by TODA</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                Terminals
              </span>
            </div>

            <div className="flex-1 min-h-[145px] flex items-center justify-between">
              <FleetDistributionPieChart data={terminalDistData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
