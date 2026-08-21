import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bike, 
  Calendar, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Filter
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Booking } from '../types/database.types';
import { fetchUserBookings } from '../services/bookingService';
import { submitComplaint } from '../services/complaintService';

interface HistoryAndReceiptsProps {
  onOpenAuthModal?: () => void;
}

export const HistoryAndReceipts: React.FC<HistoryAndReceiptsProps> = ({ onOpenAuthModal }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [complaintModalBooking, setComplaintModalBooking] = useState<Booking | null>(null);
  const [complaintCategory, setComplaintCategory] = useState('overcharging');
  const [complaintText, setComplaintText] = useState('');
  const [isSuccessComplaint, setIsSuccessComplaint] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (user) {
        const data = await fetchUserBookings(user.id, user.role === 'driver');
        setBookings(data);
        if (data.length > 0) setExpandedId(data[0].id);
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
    }, 1500);
  };

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto text-center pt-16 pb-24 px-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#003f87] text-[#fcd400] flex items-center justify-center mx-auto shadow-lg">
          <Bike className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-on-background">
          Kasaysayan ng Biyahe (History)
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Mag-login upang makita ang iyong mga nakaraang biyahe, resibo, at maitalang pamasahe sa Bauang.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 bg-[#003f87] text-white font-black text-xs rounded-xl hover:bg-[#002f66] transition-colors shadow-md active:scale-95"
        >
          Pumasok (Sign In)
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pt-4 pb-24 px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface">
            Trip History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your recent rides and municipal digital receipts in Bauang
          </p>
        </div>

        <button className="flex items-center gap-1.5 text-[#003f87] font-black text-xs bg-[#fcd400] px-4 py-2 rounded-full hover:bg-[#e5be00] border border-[#d4af00] shadow-sm transition-all active:scale-95">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
      </div>

      {/* History List */}
      <div className="space-y-3.5">
        {bookings.length > 0 ? (
          bookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const fareAmount = b.final_fare || b.estimated_fare;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                {/* Summary Header */}
                <div
                  onClick={() => toggleExpand(b.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#003f87] flex items-center justify-center text-white shrink-0 shadow-md">
                      <Bike className="w-6 h-6 text-[#fcd400]" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                        {b.origin_name} to {b.destination_name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-black text-[#003f87] dark:text-[#fcd400]">
                      ₱{fareAmount.toFixed(2)}
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[10px] mt-1 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{b.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Expandable Digital Receipt */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-4 bg-slate-50 dark:bg-slate-800/50 space-y-3 animate-in fade-in">
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span>Base Fare (First 2.0 km)</span>
                        <span className="font-bold text-slate-900 dark:text-white">₱20.00</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span>Distance Fee ({b.estimated_distance_km} km)</span>
                        <span className="font-bold text-slate-900 dark:text-white">₱{(fareAmount - 20).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-slate-200 dark:border-slate-700 mt-1 font-bold text-sm">
                        <span className="text-slate-900 dark:text-white">Total Paid</span>
                        <span className="text-[#003f87] dark:text-[#fcd400] text-base font-black">₱{fareAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Colorful Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-[#fcd400]" />
                        <span>Download PDF</span>
                      </button>

                      <button
                        onClick={() => setComplaintModalBooking(b)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        <span>Maghain ng Reklamo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            Wala pang naitatalang biyahe sa iyong account. Mag-book ng iyong unang biyahe sa Pasada tab!
          </div>
        )}
      </div>

      {/* Complaint Modal */}
      <Modal
        isOpen={Boolean(complaintModalBooking)}
        onClose={() => setComplaintModalBooking(null)}
        title="Maghain ng Reklamo / Report Issue"
      >
        <div className="space-y-4 text-xs">
          {isSuccessComplaint ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-black text-slate-900">
                Naisumite ang Reklamo sa TODA Desk!
              </h3>
              <p className="text-slate-500">
                Iimbestigahan ng Bauang Municipal Transport Office ang driver #{complaintModalBooking?.driver?.body_number}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Uri ng Reklamo (Complaint Category)
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold"
                >
                  <option value="overcharging">Overcharging / Sobrang Singil</option>
                  <option value="refusal_of_service">Refusal of Service / Pagtanggi sa Pasahero</option>
                  <option value="reckless_driving">Reckless Driving / Mapanganib na Pagpapatakbo</option>
                  <option value="rude_behavior">Rude Behavior / Pambabastos</option>
                  <option value="lost_item">Lost Item / Naiwang Gamit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Paliwanag / Description
                </label>
                <textarea
                  rows={3}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Ilarawan ang detalye ng pangyayari..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#003f87]"
                />
              </div>

              <button
                onClick={handleFileComplaint}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all active:scale-95"
              >
                Isumite ang Reklamo sa TODA
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
