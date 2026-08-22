import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Calendar, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Printer
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/common/Modal';
import { Booking } from '../types/database.types';
import { fetchUserBookings } from '../services/bookingService';
import { submitComplaint } from '../services/complaintService';

interface HistoryAndReceiptsProps {
  onOpenAuthModal?: () => void;
}

export const HistoryAndReceipts: React.FC<HistoryAndReceiptsProps> = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Complaint modal
  const [complaintModalBooking, setComplaintModalBooking] = useState<Booking | null>(null);
  const [complaintCategory, setComplaintCategory] = useState('overcharging');
  const [complaintText, setComplaintText] = useState('');
  const [isSuccessComplaint, setIsSuccessComplaint] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (user) {
        const data = await fetchUserBookings(user.id, user.role === 'driver');
        setBookings(data);
      }
    };
    loadHistory();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleFileComplaint = async () => {
    if (!user) return;
    setIsSuccessComplaint(true);
    await submitComplaint({
      passengerId: user.id,
      driverId: complaintModalBooking?.driver_id,
      bookingId: complaintModalBooking?.id,
      category: complaintCategory,
      description: complaintText,
    });

    setTimeout(() => {
      setIsSuccessComplaint(false);
      setComplaintModalBooking(null);
      setComplaintText('');
    }, 1200);
  };

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto text-center pt-16 pb-20 px-4 space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-[#003f87] text-[#00C1FD] flex items-center justify-center mx-auto shadow-md">
          <Bike className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Kasaysayan ng Biyahe (Trip History)
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Mag-login upang makita ang iyong mga nakaraang biyahe at digital receipts sa Bauang.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-2.5 bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          Mag-login (Sign In)
        </button>
      </div>
    );
  }

  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'completed') return b.status === 'completed';
    if (filterStatus === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="w-full space-y-4 pt-1 pb-6 font-sans">
      
      {/* 1. Simplified Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              Trip History
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-[#003f87] dark:text-[#00C1FD] font-bold text-[10px]">
              {bookings.length} {user.role === 'driver' ? 'Biyahe' : 'Rides'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.role === 'driver' 
              ? 'Talaan ng mga naihatid mong pasahero sa Bauang' 
              : 'Mga nakaraang sakay at opisyal na taripa receipt'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Lahat ({bookings.length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'completed'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Naihatid
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'cancelled'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Kanselado
          </button>
        </div>
      </header>

      {/* 2. Simplified Trip List */}
      <div className="space-y-2.5">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const fareAmount = b.final_fare || b.estimated_fare || 20;
            const isCompleted = b.status === 'completed';
            const isCancelled = b.status === 'cancelled';

            return (
              <div
                key={b.id}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Clickable Card Header */}
                <div
                  onClick={() => toggleExpand(b.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Dot / Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                        : isCancelled 
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'bg-sky-50 dark:bg-sky-950/60 text-[#003f87] dark:text-[#00C1FD]'
                    }`}>
                      <Bike className="w-4 h-4" />
                    </div>

                    {/* Route Details */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {b.origin_name} <span className="text-slate-400 font-normal">➔</span> {b.destination_name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>
                          {new Date(b.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span>{b.estimated_distance_km} km</span>
                        {b.driver?.body_number && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              Body #{b.driver.body_number}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fare & Toggle */}
                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <div>
                      <div className="text-sm sm:text-base font-black text-[#003f87] dark:text-[#00C1FD]">
                        ₱{Number(fareAmount).toFixed(2)}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                        isCompleted ? 'text-emerald-600 dark:text-emerald-400' : isCancelled ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {isCompleted ? 'Naihatid' : isCancelled ? 'Kanselado' : b.status}
                      </span>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Simplified Expandable Receipt */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 animate-in fade-in text-xs">
                    
                    {/* Taripa Breakdown */}
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Base Fare (Unang 2.0 km)</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">₱20.00</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Distansya ({b.estimated_distance_km} km)</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">
                          ₱{Math.max(0, fareAmount - 20).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-xs">
                        <span className="text-slate-900 dark:text-slate-100">Kabuuang Pamasahe</span>
                        <span className="text-[#003f87] dark:text-[#00C1FD] font-black text-sm">₱{Number(fareAmount).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Simple Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print Receipt</span>
                      </button>

                      {user.role === 'passenger' && (
                        <button
                          onClick={() => setComplaintModalBooking(b)}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Mag-report</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300">
              Walang nahanap na biyahe
            </h3>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {filterStatus !== 'all' 
                ? 'Walang biyahe na tumutugma sa napiling filter.' 
                : 'Wala pang naitatalang biyahe sa iyong account sa kasalukuyan.'}
            </p>
          </div>
        )}
      </div>

      {/* Complaint / Report Modal */}
      <Modal
        isOpen={Boolean(complaintModalBooking)}
        onClose={() => setComplaintModalBooking(null)}
        title="Mag-report ng Problema / Reklamo"
      >
        <div className="space-y-4 text-xs">
          {isSuccessComplaint ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Naisumite ang Reklamo sa TODA Desk
              </h3>
              <p className="text-[11px] text-slate-500">
                Iimbestigahan ng Bauang Municipal Transport Office ang driver #{complaintModalBooking?.driver?.body_number || '0142'}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategorya ng Reklamo
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-[#003f87]"
                >
                  <option value="overcharging">Overcharging / Sobrang Singil</option>
                  <option value="refusal_of_service">Refusal of Service / Pagtanggi sa Pasahero</option>
                  <option value="reckless_driving">Reckless Driving / Mapanganib na Pagpapatakbo</option>
                  <option value="rude_behavior">Rude Behavior / Pambabastos</option>
                  <option value="lost_item">Lost Item / Naiwang Gamit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detalye ng Pangyayari
                </label>
                <textarea
                  rows={3}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Ilarawan ang nangyari sa biyahe..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-[#003f87]"
                />
              </div>

              <button
                onClick={handleFileComplaint}
                className="w-full py-2.5 rounded-xl bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                Isumite sa TODA Office
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
