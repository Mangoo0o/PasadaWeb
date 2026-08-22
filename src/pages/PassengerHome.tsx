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
  X,
  Star,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Sparkles,
  Navigation,
  AlertTriangle
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
  fetchActiveDrivers,
  fetchActiveTrip,
  submitPassengerRating
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
  const [bookingState, setBookingState] = useState<'idle' | 'searching' | 'assigned' | 'arrived' | 'in_transit' | 'completed'>('idle');

  // Rating & Review State
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [hasRated, setHasRated] = useState<boolean>(false);

  // Cancel Confirmation Modal State
  const [showPassengerCancelModal, setShowPassengerCancelModal] = useState<boolean>(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState<boolean>(false);

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

  // Restore active passenger trip on startup / browser refresh
  useEffect(() => {
    let isMounted = true;
    const initPassengerActiveTrip = async () => {
      if (user?.id) {
        const ongoing = await fetchActiveTrip(user.id, false);
        if (ongoing && isMounted) {
          setActiveBooking(ongoing);
          if (ongoing.origin_lat && ongoing.origin_lng) {
            setOriginLat(ongoing.origin_lat);
            setOriginLng(ongoing.origin_lng);
            if (ongoing.origin_name) setOriginName(ongoing.origin_name);
          }
          if (ongoing.destination_lat && ongoing.destination_lng) {
            setDestLat(ongoing.destination_lat);
            setDestLng(ongoing.destination_lng);
            if (ongoing.destination_name) {
              setDestinationName(ongoing.destination_name);
              setSearchQuery(ongoing.destination_name);
            }
          }
          if (ongoing.estimated_fare) setCurrentFare(ongoing.estimated_fare);
          if (ongoing.estimated_distance_km) setEstimatedDistance(ongoing.estimated_distance_km);

          if (ongoing.status === 'searching') setBookingState('searching');
          else if (ongoing.status === 'driver_assigned') setBookingState('assigned');
          else if (ongoing.status === 'driver_arrived') setBookingState('arrived');
          else if (ongoing.status === 'in_transit') setBookingState('in_transit');
          else if (ongoing.status === 'completed') {
            setBookingState('completed');
            setShowRatingModal(true);
          }
        }
      }
    };
    initPassengerActiveTrip();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Subscribe to real-time status updates for active booking
  useEffect(() => {
    if (!activeBooking?.id) return;

    const unsubscribe = subscribeToBooking(activeBooking.id, (updated) => {
      setActiveBooking(updated);
      if (updated.status === 'driver_assigned') {
        setBookingState('assigned');
      } else if (updated.status === 'driver_arrived') {
        setBookingState('arrived');
      } else if (updated.status === 'in_transit') {
        setBookingState('in_transit');
      } else if (updated.status === 'completed') {
        setBookingState('completed');
        setShowRatingModal(true);
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

  const handleCancelBooking = () => {
    setShowPassengerCancelModal(true);
  };

  const handleConfirmCancelBooking = async () => {
    setIsCancellingBooking(true);
    if (activeBooking?.id) {
      await updateBookingStatus(activeBooking.id, 'cancelled');
    }
    setIsCancellingBooking(false);
    setShowPassengerCancelModal(false);
    setBookingState('idle');
    setActiveBooking(null);
  };

  const handleSubmitRating = async () => {
    if (!activeBooking || !user) return;
    setIsSubmittingRating(true);
    const driverId = activeBooking.driver_id || activeBooking.driver?.id;
    if (driverId) {
      await submitPassengerRating({
        bookingId: activeBooking.id,
        driverId,
        passengerId: user.id,
        rating: ratingScore,
        comment: ratingComment
      });
    }
    setIsSubmittingRating(false);
    setHasRated(true);
    setTimeout(() => {
      setShowRatingModal(false);
      setBookingState('idle');
      setActiveBooking(null);
      setHasRated(false);
      setRatingComment('');
    }, 1200);
  };

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* 1. Full Screen Interactive Map */}
      <div 
        style={{
          position: 'absolute',
          top: '-70px',
          left: 0,
          right: 0,
          bottom: '-70px',
          width: '100%',
          height: 'calc(100% + 140px)',
          zIndex: 0
        }}
      >
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
          assignedDriver={activeBooking?.driver}
          bookingStatus={bookingState}
        />
      </div>

      {/* 2. TOP FLOATING SEARCH BAR & UNIFIED DROPDOWN MODAL */}
      <div 
        style={{
          position: 'absolute',
          top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
          left: '12px',
          right: '12px',
          zIndex: 40
        }}
        className="max-w-xl mx-auto font-sans sm:!top-4 sm:!left-4 sm:!right-4"
      >
        <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg transition-all duration-150 overflow-hidden ${
          isSearchFocused ? 'rounded-2xl ring-2 ring-[#00346F]/10 dark:ring-[#00C1FD]/20' : 'rounded-xl'
        }`}>
          {/* Top Search Input Row */}
          <div className="p-1.5 flex items-center gap-1.5">
            {/* Destination Search Input */}
            <div className="flex-1 flex items-center px-2.5 h-[38px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 focus-within:border-[#00346F] focus-within:bg-white dark:focus-within:bg-slate-800 transition-all relative">
              <Search className="w-3.5 h-3.5 text-[#00346F] dark:text-[#00C1FD] mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Maghanap ng Destinasyon o TODA..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 text-xs font-medium placeholder:text-slate-400 p-0"
              />
              {searchQuery && (
                <button
                  onClick={handleClearDestination}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 h-[38px] rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#00346F] dark:text-[#00C1FD]" />
              <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
            </button>

            {/* Login / Profile */}
            {user ? (
              <button
                onClick={signOut}
                className="h-[38px] px-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-3 h-[38px] rounded-lg text-xs font-bold bg-[#00346F] text-white hover:bg-[#00234d] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#00C1FD]" />
                <span className="text-[11px]">Login</span>
              </button>
            )}
          </div>

          {/* Seamlessly Connected Dropdown Section */}
          {isSearchFocused && (
            <div className="border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
              
              {/* Minimal Header */}
              <div className="px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between border-b border-slate-100/60 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3 h-3 text-[#00346F] dark:text-[#00C1FD]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {searchQuery ? `Resulta para sa "${searchQuery}"` : 'Mga Destinasyon sa Bauang'}
                  </span>
                </div>
                <button
                  onClick={() => setIsSearchFocused(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700"
                >
                  Isara
                </button>
              </div>

              {/* Compact Destination Rows */}
              <div className="overflow-y-auto max-h-[300px] sm:max-h-[360px] divide-y divide-slate-100/80 dark:divide-slate-800/50">
                {locationFares
                  .filter(l => l.location_name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((loc) => {
                    const price = isDiscountEligible 
                      ? Number(loc.discounted_fare || Math.round(Number(loc.standard_fare) * 0.8)) 
                      : Number(loc.standard_fare);

                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectLocationFare(loc)}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#00346F] group-hover:text-white dark:group-hover:bg-[#00C1FD] dark:group-hover:text-slate-950 transition-colors text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#00346F] dark:group-hover:text-[#00C1FD] transition-colors">
                              {loc.location_name}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {loc.notes || 'Taripa-regulated zone'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-[#00346F] dark:text-[#00C1FD]">
                            ₱{price.toFixed(2)}
                          </div>
                          {isDiscountEligible ? (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">
                              -20%
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 block leading-tight">
                              Taripa
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                {locationFares.filter(l => l.location_name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                      Walang nahanap na tugmang destinasyon
                    </p>
                    <p className="text-[10px]">
                      Maaari ka ring mag-tap kahit saan sa mapa upang maglagay ng Custom Pin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM FLOATING ACTION BAR & DISPATCH TRACKER */}
      {hasSelectedDestination && (
        <div className="absolute bottom-20 sm:bottom-22 left-2.5 sm:left-4 right-2.5 sm:right-4 max-w-2xl mx-auto z-40 space-y-2">
          
          {/* Booking Error Notice */}
          {bookingError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Idle Booking Setup Card */}
          {bookingState === 'idle' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,52,111,0.2)] p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#00346F] to-[#0056b3] text-white flex items-center justify-center font-black text-xs sm:text-sm shadow shrink-0">
                  ₱{currentFare}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider truncate">
                    {estimatedDistance} km • ~{Math.max(4, Math.round(estimatedDistance * 3.5))} min
                  </div>
                  <div className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedLocationFare?.location_name || destinationName}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartBooking}
                className="px-3.5 py-2.5 sm:px-5 sm:py-3 bg-[#00346F] hover:bg-[#00234d] text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-[#00346F]/25 flex items-center gap-1.5 sm:gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C1FD]" />
                <span>Mag-book</span>
              </button>
            </div>
          )}

          {/* Searching Dispatch State */}
          {bookingState === 'searching' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-3 sm:p-4 text-center space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-sky-200 animate-ping"></div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#00346F] text-white flex items-center justify-center relative z-10 shadow">
                    <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C1FD] animate-bounce" />
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    Naghahanap ng Driver sa Bauang...
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {selectedLocationFare?.location_name || destinationName} • <strong>₱{currentFare}.00</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelBooking}
                className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Kanselahin ang Booking
              </button>
            </div>
          )}

          {/* Real Driver Assigned / En Route Card */}
          {bookingState === 'assigned' && activeBooking && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-[#00346F]/30 dark:border-sky-500/30 shadow-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-sky-100 text-[#00346F] dark:bg-sky-950 dark:text-[#00C1FD] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00C1FD]" />
                  <span>PAPUNTA NA SI MANONG DRIVER</span>
                </span>
                <span className="text-[11px] sm:text-xs font-black text-emerald-600">
                  ₱{Number(activeBooking.estimated_fare).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#00346F] text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0 border-2 border-white">
                  {activeBooking.driver?.profile?.full_name?.charAt(0) || 'D'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {activeBooking.driver?.profile?.full_name || 'Juan Dela Cruz (Driver)'}
                    </h4>
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5 sm:gap-2 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[10px] sm:text-[11px] text-[#00346F] dark:text-[#00C1FD]">
                      Body #{activeBooking.driver?.body_number || '0142'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold truncate">{activeBooking.driver?.plate_number || '1234-AB'}</span>
                  </div>
                </div>

                {activeBooking.driver?.profile?.phone_number && (
                  <a
                    href={`tel:${activeBooking.driver.profile.phone_number}`}
                    className="p-2.5 sm:p-3 rounded-xl bg-emerald-600 text-white shadow-md hover:bg-emerald-700 shrink-0 transition-transform active:scale-95 flex items-center justify-center"
                    title="Tawagan ang Driver"
                  >
                    <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </a>
                )}
              </div>

              <button
                onClick={handleCancelBooking}
                className="w-full py-1.5 sm:py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Kanselahin ang Byahe</span>
              </button>
            </div>
          )}

          {/* Driver Arrived Notification Banner */}
          {bookingState === 'arrived' && activeBooking && (
            <div className="bg-emerald-500 text-white rounded-2xl p-3 sm:p-4 shadow-xl space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
                <h4 className="font-black text-xs sm:text-sm">
                  Nasa Sakayan Na ang Iyong Tricycle!
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100">
                Paki-abangan si Manong Driver na may <strong>Body #{activeBooking.driver?.body_number || '0142'}</strong> (Plate: {activeBooking.driver?.plate_number || '1234-AB'}).
              </p>

              <button
                onClick={handleCancelBooking}
                className="w-full py-1.5 sm:py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] sm:text-xs border border-white/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Kanselahin ang Byahe</span>
              </button>
            </div>
          )}

          {/* In Transit Active Journey Banner */}
          {bookingState === 'in_transit' && activeBooking && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-[#FF6B00]/40 shadow-xl p-3 sm:p-4 space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  KASALUKUYANG BUMIBIYAHE
                </span>
                <span className="text-[11px] sm:text-xs font-black text-[#00346F] dark:text-[#00C1FD]">
                  ₱{Number(activeBooking.estimated_fare).toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                Patungong: {selectedLocationFare?.location_name || destinationName}
              </div>

              <button
                onClick={handleCancelBooking}
                className="w-full py-1.5 sm:py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Kanselahin ang Byahe</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* 5. PASSENGER E-RECEIPT & 5-STAR REVIEW RATING MODAL */}
      {showRatingModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            
            {hasRated ? (
              <div className="py-8 space-y-2 animate-in zoom-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Salamat sa Feedback!
                </h3>
                <p className="text-xs text-slate-500">
                  Naitatala na ang iyong rating sa profile ng driver.
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#00346F] text-[#00C1FD] flex items-center justify-center mx-auto shadow-md">
                  <Bike className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Tapos na ang Biyahe!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Salamat sa pagsakay kasama si {activeBooking.driver?.profile?.full_name || 'Driver'}.
                  </p>
                </div>

                {/* E-Receipt Strip */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bayad na Pamasahe</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {activeBooking.destination_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#00346F] dark:text-[#00C1FD]">
                      ₱{Number(activeBooking.final_fare || activeBooking.estimated_fare).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Interactive 5-Star Selector */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    I-rate ang serbisyo ni Manong Driver:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingScore(star)}
                        className="p-1.5 transition-transform active:scale-125 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            star <= ratingScore
                              ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Review Comment */}
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Mag-iwan ng komento (hal. Maingat magmaneho, magalang)..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00346F]/20 resize-none"
                />

                {/* Submit CTA */}
                <button
                  onClick={handleSubmitRating}
                  disabled={isSubmittingRating}
                  className="w-full py-3.5 rounded-full bg-[#00346F] hover:bg-[#00234d] text-white font-bold text-sm shadow-lg shadow-[#00346F]/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00C1FD]" />
                  <span>{isSubmittingRating ? 'Isinusumite...' : 'Ipadala ang Rating at Tapusin'}</span>
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* 6. PASSENGER CANCEL CONFIRMATION MODAL */}
      {showPassengerCancelModal && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Kanselahin ang Booking?
              </h3>
              <p className="text-xs text-slate-500">
                Sigurado ka bang nais mong kanselahin ang iyong booking request?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                disabled={isCancellingBooking}
                onClick={handleConfirmCancelBooking}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancellingBooking ? 'Kinakansela...' : 'Oo, Kanselahin'}
              </button>
              <button
                disabled={isCancellingBooking}
                onClick={() => setShowPassengerCancelModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Huwag Kanselahin (Ipagpatuloy ang Biyahe)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
