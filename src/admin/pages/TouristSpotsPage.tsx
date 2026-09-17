import React, { useState, useEffect } from 'react';
import { Compass, Plus, Edit, QrCode, Check, Crosshair, MapPin, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TouristSpot } from '../types';
import { FileUploader } from '../components/ui/FileUploader';

interface TouristSpotsPageProps {
  spots: TouristSpot[];
  onAddSpot: (spot: TouristSpot) => void;
  onUpdateSpot: (spot: TouristSpot) => void;
}

const spotMarkerIcon = L.divIcon({
  className: 'spot-map-marker',
  html: `<div style="background:#006688;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid #00C1FD;box-shadow:0 4px 14px rgba(0,102,136,0.5);cursor:grab;">📍</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function SpotModalMapLocationPicker({
  lat,
  lng,
  onLocationChange
}: {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <MapInvalidateSize />
      <Marker
        position={[lat, lng]}
        icon={spotMarkerIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
          },
        }}
      >
        <Popup>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
            📍 Pinned Destination Point<br />
            <span style={{ color: '#006688' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export const TouristSpotsPage: React.FC<TouristSpotsPageProps> = ({ 
  spots, onAddSpot, onUpdateSpot 
}) => {
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [lat, setLat] = useState(16.5410);
  const [lng, setLng] = useState(120.3720);
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('fil');
  const [category, setCategory] = useState('Agritourism');

  const handleOpenAdd = () => {
    setSelectedSpot(null);
    setName('');
    setDescription('');
    setOpeningHours('08:00 AM - 05:00 PM');
    setLat(16.5410);
    setLng(120.3720);
    setAudioUrl('');
    setLanguage('fil');
    setCategory('Agritourism');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: TouristSpot) => {
    setSelectedSpot(s);
    setName(s.name);
    setDescription(s.description);
    setOpeningHours(s.opening_hours);
    setLat(s.lat);
    setLng(s.lng);
    setAudioUrl(s.audio_url || '');
    setLanguage(s.language || 'fil');
    setCategory(s.category || 'Agritourism');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSpot) {
      onUpdateSpot({
        ...selectedSpot,
        name,
        description,
        opening_hours: openingHours,
        lat,
        lng,
        audio_url: audioUrl,
        language,
        category
      });
    } else {
      onAddSpot({
        id: `ts-${Date.now()}`,
        name,
        description,
        opening_hours: openingHours,
        lat,
        lng,
        qr_code_ref: `PASADA-SPOT-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        audio_url: audioUrl,
        language,
        category
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-1.5 sm:p-2 rounded-md bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <Compass size={20} />
            </span>
            <span>Tourist Attractions &amp; Audio Guide</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Manage Bauang tourism destinations, upload official spoken audio guides, &amp; generate QR landmarks.
          </p>
        </div>

        <button 
          onClick={handleOpenAdd} 
          className="h-9 px-3.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs border border-transparent transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs shrink-0"
        >
          <Plus size={15} /> Add Tourist Destination
        </button>
      </div>

      {/* Spots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spots.length === 0 ? (
          <div className="col-span-full text-center p-12 text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow">
            No tourist destinations registered in database yet.
          </div>
        ) : (
          spots.map((spot) => (
            <div 
              key={spot.id} 
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200"
            >
              {(spot.cover_image_url || spot.image_url) && (
                <div className="h-44 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={spot.cover_image_url || spot.image_url}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold uppercase">
                    {spot.category || 'Attraction'}
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {spot.name}
                    </h3>
                    <button
                      onClick={() => { setSelectedSpot(spot); setIsQRModalOpen(true); }}
                      className="w-8 h-8 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Generate QR Signage"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {spot.description}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 space-y-1 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>⏰ Hours: <strong className="text-slate-700 dark:text-slate-300">{spot.opening_hours}</strong></div>
                    <div>🌐 Language: <strong className="text-slate-700 dark:text-slate-300 uppercase">{spot.language || 'fil'}</strong></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      📍 {spot.lat.toFixed(3)}, {spot.lng.toFixed(3)}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(spot)}
                      className="h-8 px-3 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Edit size={13} /> Edit Spot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Destination Modal with 2-Column Layout */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content max-w-4xl w-[94%]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Compass size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedSpot ? 'Edit Destination Details' : 'Register New Tourist Landmark'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pin landmark coordinates, upload spoken audio guides, and configure municipal explore showcase.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* LEFT COLUMN: Map Pin Picker */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Crosshair size={15} className="text-[#0052d1] dark:text-sky-400" />
                        <span>Pin Landmark on Map</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Drag pin or click map
                      </span>
                    </div>

                    <div className="h-72 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
                      <MapContainer
                        center={[lat, lng]}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <SpotModalMapLocationPicker
                          lat={lat}
                          lng={lng}
                          onLocationChange={(newLat, newLng) => {
                            setLat(newLat);
                            setLng(newLng);
                          }}
                        />
                      </MapContainer>
                    </div>

                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Coordinates: <strong className="text-slate-900 dark:text-white font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
                      <span>Category: <strong className="text-[#0052d1] dark:text-sky-400">{category}</strong></span>
                    </div>

                    <div className="pt-1">
                      <FileUploader
                        bucketName="tourist-audio"
                        accept="audio/*,.mp3,.wav,.m4a"
                        label="Spoken Audio Guide (MP3/WAV)"
                        currentUrl={audioUrl}
                        onUploadComplete={(url) => setAudioUrl(url)}
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Destination Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Lomboy Grape Farm, Bauang Beach"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#0052d1] cursor-pointer"
                      >
                        <option value="Agritourism">Agritourism / Grape Picking</option>
                        <option value="Beach &amp; Nature">Beach &amp; Nature</option>
                        <option value="Heritage Site">Heritage Site / Historical Church</option>
                        <option value="Food &amp; Culture">Food &amp; Culture</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Description &amp; Heritage Notes *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed history, cultural background, and visitor highlights..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1] resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Opening Hours *
                      </label>
                      <input
                        type="text"
                        required
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        placeholder="e.g. 07:00 AM - 05:00 PM Daily"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lat}
                          onChange={(e) => setLat(parseFloat(e.target.value))}
                          className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={lng}
                          onChange={(e) => setLng(parseFloat(e.target.value))}
                          className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0052d1]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="h-9 px-3.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs cursor-pointer inline-flex items-center transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Check size={15} /> Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Signage Export Modal */}
      {isQRModalOpen && selectedSpot && (
        <div className="modal-overlay" onClick={() => setIsQRModalOpen(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <QrCode size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Official QR Landmark Signage
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    {selectedSpot.name}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsQRModalOpen(false)} 
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body text-center bg-slate-50 dark:bg-slate-900/50 p-6 space-y-4">
              <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3 inline-block mx-auto max-w-xs w-full">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#0052d1] dark:text-sky-400">
                  PASADAGUIDE MUNICIPAL TOURISM
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedSpot.name}
                </div>

                <div className="p-4 bg-white rounded-md border-2 border-slate-200 inline-block shadow-inner">
                  <QRCodeSVG
                    value={`https://pasadaguide.ph/spot/${selectedSpot.id}`}
                    size={180}
                    level="H"
                  />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Scan for audio guide &amp; fare matrix
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Print and mount this official QR plaque at the destination gate for direct commuter audio playback and regulated tariff calculation.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="h-9 px-3.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs cursor-pointer inline-flex items-center transition-colors shadow-2xs"
              >
                Print Plaque
              </button>
              <button 
                type="button" 
                onClick={() => setIsQRModalOpen(false)} 
                className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer inline-flex items-center transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
