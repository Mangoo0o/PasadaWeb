import React, { useState } from 'react';
import { Users, Globe, Shield, Search, X, Percent, CheckCircle } from 'lucide-react';
import type { Profile } from '../types';

interface PassengersPageProps {
  passengers: Profile[];
}

export const PassengersPage: React.FC<PassengersPageProps> = ({ passengers }) => {
  const [search, setSearch] = useState('');
  const [filterTariff, setFilterTariff] = useState<string>('all');

  const regularCount = passengers.filter(p => !p.passenger_type || p.passenger_type === 'regular' || (!p.is_discount_eligible && p.passenger_type !== 'student' && p.passenger_type !== 'senior' && p.passenger_type !== 'pwd')).length;
  const discountedCount = passengers.filter(p => p.is_discount_eligible || p.passenger_type === 'student' || p.passenger_type === 'senior' || p.passenger_type === 'pwd').length;

  const filtered = passengers.filter(p => {
    const name = p.full_name?.toLowerCase() || '';
    const email = p.email?.toLowerCase() || '';
    const phone = (p.phone_number || p.phone || '').toLowerCase();
    const type = (p.passenger_type || (p.is_discount_eligible ? 'discounted' : 'regular')).toLowerCase();
    
    const matchesSearch = name.includes(search.toLowerCase()) || 
                          email.includes(search.toLowerCase()) || 
                          phone.includes(search.toLowerCase()) ||
                          type.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTariff === 'regular') {
      return !p.is_discount_eligible && (type === 'regular' || !p.passenger_type);
    }
    if (filterTariff === 'discounted') {
      return p.is_discount_eligible || type === 'student' || type === 'senior' || type === 'pwd';
    }
    return true;
  });

  const getTariffBadge = (p: Profile) => {
    const type = p.passenger_type || (p.is_discount_eligible ? 'discounted' : 'regular');
    switch (type) {
      case 'student':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Percent size={10} /> Student (20% Off)
          </span>
        );
      case 'senior':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Percent size={10} /> Senior (20% Off)
          </span>
        );
      case 'pwd':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Percent size={10} /> PWD (20% Off)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Regular Fare
          </span>
        );
    }
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="passengers-directory-report">
      {/* Stitch Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-1.5 sm:p-2 rounded-md bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <Users size={20} />
            </span>
            <span>Passenger Directory</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Registered commuter profiles, regional language preferences, and tariff discount classifications.
          </p>
        </div>
      </div>

      {/* Content Container: Unified Filter Row & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        {/* Unified Top Filter Row: Tabs on Left, Search on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/40 gap-3 py-1 sm:py-0">
          {/* Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 sm:gap-2">
            {[
              { id: 'all', label: 'All Commuters', count: passengers.length },
              { id: 'regular', label: 'Regular Fare', count: regularCount },
              { id: 'discounted', label: 'Discount Eligible', count: discountedCount },
            ].map((tab) => {
              const isTabActive = filterTariff === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTariff(tab.id)}
                  className={`px-3.5 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isTabActive
                      ? 'border-[#0052d1] text-[#0052d1] dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      tab.id === 'discounted' && tab.count > 0
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search Input & Match Counter */}
          <div className="flex items-center gap-3 py-2 shrink-0">
            <span className="hidden md:inline text-xs text-slate-400 font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'commuter' : 'commuters'}
            </span>
            <div className="relative w-64 max-w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search commuter name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-[#0052d1] focus:ring-1 focus:ring-[#0052d1]/20 transition-all text-slate-800 dark:text-slate-100 shadow-xs placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passenger Name</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tariff Status</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Contact</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Language</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Date</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No passenger records found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{p.full_name || 'Anonymous Passenger'}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      {getTariffBadge(p)}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {p.email || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300 font-medium">
                      {p.phone_number || p.phone || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 uppercase border border-sky-200">
                        <Globe size={11} /> {p.language_pref || 'fil'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px] tabular-nums">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                        <Shield size={11} /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
