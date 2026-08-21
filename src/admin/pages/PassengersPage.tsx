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
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Users size={28} /> Passenger Directory
          </h2>
          <p className="page-subtitle">
            Registered passenger profiles, language preferences, and commuter records.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search passenger name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Passenger Name</th>
              <th>Email Address</th>
              <th>Phone Contact</th>
              <th>Language Preference</th>
              <th>Account Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No passenger records found.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#00346F',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {p.full_name ? p.full_name.charAt(0) : 'P'}
                      </div>
                      <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.email || 'N/A'}</td>
                  <td>{p.phone_number || p.phone || 'N/A'}</td>
                  <td>
                    <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                      <Globe size={12} /> {p.language_pref || 'fil'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      <Shield size={12} /> Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
