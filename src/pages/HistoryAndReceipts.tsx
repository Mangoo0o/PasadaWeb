import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  ArrowLeft,
  MessageSquareWarning,
  User,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/common/Modal';
import { Booking } from '../types/database.types';
import { fetchUserBookings } from '../services/bookingService';
import { submitComplaint } from '../services/complaintService';

interface HistoryAndReceiptsProps {
  onOpenAuthModal?: () => void;
  setActiveTab?: (tab: string) => void;
}

export const HistoryAndReceipts: React.FC<HistoryAndReceiptsProps> = ({ setActiveTab }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Complaint modal
  const [complaintModalBooking, setComplaintModalBooking] = useState<Booking | null>(null);
  const [complaintCategory, setComplaintCategory] = useState('overcharging');
  const [complaintText, setComplaintText] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [isSuccessComplaint, setIsSuccessComplaint] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const data = await fetchUserBookings(user.id, user.role === 'driver');
          setBookings(data);
        } catch (err) {
          console.error('Error loading history:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadHistory();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleFileComplaint = async () => {
    if (!user) return;
    if (!complaintText.trim()) {
      setComplaintError('Pakilagay ang detalye ng iyong reklamo.');
      return;
    }

    setComplaintError(null);
    setIsSubmittingComplaint(true);

    const res = await submitComplaint({
      passengerId: user.id,
      driverId: complaintModalBooking?.driver_id || complaintModalBooking?.driver?.id,
      bookingId: complaintModalBooking?.id,
      category: complaintCategory,
      description: complaintText.trim(),
    });

    setIsSubmittingComplaint(false);

    if (res.success) {
      setIsSuccessComplaint(true);
      setTimeout(() => {
        setIsSuccessComplaint(false);
        setComplaintModalBooking(null);
        setComplaintText('');
        setComplaintError(null);
      }, 1500);
    } else {
      setComplaintError(res.error || 'Hindi naisumite ang reklamo. Pakisubukang muli.');
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto text-center pt-16 pb-20 px-4 space-y-4 font-sans select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#0052d1] text-white flex items-center justify-center mx-auto shadow-md">
          <Bike className="w-7 h-7 text-[#fcd400]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Kasaysayan ng Biyahe (Trip History)
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Mag-login upang makita ang iyong mga nakaraang biyahe sa Bauang.
        </p>
      </div>
    );
  }

  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'all') return true;
    return b.status === filterStatus;
  });

  return (
    <div className="w-full max-w-xl mx-auto space-y-3.5 pt-1 pb-12 font-sans select-none">
      
      {/* 1. Header Bar with Back Button */}
      <div className="flex items-center justify-between gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('profile')}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              title="Bumalik sa Profile"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-[#191c1e] dark:text-white truncate">
              Kasaysayan ng Biyahe & Reklamo
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Opisyal na talaan ng mga biyahe sa Bauang
            </p>
          </div>
        </div>

        {setActiveTab && (
          <button
            onClick={() => setActiveTab('profile')}
            className="px-2.5 py-1 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 text-[10px] font-extrabold hover:bg-[#0052d1]/20 transition-colors cursor-pointer shrink-0"
          >
            Profile Hub
          </button>
        )}
      </div>

      {/* 2. Filter Status Chips */}
      <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800">
        {(['all', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
              filterStatus === status
                ? 'bg-[#0052d1] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {status === 'all' ? 'Lahat' : status === 'completed' ? 'Tapos Na' : 'Kanselado'}
          </button>
        ))}
      </div>

      {/* 3. Full Trips List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-20 rounded-2xl bg-white/60 dark:bg-slate-800/60 animate-pulse border border-slate-200/50" />
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const fareAmount = Number(b.final_fare || b.estimated_fare || 20);
            const dateFormatted = new Date(b.created_at).toLocaleDateString('fil-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={b.id}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Trip Card Summary Row */}
                <div 
                  onClick={() => toggleExpand(b.id)}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0052d1]/10 text-[#0052d1] flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {b.destination_name || 'Bauang Route'}
                      </h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span>Body #{b.driver?.body_number || '0142'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-xs sm:text-sm text-[#0052d1] dark:text-sky-400">
                        ₱{fareAmount.toFixed(2)}
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                        b.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {b.status === 'completed' ? 'Tapos Na' : b.status}
                      </span>
                    </div>

                    <button 
                      type="button" 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Breakdown & Complaint Action (Print Button Removed) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-3.5 py-3 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 animate-in fade-in text-xs">
                    
                    {/* Taripa Breakdown */}
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Base Taripa Fare (Unang 2.0 km)</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">₱20.00</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Distansya ({b.estimated_distance_km} km)</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">
                          ₱{Math.max(0, fareAmount - 20).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-xs">
                        <span className="text-slate-900 dark:text-slate-100">Kabuuang Bayad</span>
                        <span className="text-[#0052d1] dark:text-sky-400 font-black text-sm">₱{fareAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Complaint Action Bar */}
                    <div className="pt-1 flex items-center justify-end">
                      {user.role === 'passenger' && (
                        <button
                          onClick={() => setComplaintModalBooking(b)}
                          className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mag-report / Reklamo sa LGU MTFRB</span>
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
        title="Isumite ang Reklamo sa LGU MTFRB"
      >
        <div className="space-y-3.5 text-xs font-sans">
          {isSuccessComplaint ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Naisumite ang Reklamo sa TODA / MTFRB Desk
              </h3>
              <p className="text-[11px] text-slate-500">
                Iimbestigahan ng Bauang Municipal Transport Office ang driver #{complaintModalBooking?.driver?.body_number || '0142'}.
              </p>
            </div>
          ) : (
            <>
              {complaintError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                  {complaintError}
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Inirereklamong Driver</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                    Body #{complaintModalBooking?.driver?.body_number || '0142'} (Tricycle)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Destinasyon</span>
                  <span className="font-bold text-[#0052d1] text-xs">
                    {complaintModalBooking?.destination_name || 'Bauang Route'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategorya ng Reklamo
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-[#0052d1]"
                >
                  <option value="overcharging">Overcharging / Sobrang Singil sa Pamasahe</option>
                  <option value="refusal_of_service">Refusal of Service / Pagtanggi sa Pasahero</option>
                  <option value="reckless_driving">Reckless Driving / Mapanganib na Pagpapatakbo</option>
                  <option value="rude_behavior">Rude Behavior / Pambabastos o Pagmumura</option>
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
                  placeholder="Ilarawan ang detalye ng nangyari sa biyahe..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-[#0052d1]"
                />
              </div>

              <button
                onClick={handleFileComplaint}
                disabled={isSubmittingComplaint}
                className="w-full py-3 rounded-xl bg-[#0052d1] hover:bg-[#206afa] text-white font-bold text-xs shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingComplaint ? 'Isinusumite...' : 'Isumite ang Reklamo sa LGU Desk'}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
