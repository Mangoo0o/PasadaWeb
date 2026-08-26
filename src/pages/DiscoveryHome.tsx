import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Mic, 
  MicOff,
  MapPin, 
  Volume2, 
  VolumeX, 
  Heart, 
  Bike, 
  Sparkles, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { TouristSpot } from '../types/database.types';
import { fetchTouristSpots } from '../services/touristService';

interface DiscoveryHomeProps {
  setActiveTab: (tab: string) => void;
  onSelectDestination?: (spot: TouristSpot) => void;
}

export const DiscoveryHome: React.FC<DiscoveryHomeProps> = ({ 
  setActiveTab,
  onSelectDestination 
}) => {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeAudioSpotId, setActiveAudioSpotId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pasada_fav_spots') || '[]');
    } catch {
      return [];
    }
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedSpotModal, setSelectedSpotModal] = useState<TouristSpot | null>(null);

  useEffect(() => {
    const loadSpots = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTouristSpots();
        setSpots(data);
      } catch (err) {
        console.error('Error fetching tourist spots:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSpots();
  }, []);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('pasada_fav_spots', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAudio = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveAudioSpotId(prev => (prev === id ? null : id));
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please type your search.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-PH';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleBookRideToSpot = (spot: TouristSpot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onSelectDestination) {
      onSelectDestination(spot);
    }
    // Switch directly to Pasada live booking map tab
    setActiveTab('pasada');
  };

  const categories = [
    { id: 'all', label: 'Must-See' },
    { id: 'hidden', label: 'Hidden Gem' },
    { id: 'food', label: 'Food & Cafe' },
    { id: 'nature', label: 'Grape Farms' },
    { id: 'recreation', label: 'Beaches & Sunset' },
    { id: 'historical', label: 'Churches & Heritage' },
  ];

  const filteredSpots = spots.filter(spot => {
    const matchesSearch = 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === 'all') return true;
    if (activeCategory === 'hidden') return spot.category === 'nature' || spot.category === 'historical';
    return spot.category === activeCategory;
  });

  const featuredSpot = spots.find(s => s.name.toLowerCase().includes('beach')) || spots[0];

  return (
    <div className="min-h-screen bg-[#dbe9f4] text-on-surface font-sans antialiased overflow-x-hidden relative pb-28 select-none">
      {/* Background Watermark Text from Stitch */}
      <div className="travel-bg-text">Travel</div>

      <main className="w-full max-w-lg sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-5 pt-1.5 sm:pt-2.5 pb-8 relative z-10 space-y-3.5 sm:space-y-4">
        {/* Top Header & Greeting */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#0052d1] uppercase tracking-wider truncate">
              <Sparkles className="w-3.5 h-3.5 text-[#fcd400] shrink-0" />
              <span className="truncate">Bauang Smart Transit & Discovery</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#191c1e] tracking-tight leading-tight truncate mt-0.5">
              Explore Bauang, LU
            </h1>
          </div>

          <button
            onClick={() => setActiveTab('pasada')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#0052d1] hover:bg-[#206afa] text-white text-[11px] sm:text-xs font-extrabold shadow-md shadow-[#0052d1]/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fcd400]" />
            <span>Sakay Na</span>
          </button>
        </div>

        {/* Search Bar with Mic from Stitch */}
        <div className="relative w-full h-11 sm:h-12 bg-white/85 backdrop-blur-md rounded-full shadow-[0_3px_14px_rgba(0,82,209,0.08)] border border-white/90 flex items-center px-3.5 sm:px-4 gap-2.5 group focus-within:ring-2 focus-within:ring-[#0052d1] transition-all">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-[#0052d1] transition-colors shrink-0" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vibe, place, tag..."
            className="bg-transparent border-none outline-none w-full text-xs sm:text-sm placeholder:text-slate-400 focus:ring-0 p-0 text-[#191c1e] font-medium"
          />
          <button 
            type="button"
            onClick={handleVoiceSearch}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-[#0052d1]'
            }`}
            title="Voice Search"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Category Tags Horizontal Scroll from Stitch */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar py-0.5 -mx-1 px-1">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                  isSelected
                    ? 'bg-[#fcd400] text-[#131b2e] border border-[#fcd400] shadow-sm'
                    : 'bg-white/85 backdrop-blur-sm text-slate-700 hover:bg-white border border-white/70'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Featured Card (Stitch Hero Card: Bauang Beach / Base Camp) */}
        <div 
          onClick={() => featuredSpot && setSelectedSpotModal(featuredSpot)}
          className="relative w-full h-[175px] sm:h-[210px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-[#0052d1]/10 border border-white/50 cursor-pointer group transition-transform active:scale-[0.99]"
        >
          <img 
            src={featuredSpot?.cover_image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'} 
            alt="Bauang Beach" 
            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/75"></div>

          {/* Map Pin Base Camp Badge */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold text-[#0052d1] mb-1 shadow-md uppercase tracking-wider">
              Base Camp
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/30 backdrop-blur-md rounded-full border border-white flex items-center justify-center shadow-lg">
              <MapPin className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Caption & Quick Booking Action */}
          <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3.5 sm:left-4 sm:right-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-white text-[11px] sm:text-xs md:text-sm font-bold leading-tight drop-shadow-sm truncate">
                  Base Camp near{' '}
                  <span className="text-[#fcd400] font-black">{featuredSpot?.name || 'Bauang Beach'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={(e) => featuredSpot && handleBookRideToSpot(featuredSpot, e)}
              className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white text-[#0052d1] font-extrabold text-[11px] sm:text-xs shadow-md hover:bg-sky-50 active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Sakay</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Must-See Today Section (AI Curated Route Carousel) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-[#191c1e] leading-none">
                Must-See Today
              </h2>
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-0.5">
                AI Curated Tricycle Route
              </p>
            </div>
            <button 
              onClick={() => setActiveCategory('all')} 
              className="text-[#0052d1] font-bold text-[11px] sm:text-xs hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>

          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto hide-scrollbar pb-1.5 -mx-1 px-1">
            {isLoading ? (
              [1, 2, 3].map(n => (
                <div key={n} className="w-[125px] h-[170px] sm:w-[145px] sm:h-[190px] rounded-xl sm:rounded-2xl bg-white/60 animate-pulse shrink-0" />
              ))
            ) : spots.length === 0 ? (
              <div className="w-full text-center py-4 text-xs text-slate-500 bg-white/50 rounded-xl">
                Walang nakitang tourist spots.
              </div>
            ) : (
              spots.map((spot) => {
                const isFav = favorites.includes(spot.id);
                return (
                  <div
                    key={`curated-${spot.id}`}
                    onClick={() => setSelectedSpotModal(spot)}
                    className="relative w-[125px] h-[170px] sm:w-[145px] sm:h-[190px] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm shadow-[#0052d1]/10 shrink-0 group cursor-pointer border border-white/50 bg-slate-900"
                  >
                    <img 
                      src={spot.cover_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'} 
                      alt={spot.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/80"></div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(spot.id, e)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/35 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                    >
                      <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>

                    {/* Content Details */}
                    <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
                      <span className="text-[8px] sm:text-[9px] font-extrabold text-[#fcd400] uppercase tracking-wider block">
                        {spot.category === 'nature' ? 'Farm Route' : spot.category === 'historical' ? 'Heritage' : 'Activity'}
                      </span>
                      <p className="text-white text-[11px] sm:text-xs font-bold truncate leading-tight">
                        {spot.name}
                      </p>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[9px] sm:text-[10px] text-white/80 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-sky-300" />
                          {spot.opening_hours?.split(' ')[0] || '8 AM'}
                        </span>
                        <button
                          onClick={(e) => handleBookRideToSpot(spot, e)}
                          className="px-1.5 py-0.5 rounded-full bg-[#0052d1] hover:bg-[#206afa] text-[8px] sm:text-[9px] font-bold text-white shadow-sm flex items-center gap-0.5 cursor-pointer"
                        >
                          <Bike className="w-2.5 h-2.5 text-[#fcd400]" />
                          <span>Punta</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Hidden Gems & Attractions List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm sm:text-base md:text-lg font-black text-[#191c1e] leading-none">
              Hidden Gems Nearby
            </h2>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold">
              {filteredSpots.length} destinations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {filteredSpots.map((spot) => {
              const isFav = favorites.includes(spot.id);
              const isPlaying = activeAudioSpotId === spot.id;

              return (
                <div
                  key={`spot-card-${spot.id}`}
                  onClick={() => setSelectedSpotModal(spot)}
                  className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-2.5 group"
                >
                  {/* Thumbnail with overlay icon */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                    <img 
                      src={spot.cover_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80'} 
                      alt={spot.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={(e) => toggleFavorite(spot.id, e)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                    >
                      <Heart className={`w-2.5 h-2.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#191c1e] truncate leading-tight">
                        {spot.name}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                        {spot.description || 'Sikat na pasyalan at atraksyon sa bayan ng Bauang.'}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 gap-1">
                      <button
                        onClick={(e) => toggleAudio(spot.id, e)}
                        className={`flex items-center gap-0.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all shrink-0 ${
                          isPlaying 
                            ? 'bg-[#0052d1] text-white shadow-sm' 
                            : 'bg-sky-50 text-[#0052d1] hover:bg-sky-100'
                        }`}
                      >
                        {isPlaying ? <VolumeX className="w-2.5 h-2.5 text-[#fcd400]" /> : <Volume2 className="w-2.5 h-2.5" />}
                        <span>{isPlaying ? 'Stop' : 'Audio'}</span>
                      </button>

                      <button
                        onClick={(e) => handleBookRideToSpot(spot, e)}
                        className="flex items-center gap-0.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#0052d1] hover:bg-[#206afa] text-white text-[9px] sm:text-[10px] font-bold shadow-sm active:scale-95 transition-transform shrink-0"
                      >
                        <Bike className="w-2.5 h-2.5 text-[#fcd400]" />
                        <span>Sakay</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Audio Audio Player Sheet if Active */}
        {activeAudioSpotId && (
          <div className="fixed bottom-22 sm:bottom-24 left-3 right-3 max-w-sm mx-auto z-40 bg-[#0052d1] text-white p-2.5 rounded-xl shadow-2xl border border-white/20 flex items-center justify-between animate-in slide-from-bottom-4 duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
                <Volume2 className="w-4 h-4 text-[#fcd400]" />
              </div>
              <div className="truncate">
                <p className="text-[9px] text-sky-200 font-bold uppercase tracking-wider">
                  Audio Tour Guide
                </p>
                <p className="text-xs font-bold text-white truncate">
                  {spots.find(s => s.id === activeAudioSpotId)?.name || 'Bauang Audio Story'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const s = spots.find(spot => spot.id === activeAudioSpotId);
                  if (s) handleBookRideToSpot(s);
                }}
                className="px-2.5 py-1 rounded-full bg-[#fcd400] text-[#131b2e] font-black text-[10px] shadow-sm"
              >
                Book
              </button>
              <button
                onClick={() => setActiveAudioSpotId(null)}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Spot Detail Modal (Mounted to document.body with createPortal so it is 100% above navbar) */}
      {selectedSpotModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Modal Image Header */}
            <div className="relative h-52 sm:h-56 w-full shrink-0">
              <img 
                src={selectedSpotModal.cover_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'} 
                alt={selectedSpotModal.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>
              
              <button
                onClick={() => setSelectedSpotModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#fcd400] text-[#131b2e]">
                  {selectedSpotModal.category || 'Atraksyon'}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  {selectedSpotModal.name}
                </h2>
              </div>
            </div>

            {/* Modal Body with safe bottom padding */}
            <div className="p-4 sm:p-5 pb-8 sm:pb-5 overflow-y-auto space-y-3.5 flex-1 text-sm text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed font-medium text-xs sm:text-sm">
                {selectedSpotModal.description || 'Magandang pasyalan sa Bauang na dinarayo ng mga turista at lokal.'}
              </p>

              {selectedSpotModal.opening_hours && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl">
                  <Clock className="w-4 h-4 text-[#0052d1]" />
                  <span>Bukas: {selectedSpotModal.opening_hours}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-1 flex gap-2.5">
                <button
                  onClick={() => toggleAudio(selectedSpotModal.id)}
                  className="flex-1 h-11 sm:h-12 rounded-full border-2 border-[#0052d1] text-[#0052d1] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-sky-50 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{activeAudioSpotId === selectedSpotModal.id ? 'Itigil' : 'Pakinggan'}</span>
                </button>

                <button
                  onClick={() => {
                    handleBookRideToSpot(selectedSpotModal);
                    setSelectedSpotModal(null);
                  }}
                  className="flex-1 h-11 sm:h-12 rounded-full bg-[#0052d1] hover:bg-[#206afa] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-[#0052d1]/25 cursor-pointer active:scale-95 transition-all"
                >
                  <Bike className="w-4 h-4 text-[#fcd400]" />
                  <span>Sumakay ng Tricycle</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DiscoveryHome;
