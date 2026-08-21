import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Bike, 
  PhoneCall, 
  Globe,
  LogIn,
  LogOut,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LiveMap } from '../components/map/LiveMap';
import { Terminal, TouristSpot, Booking, LocationFare } from '../types/database.types';
import { fetchTerminals } from '../services/terminalService';
import { fetchTouristSpots } from '../services/touristService';
import { 
  fetchLocationFares, 
  findMatchingLocationByProximity, 
  ProximityMatchResult,
  getLocationIconEmoji
} from '../services/fareService';
import { 
  createBookingRequest, 
  subscribeToBooking, 
  updateBookingStatus, 
  fetchActiveDrivers 
} from '../services/bookingService';
import { setAppLanguage } from '../i18n/config';

interface PassengerHomeProps {
  onOpenAuthModal?: () => void;
}

export const PassengerHome: React.FC<PassengerHomeProps> = ({ onOpenAuthModal }) => {
  const { i18n } = useTranslation();
  const { user, signOut } = useAuth();

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [locationFares, setLocationFares] = useState<LocationFare[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<Array<{ id: string; lat: number; lng: number; bodyNumber?: string }>>([]);
  
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [selectedLocationFare, setSelectedLocationFare] = useState<LocationFare | null>(null);
  const [, setProximityResult] = useState<ProximityMatchResult | null>(null);

  // 1. ORIGIN: Current Passenger / Live GPS Pickup Location
  const [originLat, setOriginLat] = useState<number>(16.5333);
  const [originLng, setOriginLng] = useState<number>(120.3333);
  const [originName, setOriginName] = useState<string>('Kasalukuyang Lokasyon (Town Plaza)');

  // 2. DESTINATION: Initially unselected until passenger clicks/searches a location
  const [destLat, setDestLat] = useState<number | undefined>(undefined);
  const [destLng, setDestLng] = useState<number | undefined>(undefined);
  const [destinationName, setDestinationName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // 3. Location-Based Pricing State
  const [currentFare, setCurrentFare] = useState<number>(20);
  const [estimatedDistance, setEstimatedDistance] = useState<number>(1.5);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Active Booking
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [bookingState, setBookingState] = useState<'idle' | 'searching' | 'assigned' | 'in_transit' | 'completed'>('idle');

  const hasSelectedDestination = Boolean(selectedLocationFare || (destLat !== undefined && destLng !== undefined));

  // 20% Discount for Student, Senior Citizen, or PWD
  const isDiscountEligible = Boolean(
    user?.passenger_type && user.passenger_type !== 'regular'
  );

  const getPassengerTypeLabel = () => {
    switch (user?.passenger_type) {
      case 'student': return 'Estudyante (-20%)';
      case 'senior': return 'Senior Citizen (-20%)';
      case 'pwd': return 'PWD (-20%)';
      default: return 'Fixed Tariff';
    }
  };

  // Resolve Price via Location Proximity
  const resolveLocationFare = useCallback((
    targetLat: number,
    targetLng: number,
    allLocations: LocationFare[],
    terminalId?: string
  ) => {
    if (!allLocations || allLocations.length === 0) return;

    const match = findMatchingLocationByProximity(targetLat, targetLng, allLocations, terminalId);
    setProximityResult(match);

    if (match) {
      setSelectedLocationFare(match.matchedLocation);
      const computedFare = isDiscountEligible 
        ? Number(match.discountedFare || Math.round(Number(match.standardFare) * 0.8))
        : Number(match.standardFare);
      setCurrentFare(computedFare);
    }
  }, [isDiscountEligible]);

  // GPS Geolocation Auto-Detect in Background
  const handleUseCurrentGPS = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setOriginLat(userLat);
          setOriginLng(userLng);
          setOriginName('Aking Lokasyon (GPS)');
        },
        (err) => {
          console.warn('Geolocation access note:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Load live terminals, tourist spots, location fares, and online drivers from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [termData, locData] = await Promise.all([
        fetchTerminals(),
        fetchLocationFares()
      ]);

      if (!isMounted) return;

      setTerminals(termData);
      setLocationFares(locData);

      if (termData.length > 0) {
        setSelectedTerminal(termData[0]);
      }

      await fetchTouristSpots();

      const drivers = await fetchActiveDrivers();
      if (isMounted) {
        setActiveDrivers(drivers);
      }
    };

    loadData();
    handleUseCurrentGPS();

    // Poll live drivers every 10 seconds
    const interval = setInterval(async () => {
      const drivers = await fetchActiveDrivers();
      if (isMounted) {
        setActiveDrivers(drivers);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [handleUseCurrentGPS]);

  // Listen to active booking updates in realtime
  useEffect(() => {
    if (!activeBooking?.id) return;

    const unsubscribe = subscribeToBooking(activeBooking.id, (updated) => {
      setActiveBooking(updated);
      if (updated.status === 'driver_assigned' || updated.status === 'driver_arrived') {
        setBookingState('assigned');
      } else if (updated.status === 'in_transit') {
        setBookingState('in_transit');
      } else if (updated.status === 'completed') {
        setBookingState('completed');
        setTimeout(() => {
          setBookingState('idle');
          setActiveBooking(null);
        }, 4000);
      } else if (updated.status === 'cancelled') {
        setBookingState('idle');
        setActiveBooking(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeBooking?.id]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setAppLanguage(nextLang);
  };

  // Select Destination from Preset Location Fare
  const handleSelectLocationFare = (loc: LocationFare) => {
    setSelectedLocationFare(loc);
    setDestLat(loc.lat);
    setDestLng(loc.lng);
    setDestinationName(loc.location_name);
    setSearchQuery(loc.location_name);
    setIsSearchFocused(false);
    
    const fareToCharge = isDiscountEligible
      ? Number(loc.discounted_fare || Math.round(Number(loc.standard_fare) * 0.8))
      : Number(loc.standard_fare);
    setCurrentFare(fareToCharge);
  };

  // Select Destination Terminal
  const handleSelectTerminal = (term: Terminal) => {
    setSelectedTerminal(term);
    if (destLat !== undefined && destLng !== undefined) {
      resolveLocationFare(destLat, destLng, locationFares, term.id);
    }
  };

  // Map Click: Move Destination Pin & Proximity Match
  const handleMapClick = (lat: number, lng: number) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestinationName(`Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    resolveLocationFare(lat, lng, locationFares, selectedTerminal?.id);
  };

  // Clear Selected Destination
  const handleClearDestination = () => {
    setSelectedLocationFare(null);
    setDestLat(undefined);
    setDestLng(undefined);
    setDestinationName('');
    setSearchQuery('');
    setBookingError(null);
  };

  const handleStartBooking = async () => {
    setBookingError(null);
    if (!user) {
      signOut();
      return;
    }

    if (!selectedTerminal) {
      setBookingError('Pumili ng TODA Terminal na magseserbisyo.');
      return;
    }

    if (destLat === undefined || destLng === undefined) {
      setBookingError('Pumili ng pupuntahang destinasyon sa mapa.');
      return;
    }

    setBookingState('searching');
    const res = await createBookingRequest({
      passengerId: user.id,
      originName,
      originLat,
      originLng,
      destinationName: selectedLocationFare?.location_name || destinationName,
      destinationLat: destLat,
      destinationLng: destLng,
      estimatedDistanceKm: estimatedDistance,
      estimatedDurationMin: Math.max(4, Math.round(estimatedDistance * 3.5)),
      estimatedFare: currentFare,
    });

    if (res.error) {
      setBookingError(res.error);
      setBookingState('idle');
      return;
    }

    if (res.data) {
      setActiveBooking(res.data);
    }
  };

  const handleCancelBooking = async () => {
    if (activeBooking?.id) {
      await updateBookingStatus(activeBooking.id, 'cancelled');
    }
    setBookingState('idle');
    setActiveBooking(null);
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* 1. Full Screen Interactive Map */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <LiveMap
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          destLng={destLng}
          terminals={terminals}
          locationFares={locationFares}
          selectedLocationFare={selectedLocationFare}
          onSelectMapLocation={handleMapClick}
          onSelectTerminal={handleSelectTerminal}
          onSelectLocationFare={handleSelectLocationFare}
          onRouteDistanceCalculated={setEstimatedDistance}
          activeDrivers={activeDrivers}
        />
      </div>

      {/* 2. TOP FLOATING SEARCH BAR & CONTROLS */}
      <div className="absolute top-3 sm:top-4 left-3 right-3 max-w-xl mx-auto z-40">
        <div className="rounded-xl shadow-[0_4px_20px_rgba(0,52,111,0.15)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3">
          <div className="flex items-center gap-2">
            {/* Destination Search Input */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center px-3 h-[40px] focus-within:border-[#00346F] focus-within:ring-2 focus-within:ring-[#00346F]/15 transition-all relative">
              <Search className="w-4 h-4 text-[#00346F] dark:text-[#00C1FD] mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Maghanap ng Destinasyon o TODA..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold placeholder:text-slate-400 p-0"
              />
              {searchQuery && (
                <button
                  onClick={handleClearDestination}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#00346F] dark:text-[#00C1FD]" />
              <span className="text-[11px]">{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
            </button>

            {/* Login / Profile */}
            {user ? (
              <button
                onClick={signOut}
                className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shrink-0 border border-rose-200 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black bg-[#00C1FD] text-[#00346F] shadow-sm hover:bg-sky-400 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown for Location-Based Fares */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
                Mga Destinasyon:
              </div>
              {locationFares
                .filter(l => l.location_name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(loc => (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocationFare(loc)}
                    className="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-sky-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-base flex items-center justify-center shrink-0">
                        {getLocationIconEmoji(loc.icon, loc.location_name)}
                      </span>
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {loc.location_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {loc.notes || 'Official LGU Tariff Zone'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        ₱{Number(loc.standard_fare).toFixed(2)}
                      </div>
                      <span className="text-[9px] font-bold text-[#00346F] dark:text-[#00C1FD] bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded">
                        Fixed Tariff
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM FLOATING ACTION BAR: ONLY SHOWN WHEN A LOCATION IS SELECTED OR WHEN TRIP IS ACTIVE */}
      {(hasSelectedDestination || bookingState !== 'idle') && (
        <div className="absolute bottom-20 sm:bottom-6 left-3.5 right-3.5 max-w-lg mx-auto z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {bookingError && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Idle State: Bottom Left Estimated Price Rate + Bottom Right Book Button */}
          {bookingState === 'idle' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,52,111,0.2)] p-3 sm:p-3.5 flex items-center justify-between gap-3 relative overflow-visible">
              {/* Floating Clear (X) Button outside on the top-right edge */}
              <button
                onClick={handleClearDestination}
                className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:scale-110 active:scale-95 flex items-center justify-center transition-all cursor-pointer z-10"
                title="Clear destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Left Side: Estimated Price Rate & Destination with Icon */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-lg shrink-0">
                  {getLocationIconEmoji(selectedLocationFare?.icon, selectedLocationFare?.location_name || destinationName)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Estimated Price Rate
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-[#00346F] dark:text-[#00C1FD] tracking-tight">
                      ₱{currentFare}.00
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      isDiscountEligible
                        ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                        : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {getPassengerTypeLabel()}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[170px] sm:max-w-xs">
                    {selectedLocationFare?.location_name || destinationName}
                  </div>
                </div>
              </div>

              {/* Right Side: Book CTA Button */}
              <button
                onClick={handleStartBooking}
                className="px-5 sm:px-6 h-[44px] bg-gradient-to-r from-[#00346F] to-[#004A99] text-white rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_4px_16px_rgba(0,52,111,0.28)] hover:from-[#00234d] hover:to-[#00346F] active:scale-[0.97] transition-all cursor-pointer shrink-0"
              >
                <Bike className="w-4 h-4 text-[#00C1FD]" />
                <span>Mag-book</span>
              </button>
            </div>
          )}

          {/* Searching State */}
          {bookingState === 'searching' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,52,111,0.2)] p-3.5 text-center space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-sky-200 animate-ping"></div>
                  <div className="w-7 h-7 rounded-lg bg-[#00346F] text-white flex items-center justify-center relative z-10 shadow">
                    <Bike className="w-3.5 h-3.5 text-[#00C1FD] animate-bounce" />
                  </div>
                </div>
                <div className="text-left">
                  <h4 className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                    Naghahanap ng Driver...
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {selectedLocationFare?.location_name || destinationName} • ₱{currentFare}.00
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelBooking}
                className="w-full py-2 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Kanselahin ang Booking
              </button>
            </div>
          )}

          {/* Real Driver Assigned / In Transit Card */}
          {(bookingState === 'assigned' || bookingState === 'in_transit') && activeBooking && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,52,111,0.2)] p-3 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#00346F] text-white flex items-center justify-center font-black text-sm shadow shrink-0">
                  {activeBooking.driver?.profile?.full_name?.charAt(0) || 'D'}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">
                    {activeBooking.driver?.profile?.full_name || 'Assigned Driver'}
                  </h4>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="font-bold text-[#00346F] dark:text-[#00C1FD]">#{activeBooking.driver?.body_number || 'BODY'}</span>
                    <span>•</span>
                    <span>₱{Number(activeBooking.estimated_fare).toFixed(2)}</span>
                  </div>
                </div>

                {activeBooking.driver?.profile?.phone_number && (
                  <a
                    href={`tel:${activeBooking.driver.profile.phone_number}`}
                    className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 shrink-0 transition-transform active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <button
                onClick={handleCancelBooking}
                className="w-full py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold text-[11px] hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                I-cancel ang Byahe
              </button>
            </div>
          )}

          {/* Trip Completed State */}
          {bookingState === 'completed' && activeBooking && (
            <div className="bg-emerald-50 backdrop-blur-md rounded-xl border border-emerald-200 shadow-[0_8px_30px_rgba(16,185,129,0.2)] p-3 text-center animate-in fade-in slide-in-from-bottom-2">
              <h4 className="font-black text-xs sm:text-sm text-emerald-800">
                Tapos na ang Byahe! Salamat sa Pagsakay!
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Kabuuang Bayarin: <strong>₱{Number(activeBooking.final_fare || activeBooking.estimated_fare).toFixed(2)}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
