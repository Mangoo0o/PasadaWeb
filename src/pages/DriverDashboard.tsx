import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Power, 
  Navigation, 
  CheckCircle2, 
  Star, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Booking } from '../types/database.types';
import { fetchOpenDispatches, updateBookingStatus } from '../services/bookingService';

interface DriverDashboardProps {
  onOpenAuthModal?: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onOpenAuthModal }) => {
  const { t } = useTranslation();
  const { user, driverProfile, toggleDriverAvailability } = useAuth();

  const isOnline = driverProfile?.is_available ?? true;
  const [openDispatches, setOpenDispatches] = useState<Booking[]>([]);
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [tripState, setTripState] = useState<'idle' | 'assigned' | 'arrived' | 'in_transit' | 'completed'>('idle');

  useEffect(() => {
    const loadDispatches = async () => {
      const dispatches = await fetchOpenDispatches();
      setOpenDispatches(dispatches);
    };
    loadDispatches();
    const interval = setInterval(loadDispatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptBooking = async (booking: Booking) => {
    setActiveTrip(booking);
    setTripState('assigned');
    await updateBookingStatus(booking.id, 'driver_assigned', driverProfile?.id);
  };

  const handleArrivePickup = async () => {
    setTripState('arrived');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'driver_arrived');
    }
  };

  const handleStartTrip = async () => {
    setTripState('in_transit');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'in_transit');
    }
  };

  const handleCompleteTrip = async () => {
    setTripState('completed');
    if (activeTrip) {
      await updateBookingStatus(activeTrip.id, 'completed', driverProfile?.id, activeTrip.estimated_fare);
    }
    setTimeout(() => {
      setActiveTrip(null);
      setTripState('idle');
    }, 2500);
  };

  if (!user || user.role !== 'driver') {
    return (
      <div className="w-full max-w-md mx-auto text-center pt-16 pb-24 px-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#fcd400] text-[#003f87] flex items-center justify-center mx-auto shadow-lg">
          <Bike className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-on-background">
          Bauang Driver Portal
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Mag-login bilang rehistradong tricycle driver ng Bauang upang makatanggap ng dispatch at pasahero.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 bg-[#003f87] text-white font-black text-xs rounded-xl hover:bg-[#002f66] transition-colors shadow-md active:scale-95"
        >
          Mag-login Bilang Driver
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pt-4 pb-24 px-4 sm:px-6">
      {/* Driver Status Banner */}
      <div className={`rounded-3xl p-5 text-white transition-all shadow-xl ${
        isOnline 
          ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 shadow-emerald-500/20' 
          : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 shadow-slate-900/20'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                Driver Body #{driverProfile?.body_number || 'N/A'}
              </span>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-medium">
                {driverProfile?.terminal_name || 'Bauang Hub'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {user.full_name}
            </h1>
            <p className="text-xs text-white/90 mt-0.5">
              {isOnline ? 'Online & Handang tumanggap ng pasahero sa Bauang' : 'Naka-offline — Pindutin upang mag-online'}
            </p>
          </div>

          <button
            onClick={toggleDriverAvailability}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${
              isOnline
                ? 'bg-white text-emerald-800 hover:bg-slate-50'
                : 'bg-[#fcd400] text-[#003f87] hover:bg-[#e5be00]'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'Mag-OFFLINE' : 'Mag-ONLINE'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-3 sm:p-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Kita Ngayong Araw
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            ₱{driverProfile?.earnings_today !== undefined ? driverProfile.earnings_today.toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1 font-bold">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{driverProfile?.total_trips ?? 0} na biyahe</span>
          </div>
        </Card>

        <Card className="text-center p-3 sm:p-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Rating
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" />
            <span>{driverProfile?.rating_avg ? driverProfile.rating_avg.toFixed(2) : '5.00'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
            LGU Verified
          </div>
        </Card>

        <Card className="text-center p-3 sm:p-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Katayuan
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#003f87] mt-1">
            {isOnline ? 'Aktibo' : 'Offline'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
            {driverProfile?.terminal_name || 'Terminal'}
          </div>
        </Card>
      </div>

      {/* Dispatch Actions */}
      <div className="space-y-4">
        {activeTrip && tripState !== 'completed' && tripState !== 'idle' ? (
          <Card className="p-5 space-y-4 border-2 border-[#003f87]/30 bg-blue-50/50 dark:bg-slate-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <Badge variant="warning" size="md">
                {tripState === 'assigned' && 'ON THE WAY TO PICKUP'}
                {tripState === 'arrived' && 'ARRIVED AT PICKUP POINT'}
                {tripState === 'in_transit' && 'TRIP IN PROGRESS'}
              </Badge>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold">Regulated Fare</span>
                <div className="text-xl font-black text-[#003f87]">
                  ₱{activeTrip.estimated_fare.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Itinerary */}
            <div className="space-y-2 bg-white dark:bg-slate-900 p-3.5 rounded-2xl text-xs border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#003f87] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Pickup</div>
                  <div className="font-bold text-slate-900 dark:text-white">{activeTrip.origin_name}</div>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-slate-300 ml-1 h-3"></div>
              <div className="flex items-start gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#fcd400] mt-1 shrink-0"></div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400">Destination</div>
                  <div className="font-bold text-slate-900 dark:text-white">{activeTrip.destination_name}</div>
                </div>
              </div>
            </div>

            {/* Progressive Actions */}
            <div className="pt-2">
              {tripState === 'assigned' && (
                <button
                  onClick={handleArrivePickup}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-[#fcd400]" />
                  <span>Nakarating na sa Sakayan (Arrived)</span>
                </button>
              )}

              {tripState === 'arrived' && (
                <button
                  onClick={handleStartTrip}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Bike className="w-4 h-4 text-white" />
                  <span>Simulan ang Byahe (Start Trip)</span>
                </button>
              )}

              {tripState === 'in_transit' && (
                <button
                  onClick={handleCompleteTrip}
                  className="w-full py-3.5 rounded-xl bg-[#003f87] hover:bg-[#002f66] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#fcd400]" />
                  <span>Tapusin ang Byahe at Singilin (₱{activeTrip.estimated_fare.toFixed(2)})</span>
                </button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-5 space-y-4 shadow-md">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Bukas na Pasahero sa Bauang ({openDispatches.length})
            </h3>

            {openDispatches.length > 0 ? (
              <div className="space-y-3">
                {openDispatches.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{bk.origin_name} to {bk.destination_name}</div>
                      <div className="text-[11px] text-slate-500">
                        Distansya: {bk.estimated_distance_km} km • Taripa: <strong className="text-[#003f87]">₱{bk.estimated_fare.toFixed(2)}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptBooking(bk)}
                      className="px-4 py-2 bg-[#003f87] text-white font-black text-xs rounded-xl hover:bg-[#002f66] shadow-sm active:scale-95 transition-all"
                    >
                      Tanggapin
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Walang nakabinbing tawag sa kasalukuyan. Nakaabang sa pila ng terminal...
              </div>
            )}
          </Card>
        )}

        {/* Vehicle Specs */}
        <Card className="p-4 space-y-3 shadow-md">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Rehistradong Tricycle Specs</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">TODA Body Number</span>
              <span className="font-black text-[#003f87]">
                #{driverProfile?.body_number || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">LTO Plate</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {driverProfile?.plate_number || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Modelo</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {driverProfile?.tricycle_model || 'Standard Tricycle'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Katayuan</span>
              <Badge variant={driverProfile?.verification_status === 'verified' ? 'success' : 'warning'} size="sm">
                {driverProfile?.verification_status ? driverProfile.verification_status.toUpperCase() : 'PENDING'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
