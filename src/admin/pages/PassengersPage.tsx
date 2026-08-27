import React, { useState } from 'react';
import { Users, Globe, Shield } from 'lucide-react';
import type { Profile } from '../types';

interface PassengersPageProps {
  passengers: Profile[];
}

export const PassengersPage: React.FC<PassengersPageProps> = ({ passengers }) => {
  const [search, setSearch] = useState('');

  const filtered = passengers.filter(p => {
    const name = p.full_name?.toLowerCase() || '';
    const email = p.email?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  return (
    <div className="page-container p-6 sm:p-8 space-y-6">
      {/* Stitch Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <Users size={24} />
            </span>
            <span>Passenger Directory</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Registered commuter profiles, regional language preferences, and account records.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search passenger name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 h-10 pl-4 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 transition-all ambient-shadow"
          />
        </div>
      </div>

      {/* Stitch Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Passenger Name</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Phone Contact</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Language</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Registered Date</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    No passenger records found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{p.full_name || 'Anonymous Passenger'}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {p.email || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300 font-medium">
                      {p.phone_number || p.phone || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 uppercase border border-sky-200">
                        <Globe size={11} /> {p.language_pref || 'fil'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
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
