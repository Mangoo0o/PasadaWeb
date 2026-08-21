import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Compass, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Heart, 
  QrCode,
  Sparkles
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { TouristSpot } from '../types/database.types';
import { fetchTouristSpots } from '../services/touristService';

export const TouristGuide: React.FC = () => {
  const { i18n } = useTranslation();
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeAudioSpotId, setActiveAudioSpotId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    const loadSpots = async () => {
      setIsLoading(true);
      const data = await fetchTouristSpots();
      setSpots(data);
      setIsLoading(false);
    };
    loadSpots();
  }, []);

  const categories = [
    { id: 'all', label: 'Lahat (All)' },
    { id: 'nature', label: 'Grape Farms' },
    { id: 'recreation', label: 'Beaches' },
    { id: 'historical', label: 'Churches' },
    { id: 'food', label: 'Town Plaza' },
  ];

  const filteredSpots = selectedCategory === 'all'
    ? spots
    : spots.filter(s => s.category === selectedCategory);

  const toggleAudio = (id: string) => {
    setActiveAudioSpotId(prev => prev === id ? null : id);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const featuredSpot = filteredSpots.length > 0 ? filteredSpots[0] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pt-4 pb-24 px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-background">
            Galugarin ang Bauang <br />
            <span className="text-[#003f87] text-base sm:text-lg font-bold opacity-90 block mt-0.5">
              Explore Attractions & Heritage
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tuklasin ang mga tanyag na ubasan, dalampasigan, at makasaysayang pook mula sa database.
          </p>
        </div>

        {spots.length > 0 && (
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#003f87] text-white font-black text-xs shadow-md hover:bg-[#002f66] transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4 text-[#fcd400]" />
            <span>Scan Spot QR</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-black text-xs transition-all shadow-sm ${
              selectedCategory === cat.id
                ? 'bg-[#003f87] text-white shadow-blue-900/20'
                : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading or Empty State */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-semibold">
          Kinukuha ang mga tourist spots mula sa Supabase database...
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
            Walang Nakitang Tourist Spot sa Database
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            I-execute ang migration o seed SQL file sa Supabase SQL Editor upang maglagay ng tourist attractions.
          </p>
        </div>
      ) : (
        /* Bento Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Featured Card */}
          {featuredSpot && (
            <div className="md:col-span-2 relative rounded-3xl overflow-hidden shadow-lg group h-72 md:h-80 border border-slate-200">
              <div
                className="absolute inset-0 bg-cover bg-center w-full h-full transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url('${featuredSpot.cover_image_url || ''}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>

              <div className="absolute top-4 left-4">
                <span className="bg-[#fcd400] text-[#003f87] text-xs font-black px-3.5 py-1 rounded-full shadow-md border border-amber-300">
                  ⭐ Featured Attraction
                </span>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col justify-end text-white">
                <h3 className="text-xl sm:text-2xl font-black mb-1 drop-shadow">
                  {featuredSpot.name}
                </h3>
                <p className="text-xs text-white/90 line-clamp-2 mb-3 max-w-lg">
                  {featuredSpot.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#fcd400] font-black flex items-center gap-1">
                    <span>Taripa: ₱{featuredSpot.est_tricycle_fare.toFixed(2)} mula {featuredSpot.nearest_terminal_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {featuredSpot.audio_url && (
                      <button
                        onClick={() => toggleAudio(featuredSpot.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        {activeAudioSpotId === featuredSpot.id ? <VolumeX className="w-4 h-4 text-[#fcd400]" /> : <Volume2 className="w-4 h-4 text-[#fcd400]" />}
                        <span>{activeAudioSpotId === featuredSpot.id ? 'Pause Tour' : 'Play Tour'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Cards */}
          {filteredSpots.slice(1).map((spot) => {
            const isPlaying = activeAudioSpotId === spot.id;
            const isFav = favorites.includes(spot.id);

            return (
              <div
                key={spot.id}
                className="rounded-3xl overflow-hidden shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col group hover:shadow-lg transition-all"
              >
                <div className="h-44 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {spot.cover_image_url && (
                    <img
                      src={spot.cover_image_url}
                      alt={spot.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <button
                    onClick={() => toggleFavorite(spot.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                  <div className="absolute bottom-2 left-3 bg-[#fcd400] text-[#003f87] font-black px-2.5 py-0.5 rounded-full text-[10px] shadow-sm border border-amber-300">
                    ₱{spot.est_tricycle_fare.toFixed(2)} taripa
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow justify-between space-y-2.5">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white mb-1 line-clamp-1">
                      {spot.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {i18n.language === 'fil' && spot.tagalog_description ? spot.tagalog_description : spot.description}
                    </p>
                  </div>

                  {spot.audio_url && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => toggleAudio(spot.id)}
                        className="w-full bg-gradient-to-r from-[#003f87] to-blue-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:from-[#002f66] hover:to-[#003f87] transition-all shadow-md active:scale-95"
                      >
                        {isPlaying ? <VolumeX className="w-4 h-4 text-[#fcd400]" /> : <Volume2 className="w-4 h-4 text-[#fcd400]" />}
                        <span>{isPlaying ? 'Stop Audio' : 'Audio Tour Guide'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Bauang Tourist Spot QR Plaque"
      >
        <div className="space-y-4 text-center text-xs">
          <div className="w-40 h-40 mx-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white border-2 border-dashed border-[#fcd400] p-4">
            <QrCode className="w-10 h-10 text-[#fcd400] mb-2 animate-pulse" />
            <span className="text-[10px] text-slate-400">Scan QR landmark plaque</span>
          </div>

          <div className="text-slate-500">
            Pumili sa mga spot mula sa database:
          </div>

          <div className="grid grid-cols-2 gap-2">
            {spots.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveAudioSpotId(s.id);
                  setIsQrModalOpen(false);
                }}
                className="p-2.5 rounded-xl bg-blue-50 text-[#003f87] font-black text-xs text-left hover:bg-[#003f87] hover:text-white transition-colors line-clamp-1 border border-blue-200"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
