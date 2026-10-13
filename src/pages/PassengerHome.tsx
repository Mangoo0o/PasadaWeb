import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  AlertTriangle,
  MessageSquare,
  Percent,
  Repeat,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight
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
  getLocationIconEmoji,
  resolveLocationCategory,
  LOCATION_ICON_OPTIONS,
  calculateFare,
  getPassengerTypeInfo,
  isDiscountEligibleType,
  matchesLocationSearch,
  getLocationCategoryMeta,
  CATEGORY_DEFINITIONS
} from '../services/fareService';
import { UniswapCategoryFilter, CategoryOption } from '../components/ui/uniswap-category-filter';
import { 
  createBookingRequest, 
  subscribeToBooking, 
  updateBookingStatus, 
  fetchActiveDrivers,
  fetchActiveTrip,
  submitPassengerRating,
  extendBookingDestination
} from '../services/bookingService';
import { setAppLanguage } from '../i18n/config';
import { soundService } from '../services/soundNotificationService';
import { getDistanceKm, MAX_DISPATCH_RADIUS_KM } from '../services/geoProximityService';
import { InTripChatModal } from '../components/booking/InTripChatModal';
import { InPhoneMessageBanner } from '../components/booking/InPhoneMessageBanner';
import { subscribeToTripChat, fetchTripMessages } from '../services/tripChatService';

interface PassengerHomeProps {
  onOpenAuthModal?: () => void;
  preselectedSpot?: TouristSpot | null;
}

export const PassengerHome: React.FC<PassengerHomeProps> = ({ onOpenAuthModal, preselectedSpot }) => {
  const { t, i18n } = useTranslation();
  const { user, signOut, setLanguage, updateUserProfile } = useAuth();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fil' ? 'en' : 'fil';
    setLanguage(nextLang);
  };

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [locationFares, setLocationFares] = useState<LocationFare[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<Array<{ id: string; lat: number; lng: number; bodyNumber?: string }>>([]);
  
  const [selectedLocationFare, setSelectedLocationFare] = useState<LocationFare | null>(null);
  const [proximityResult, setProximityResult] = useState<ProximityMatchResult | null>(null);

  // 1. ORIGIN: Current Passenger / Live GPS Pickup Location
  const [originLat, setOriginLat] = useState<number>(16.5333);
  const [originLng, setOriginLng] = useState<number>(120.3333);
  const [originName, setOriginName] = useState<string>('Kasalukuyang Lokasyon (Town Plaza)');

  // 2. DESTINATION: Initially unselected until passenger clicks/searches a location
  const [destLat, setDestLat] = useState<number | undefined>(preselectedSpot?.lat);
  const [destLng, setDestLng] = useState<number | undefined>(preselectedSpot?.lng);
  const [destinationName, setDestinationName] = useState<string>(preselectedSpot?.name || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // 2.1 Category Filter State & Filtered Sets (Uniswap Dialog Filter on Map)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Derive category options with live counts from location fares & terminals
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts: Record<string, number> = {};
    locationFares.forEach((loc) => {
      const cat = resolveLocationCategory(loc);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const isFil = i18n.language === 'fil';
    const totalCount = locationFares.length;

    const list: CategoryOption[] = [
      {
        id: 'all',
        name: 'All Categories',
        nameFil: 'Lahat ng Kategorya',
        icon: '✨',
        description: isFil ? 'Ipakita ang lahat ng destinasyon sa mapa' : 'Show all destinations on map',
        count: totalCount,
      },
    ];

    LOCATION_ICON_OPTIONS.forEach((opt) => {
      if (opt.id === 'pin') return;
      const count = counts[opt.id] || 0;
      const parts = opt.label.split('/');
      list.push({
        id: opt.id,
        name: (parts[1] || parts[0]).trim(),
        nameFil: parts[0].trim(),
        icon: opt.icon,
        description: `${count} ${isFil ? 'destinasyong nakatala' : 'destinations recorded'}`,
        count,
      });
    });

    return list;
  }, [locationFares, i18n.language]);

  // Category carousel scroll ref & controls
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragScrollLeft = useRef<number>(0);
  const hasDraggedCategory = useRef<boolean>(false);

  const scrollCategoryStrip = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = 220;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
      });
    }
  };

  const handleCategoryMouseDown = (e: React.MouseEvent) => {
    if (!categoryScrollRef.current) return;
    setIsDraggingCategory(true);
    hasDraggedCategory.current = false;
    dragStartX.current = e.pageX - categoryScrollRef.current.offsetLeft;
    dragScrollLeft.current = categoryScrollRef.current.scrollLeft;
  };

  const handleCategoryMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCategory || !categoryScrollRef.current) return;
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.2;
    if (Math.abs(walk) > 4) {
      hasDraggedCategory.current = true;
    }
    categoryScrollRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleCategoryMouseUp = () => {
    setIsDraggingCategory(false);
  };

  // Translate vertical mouse wheel to horizontal scrolling on the category strip
  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [isSearchFocused]);

  // Filtered location fares for map markers and search list
  const filteredLocationFares = useMemo(() => {
    if (selectedCategory === 'all') return locationFares;
    return locationFares.filter((loc) => resolveLocationCategory(loc) === selectedCategory);
  }, [locationFares, selectedCategory]);

  // Derived destination list for search dropdown (category + keyword matching)
  const displayedDestinations = useMemo(() => {
    return locationFares.filter((loc) => {
      // If a specific category is active, limit to that category
      if (selectedCategory !== 'all' && resolveLocationCategory(loc) !== selectedCategory) {
        return false;
      }
      // Check query match across name, notes, category ID, and category keywords
      return matchesLocationSearch(loc, searchQuery);
    });
  }, [locationFares, selectedCategory, searchQuery]);

  // Detected category if search query matches a category name or keyword
  const activeCategoryMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return CATEGORY_DEFINITIONS.find((cat) => {
      return (
        cat.id.toLowerCase() === q ||
        cat.name.toLowerCase().includes(q) ||
        cat.nameFil.toLowerCase().includes(q) ||
        cat.keywords.some((k) => k.toLowerCase() === q || (q.length >= 3 && k.toLowerCase().startsWith(q)))
      );
    });
  }, [searchQuery]);

  // Preselected tourist spot sync will be handled below alongside tariff resolution

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

  // Rebook / Destination Extension State
  const [showRebookModal, setShowRebookModal] = useState<boolean>(false);
  const [rebookSearchQuery, setRebookSearchQuery] = useState<string>('');
  const [rebookSelectedLocation, setRebookSelectedLocation] = useState<LocationFare | null>(null);
  const [isSubmittingRebook, setIsSubmittingRebook] = useState<boolean>(false);

  const handleOpenRebookModal = () => {
    setRebookSearchQuery('');
    setRebookSelectedLocation(null);
    setShowRebookModal(true);
  };

  // In-Trip Chat Modal & Notification State
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    if (!activeBooking?.id) return;
    // Pre-fetch messages into cache
    fetchTripMessages(activeBooking.id);

    const unsubscribe = subscribeToTripChat(activeBooking.id, (newMsg) => {
      const isFromOther = newMsg.senderRole
        ? newMsg.senderRole !== 'passenger'
        : newMsg.senderId !== (user?.id || 'passenger');

      if (isFromOther && !showChatModal) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });
    return () => unsubscribe();
  }, [activeBooking?.id, user?.id, showChatModal]);

  const hasSelectedDestination = Boolean(selectedLocationFare || (destLat !== undefined && destLng !== undefined));

  // Commuter discount preference synchronization (Guest + Auth fallback)
  const [localDiscountType, setLocalDiscountType] = useState<string>(() => {
    return user?.passenger_type || (typeof window !== 'undefined' ? localStorage.getItem('pasada_discount_type') : null) || 'regular';
  });

  useEffect(() => {
    const handleDiscountEvent = (e: any) => {
      if (e?.detail) {
        setLocalDiscountType(e.detail);
      } else {
        setLocalDiscountType(user?.passenger_type || localStorage.getItem('pasada_discount_type') || 'regular');
      }
    };
    window.addEventListener('pasada_discount_changed', handleDiscountEvent);
    window.addEventListener('storage', handleDiscountEvent);
    return () => {
      window.removeEventListener('pasada_discount_changed', handleDiscountEvent);
      window.removeEventListener('storage', handleDiscountEvent);
    };
  }, [user?.passenger_type]);

  const effectivePassengerType = (user?.passenger_type && user.passenger_type !== 'regular')
    ? user.passenger_type
    : (localDiscountType || user?.passenger_type || 'regular');

  const isDiscountEligible = isDiscountEligibleType(effectivePassengerType);
  const passengerTypeInfo = getPassengerTypeInfo(effectivePassengerType);

  // Standard tariff amount for current location or proximity match
  const currentStandardFare = Number(
    selectedLocationFare?.standard_fare || proximityResult?.standardFare || 20
  );

  // Resolve Price via Location Proximity or Name Match
  const resolveLocationFare = useCallback((
    targetLat: number,
    targetLng: number,
    allLocations: LocationFare[],
    explicitName?: string
  ) => {
    if (!allLocations || allLocations.length === 0) return;

    // 1. Check exact name match first if provided (e.g. from tourist spot or landmark title)
    let exactNameMatch: LocationFare | undefined;
    if (explicitName) {
      const norm = explicitName.toLowerCase().trim();
      exactNameMatch = allLocations.find(l => l.location_name.toLowerCase().trim() === norm);
    }

    if (exactNameMatch) {
      setSelectedLocationFare(exactNameMatch);
      const calc = calculateFare(Number(exactNameMatch.standard_fare), isDiscountEligible, exactNameMatch.discounted_fare);
      setCurrentFare(calc.finalFare);
      return;
    }

    // 2. Resolve via geographic proximity
    const match = findMatchingLocationByProximity(targetLat, targetLng, allLocations);
    setProximityResult(match);

    if (match) {
      setSelectedLocationFare(match.matchedLocation);
      const calc = calculateFare(Number(match.standardFare), isDiscountEligible, match.discountedFare);
      setCurrentFare(calc.finalFare);
    }
  }, [isDiscountEligible]);

  // Synchronize preselected tourist spot from Explore page with tariff resolution
  useEffect(() => {
    if (preselectedSpot) {
      setDestLat(preselectedSpot.lat);
      setDestLng(preselectedSpot.lng);
      setDestinationName(preselectedSpot.name);
      if (locationFares.length > 0) {
        resolveLocationFare(preselectedSpot.lat, preselectedSpot.lng, locationFares, preselectedSpot.name);
      }
    }
  }, [preselectedSpot, locationFares, resolveLocationFare]);

  // Automatically resolve location tariff when destination coordinates exist and locationFares become available
  useEffect(() => {
    if (destLat !== undefined && destLng !== undefined && locationFares.length > 0 && !selectedLocationFare) {
      resolveLocationFare(destLat, destLng, locationFares, destinationName);
    }
  }, [destLat, destLng, locationFares, selectedLocationFare, destinationName, resolveLocationFare]);

  // Automatically recalculate currentFare whenever destination, proximity result, or discount status updates
  useEffect(() => {
    if (selectedLocationFare) {
      const calc = calculateFare(
        Number(selectedLocationFare.standard_fare),
        isDiscountEligible,
        selectedLocationFare.discounted_fare
      );
      setCurrentFare(calc.finalFare);
    } else if (proximityResult) {
      const calc = calculateFare(
        Number(proximityResult.standardFare),
        isDiscountEligible,
        proximityResult.discountedFare
      );
      setCurrentFare(calc.finalFare);
    } else {
      // Baseline default fare with passenger account discount applied automatically
      const calc = calculateFare(20, isDiscountEligible);
      setCurrentFare(calc.finalFare);
    }
  }, [isDiscountEligible, selectedLocationFare, proximityResult]);

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

  // Continuous background GPS tracking for moving passenger
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        // Keep origin updated to moving passenger when trip is not active
        if (!activeBooking) {
          setOriginLat(userLat);
          setOriginLng(userLng);
        }
      },
      (err) => {
        console.warn('Geolocation watch note:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeBooking]);

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

      await fetchTouristSpots();

      const getFilteredDrivers = (driverList: Array<{ id: string; lat: number; lng: number; bodyNumber?: string }>) => {
        let localDriverId: string | null = null;
        try {
          const cached = localStorage.getItem('pasada_auth_driver');
          if (cached) localDriverId = JSON.parse(cached)?.id || null;
        } catch {}
        return driverList.filter(d => d.id !== user?.id && (!localDriverId || d.id !== localDriverId));
      };

      const drivers = await fetchActiveDrivers();
      if (isMounted) {
        setActiveDrivers(getFilteredDrivers(drivers));
      }
    };

    loadData();
    handleUseCurrentGPS();

    // Poll live drivers every 10 seconds
    const interval = setInterval(async () => {
      const drivers = await fetchActiveDrivers();
      if (isMounted) {
        let localDriverId: string | null = null;
        try {
          const cached = localStorage.getItem('pasada_auth_driver');
          if (cached) localDriverId = JSON.parse(cached)?.id || null;
        } catch {}
        const filtered = drivers.filter(d => d.id !== user?.id && (!localDriverId || d.id !== localDriverId));
        setActiveDrivers(filtered);
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
      let ongoing: Booking | null = null;
      if (user?.id) {
        ongoing = await fetchActiveTrip(user.id, false);
      }
      if (!ongoing) {
        try {
          const evRaw = localStorage.getItem('pasada_active_trip_event');
          if (evRaw) {
            const ev = JSON.parse(evRaw);
            if (ev?.id && ev.status && ev.status !== 'completed' && ev.status !== 'cancelled') {
              const stored = localStorage.getItem(`pasada_booking_${ev.id}`);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (!user?.id || !parsed.passenger_id || parsed.passenger_id === user.id) {
                  ongoing = parsed;
                }
              }
            }
          }
        } catch {}
      }

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
        setBookingState((prev) => {
          if (prev !== 'assigned') {
            soundService.showDeviceNotification(
              'May Drayber Na Ang Iyong Biyahe!',
              `Papunta na si Manong Driver (Body #${updated.driver?.body_number || 'Tricycle'}).`
            );
          }
          return 'assigned';
        });
      } else if (updated.status === 'driver_arrived') {
        setBookingState((prev) => {
          if (prev !== 'arrived') {
            soundService.playDriverArrivedAlert(updated.driver?.profile?.full_name);
          }
          return 'arrived';
        });
      } else if (updated.status === 'in_transit') {
        setBookingState('in_transit');
      } else if (updated.status === 'completed') {
        setBookingState('completed');
        soundService.playTripCompletedAlert();
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


  // Select Destination from Preset Location Fare
  const handleSelectLocationFare = (loc: LocationFare) => {
    setSelectedLocationFare(loc);
    setDestLat(loc.lat);
    setDestLng(loc.lng);
    setDestinationName(loc.location_name);
    setSearchQuery(loc.location_name);
    setIsSearchFocused(false);
    
    const calc = calculateFare(Number(loc.standard_fare), isDiscountEligible, loc.discounted_fare);
    setCurrentFare(calc.finalFare);
  };

  // Select Destination Terminal
  const handleSelectTerminal = () => {
    if (destLat !== undefined && destLng !== undefined) {
      resolveLocationFare(destLat, destLng, locationFares);
    }
  };

  // Map Click: Move Destination Pin & Proximity Match
  const handleMapClick = (lat: number, lng: number) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestinationName(`Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    resolveLocationFare(lat, lng, locationFares);
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

    if (destLat === undefined || destLng === undefined) {
      setBookingError(i18n.language === 'en' ? 'Select a destination on the map.' : 'Pumili ng pupuntahang destinasyon sa mapa.');
      return;
    }

    setBookingState('searching');
    const res = await createBookingRequest({
      passengerId: user.id,
      passenger: user,
      passengerType: effectivePassengerType,
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
      const cancelId = activeBooking.id;
      try {
        const queue = JSON.parse(localStorage.getItem('pasada_open_queue') || '[]');
        const filtered = queue.filter((b: Booking) => b.id !== cancelId);
        localStorage.setItem('pasada_open_queue', JSON.stringify(filtered));
      } catch {}
      await updateBookingStatus(cancelId, 'cancelled');
      try {
        window.dispatchEvent(new CustomEvent('pasada_new_dispatch', { detail: { id: cancelId, status: 'cancelled' } }));
        window.dispatchEvent(new CustomEvent('pasada_booking_updated', { detail: { id: cancelId, status: 'cancelled' } }));
      } catch {}
    }
    setIsCancellingBooking(false);
    setShowPassengerCancelModal(false);
    setBookingState('idle');
    setActiveBooking(null);
  };

  const handleConfirmRebook = async () => {
    if (!activeBooking || !rebookSelectedLocation) return;
    setIsSubmittingRebook(true);

    try {
      const calc = calculateFare(
        Number(rebookSelectedLocation.standard_fare || 20),
        isDiscountEligible,
        rebookSelectedLocation.discounted_fare
      );
      const extensionFare = calc.finalFare;

      const res = await extendBookingDestination({
        bookingId: activeBooking.id,
        newDestinationName: rebookSelectedLocation.location_name,
        newDestinationLat: rebookSelectedLocation.lat,
        newDestinationLng: rebookSelectedLocation.lng,
        extensionFare: extensionFare,
        passengerId: user?.id,
        passengerName: user?.full_name || 'Passenger'
      });

      if (res.success && res.updatedBooking) {
        setActiveBooking(res.updatedBooking);
        setDestinationName(res.updatedBooking.destination_name);
        setDestLat(res.updatedBooking.destination_lat);
        setDestLng(res.updatedBooking.destination_lng);
        setSelectedLocationFare(rebookSelectedLocation);
        setShowRebookModal(false);
        soundService.playTripCompletedAlert();
      } else {
        alert(res.error || (i18n.language === 'en' ? 'Failed to extend destination' : 'Hindi ma-update ang bagong destinasyon'));
      }
    } catch (err: any) {
      alert(err.message || 'Error extending destination');
    } finally {
      setIsSubmittingRebook(false);
    }
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

  const nearbyDriversWithin1Km = activeDrivers.filter(d => 
    getDistanceKm(originLat, originLng, d.lat, d.lng) <= MAX_DISPATCH_RADIUS_KM
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {/* 1. Full Screen Interactive Map — position:fixed anchors to physical screen edge, behind status bar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
        <LiveMap
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          terminals={terminals}
          locationFares={filteredLocationFares}
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

      {/* Top Status Bar Gradient Scrim */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />

      {/* 2. TOP FLOATING SEARCH BAR & UNIFIED DROPDOWN MODAL */}
      <div 
        style={{
          position: 'fixed',
          top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 10px))',
          left: '12px',
          right: '12px',
          zIndex: 40
        }}
        className="max-w-xl mx-auto font-sans"
      >
        <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg transition-all duration-150 overflow-hidden ${
          isSearchFocused ? 'rounded-2xl ring-2 ring-[#0052d1]/15 dark:ring-[#206afa]/25' : 'rounded-xl'
        }`}>
          {/* Top Search Input Row */}
          <div className="p-1.5 flex items-center gap-1.5">
            {/* Destination Search Input */}
            <div className="flex-1 flex items-center px-2.5 h-[38px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 focus-within:border-[#0052d1] focus-within:bg-white dark:focus-within:bg-slate-800 transition-all relative">
              <Search className="w-3.5 h-3.5 text-[#0052d1] dark:text-sky-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.language === 'en' ? 'Search Destination...' : 'Maghanap ng Destinasyon...'}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 text-[16px] font-medium placeholder:text-slate-400 placeholder:text-xs p-0"
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
              className="flex items-center gap-1 px-2.5 h-[38px] rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 border border-slate-200/80 dark:border-slate-700 cursor-pointer active:scale-95"
              title="Switch Language / Magpalit ng Wika"
            >
              <Globe className="w-3.5 h-3.5 text-[#0052d1] dark:text-sky-400" />
              <span>{i18n.language === 'fil' ? 'FIL' : 'ENG'}</span>
            </button>

            {/* Login for Guests only */}
            {!user && onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-3 h-[38px] rounded-lg text-xs font-bold bg-[#0052d1] text-white hover:bg-[#206afa] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#fcd400]" />
                <span className="text-[11px]">{i18n.language === 'en' ? 'Sign In' : 'Login'}</span>
              </button>
            )}
          </div>

          {/* Seamlessly Connected Dropdown Section */}
          {isSearchFocused && (
            <div className="border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
              
              {/* Minimal Header */}
              <div className="px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between border-b border-slate-100/60 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                  <MapPin className="w-3 h-3 text-[#0052d1] dark:text-sky-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {searchQuery ? (i18n.language === 'en' ? `Results for "${searchQuery}"` : `Resulta para sa "${searchQuery}"`) : (i18n.language === 'en' ? 'Bauang Destinations' : 'Mga Destinasyon sa Bauang')}
                  </span>
                  {selectedCategory !== 'all' && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#0052d1]/10 text-[#0052d1] dark:bg-sky-500/20 dark:text-sky-300 flex items-center gap-1 shrink-0">
                      <span>{categoryOptions.find(c => c.id === selectedCategory)?.icon}</span>
                      <span>{i18n.language === 'fil' ? categoryOptions.find(c => c.id === selectedCategory)?.nameFil : categoryOptions.find(c => c.id === selectedCategory)?.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory('all');
                        }}
                        className="hover:text-rose-500 ml-0.5 cursor-pointer"
                        title={i18n.language === 'fil' ? 'Alisin ang Filter' : 'Remove Filter'}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsSearchFocused(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700 shrink-0"
                >
                  {i18n.language === 'en' ? 'Close' : 'Isara'}
                </button>
              </div>

              {/* In-Dropdown Horizontal Category Pill Strip with Smooth Scrolling & Arrow Controls */}
              <div className="relative px-1.5 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center">
                {/* Scroll Left Arrow */}
                <button
                  type="button"
                  onClick={() => scrollCategoryStrip('left')}
                  className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0052d1] hover:bg-slate-50 shrink-0 mx-0.5 z-10 cursor-pointer transition-all active:scale-95"
                  title="Scroll Left"
                  aria-label="Scroll Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Horizontal Scroll Area */}
                <div
                  ref={categoryScrollRef}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={handleCategoryMouseUp}
                  onMouseLeave={handleCategoryMouseUp}
                  className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar hide-scrollbar scrollbar-none py-0.5 px-1 select-none flex-1 scroll-smooth ${
                    isDraggingCategory ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{ touchAction: 'pan-x' }}
                >
                  {categoryOptions.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const label = i18n.language === 'fil' ? cat.nameFil : cat.name;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (!hasDraggedCategory.current) {
                            setSelectedCategory(isSelected && cat.id !== 'all' ? 'all' : cat.id);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer select-none active:scale-95 border ${
                          isSelected
                            ? 'bg-[#0052d1] text-white border-[#0052d1] shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                        }`}
                        title={label}
                      >
                        <span className="text-xs leading-none">{cat.icon}</span>
                        <span>{label}</span>
                        {cat.count !== undefined && cat.count > 0 && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {cat.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Scroll Right Arrow */}
                <button
                  type="button"
                  onClick={() => scrollCategoryStrip('right')}
                  className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0052d1] hover:bg-slate-50 shrink-0 mx-0.5 z-10 cursor-pointer transition-all active:scale-95"
                  title="Scroll Right"
                  aria-label="Scroll Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Active Category Search Match Callout */}
              {activeCategoryMatch && selectedCategory === 'all' && (
                <div className="mx-2.5 mt-2 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-200 font-semibold text-[11px] truncate mr-1">
                    <span className="text-sm shrink-0">{activeCategoryMatch.icon}</span>
                    <span className="truncate">
                      {i18n.language === 'fil'
                        ? `Kategorya: ${activeCategoryMatch.nameFil} (${displayedDestinations.length})`
                        : `Category: ${activeCategoryMatch.name} (${displayedDestinations.length})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(activeCategoryMatch.id);
                      setSearchQuery('');
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0052d1] text-white hover:bg-[#206afa] transition-colors shrink-0 cursor-pointer"
                  >
                    {i18n.language === 'fil' ? 'I-filter sa Mapa' : 'Filter on Map'}
                  </button>
                </div>
              )}

              {/* Compact Destination Rows */}
              <div className="overflow-y-auto max-h-[300px] sm:max-h-[360px] divide-y divide-slate-100/80 dark:divide-slate-800/50 no-scrollbar hide-scrollbar scrollbar-none">
                {displayedDestinations.map((loc) => {
                  const calc = calculateFare(Number(loc.standard_fare), isDiscountEligible, loc.discounted_fare);
                  const price = calc.finalFare;
                  const catMeta = getLocationCategoryMeta(loc);

                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectLocationFare(loc)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#0052d1] group-hover:text-white dark:group-hover:bg-[#206afa] dark:group-hover:text-white transition-colors text-sm shadow-2xs">
                          <span>{catMeta.icon || '📍'}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#0052d1] dark:group-hover:text-sky-400 transition-colors">
                              {loc.location_name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                              {i18n.language === 'fil' ? catMeta.nameFil : catMeta.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {loc.notes || 'Taripa-regulated location'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-[#0052d1] dark:text-sky-400">
                          ₱{price.toFixed(2)}
                        </div>
                        {isDiscountEligible ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">
                            -20% {passengerTypeInfo.label}
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

                {displayedDestinations.length === 0 && (
                  <div className="p-5 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                      🔍
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                      {selectedCategory !== 'all'
                        ? (i18n.language === 'fil' ? 'Walang nahanap sa napiling kategorya' : 'No destinations in this category')
                        : (i18n.language === 'fil' ? 'Walang nahanap na tugmang destinasyon o kategorya' : 'No matching destination or category found')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      {selectedCategory !== 'all' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('all')}
                          className="text-[#0052d1] dark:text-sky-400 font-bold underline cursor-pointer hover:opacity-80"
                        >
                          {i18n.language === 'fil' ? 'Ipakita ang lahat ng kategorya' : 'Show all categories'}
                        </button>
                      ) : (
                        i18n.language === 'fil'
                          ? 'Subukang maghanap gamit ang pangalan ng barangay o kategorya (hal. Simbahan, Farm, Beach).'
                          : 'Try searching by barangay name or category (e.g. Church, Farm, Beach).'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── CATEGORY FILTER (UNISWAP-STYLE DIALOG) BELOW SEARCH BAR ON LEFT SIDE ─── */}
        {!isSearchFocused && (
          <div className="mt-2 flex items-center gap-1.5 justify-start">
            <UniswapCategoryFilter
              categories={categoryOptions}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              totalLocationsCount={locationFares.length}
            />
          </div>
        )}
      </div>

      {/* 4. BOTTOM FLOATING ACTION BAR & DISPATCH TRACKER */}
      {hasSelectedDestination && (
        <div className="absolute bottom-24 sm:bottom-28 left-3 sm:left-4 right-3 sm:right-4 max-w-2xl mx-auto z-40 space-y-2">
          
          {/* Booking Error Notice */}
          {bookingError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Idle Booking Setup Card */}
          {bookingState === 'idle' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full border border-white/80 dark:border-slate-800 shadow-[0_12px_36px_rgba(0,82,209,0.18)] p-2 sm:p-2.5 px-3 sm:px-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`px-3 py-1 rounded-full text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ${
                    isDiscountEligible ? 'bg-emerald-600' : 'bg-[#0052d1]'
                  }`}>
                    ₱{currentFare}
                  </div>
                  {isDiscountEligible && (
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] line-through text-slate-400 font-bold leading-none">
                        ₱{currentStandardFare}
                      </span>
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-tight flex items-center gap-0.5">
                        <span>-20%</span>
                        <span>{passengerTypeInfo.label}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-[#0052d1] dark:text-sky-400 tracking-wider truncate">
                    {estimatedDistance > 30 ? '~1.8 km • ~5 min' : `${estimatedDistance} km • ~${Math.max(4, Math.round(estimatedDistance * 3.5))} min`}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#191c1e] dark:text-slate-100 truncate">
                    {selectedLocationFare?.location_name || destinationName}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartBooking}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0052d1] hover:bg-[#206afa] text-white rounded-full font-black text-xs sm:text-sm shadow-md shadow-[#0052d1]/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fcd400]" />
                <span>{i18n.language === 'en' ? 'Book Ride' : 'Mag-book'}</span>
              </button>
            </div>
          )}

          {/* Searching Dispatch State */}
          {bookingState === 'searching' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/80 dark:border-slate-800 shadow-[0_12px_36px_rgba(0,82,209,0.18)] p-3.5 sm:p-4 text-center space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-sky-100 text-[#0052d1] dark:bg-sky-950 dark:text-sky-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0052d1] animate-ping"></span>
                  <span>1.0 KM RADAR DISPATCH</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {nearbyDriversWithin1Km.length > 0
                    ? `${nearbyDriversWithin1Km.length} ${i18n.language === 'en' ? 'driver(s) in 1km' : 'drayber sa 1km'}`
                    : (i18n.language === 'en' ? 'Scanning 1km zone...' : 'Naka-antabay sa 1km...')}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-sky-200 animate-ping"></div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0052d1] text-white flex items-center justify-center relative z-10 shadow">
                    <Bike className="w-4 h-4 text-[#fcd400] animate-pulse" />
                  </div>
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {nearbyDriversWithin1Km.length > 0
                      ? (i18n.language === 'en' ? 'Notifying drivers within 1.0 km...' : 'Inaabisuhan ang mga drayber sa 1.0 km...')
                      : (i18n.language === 'en' ? 'Waiting for drivers in 1.0 km zone...' : 'Naka-antabay sa drayber sa 1.0 km...')}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{selectedLocationFare?.location_name || destinationName} •</span>
                    <strong className="text-slate-700 dark:text-slate-200">₱{currentFare}.00</strong>
                    {isDiscountEligible && (
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        -20% {passengerTypeInfo.label}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {nearbyDriversWithin1Km.length === 0 && (
                <div className="text-[10px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 p-2 rounded-xl border border-sky-200/70 dark:border-sky-800/60 text-left flex items-start gap-1.5 leading-tight">
                  <Sparkles className="w-3.5 h-3.5 text-[#0052d1] dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    {i18n.language === 'en'
                      ? 'No drivers currently inside 1.0 km. Your booking remains active and will instantly alert any driver who drives into your 1.0 km pickup area!'
                      : 'Kasalukuyang walang drayber sa loob ng 1.0 km. Naka-abang ang iyong biyahe at agad aabisuhan ang sinumang drayber na papasok sa 1.0 km!'}
                  </span>
                </div>
              )}

              <button
                onClick={handleCancelBooking}
                className="w-full py-2 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                {i18n.language === 'en' ? 'Cancel Booking' : 'Kanselahin ang Booking'}
              </button>
            </div>
          )}

          {/* Real Driver Assigned / En Route Card */}
          {bookingState === 'assigned' && activeBooking && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-[#0052d1]/30 dark:border-sky-500/30 shadow-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-sky-100 text-[#0052d1] dark:bg-sky-950 dark:text-sky-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#fcd400]" />
                  <span>{i18n.language === 'en' ? 'DRIVER EN ROUTE TO PICKUP' : 'PAPUNTA NA SI MANONG DRIVER'}</span>
                </span>
                <div className="text-right">
                  <span className="text-[11px] sm:text-xs font-black text-emerald-600 block">
                    ₱{Number(activeBooking.estimated_fare).toFixed(2)}
                  </span>
                  {isDiscountEligible && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block -mt-0.5">
                      -20% {passengerTypeInfo.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0052d1] text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0 border-2 border-white">
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
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[10px] sm:text-[11px] text-[#0052d1] dark:text-sky-400">
                      Body #{activeBooking.driver?.body_number || '0142'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold truncate">{activeBooking.driver?.plate_number || '1234-AB'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatModal(true);
                      setUnreadChatCount(0);
                    }}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#0052d1] text-white shadow-md hover:bg-[#003f9e] shrink-0 transition-transform active:scale-95 flex items-center justify-center cursor-pointer relative"
                    title="Mensahe sa Drayber"
                  >
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
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
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRebookModal}
                  className="flex-1 py-1.5 sm:py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0052d1] dark:text-sky-300 font-bold text-[11px] sm:text-xs hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'en' ? 'Rebook / Extend' : 'Rebook / Dagdag Destinasyon'}</span>
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="py-1.5 sm:py-2 px-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Cancel' : 'Kanselahin'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Driver Arrived Notification Banner */}
          {bookingState === 'arrived' && activeBooking && (
            <div className="bg-emerald-500 text-white rounded-2xl p-3 sm:p-4 shadow-xl space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
                <h4 className="font-black text-xs sm:text-sm">
                  {i18n.language === 'en' ? 'Driver Arrived at Pickup!' : 'Nasa Sakayan Na ang Iyong Tricycle!'}
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100">
                {i18n.language === 'en' ? `Please look out for Driver with Body #${activeBooking.driver?.body_number || '0142'} (Plate: ${activeBooking.driver?.plate_number || '1234-AB'}).` : `Paki-abangan si Manong Driver na may Body #${activeBooking.driver?.body_number || '0142'} (Plate: ${activeBooking.driver?.plate_number || '1234-AB'}).`}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowChatModal(true)}
                  className="flex-1 py-1.5 sm:py-2 rounded-xl bg-white text-[#0052d1] font-bold text-[11px] sm:text-xs shadow-sm hover:bg-sky-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Chat Driver' : 'Mensahe'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRebookModal}
                  className="py-1.5 sm:py-2 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] sm:text-xs border border-white/30 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  title="Rebook / Extend Destination"
                >
                  <Repeat className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Rebook' : 'Rebook'}</span>
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="py-1.5 sm:py-2 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] sm:text-xs border border-white/30 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Cancel' : 'Kansel'}</span>
                </button>
              </div>
            </div>
          )}

          {/* In Transit Active Journey Banner */}
          {bookingState === 'in_transit' && activeBooking && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-[#FF6B00]/40 shadow-xl p-3 sm:p-4 space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  {i18n.language === 'en' ? 'TRIP IN PROGRESS' : 'KASALUKUYANG BUMIBIYAHE'}
                </span>
                <div className="text-right">
                  <span className="text-[11px] sm:text-xs font-black text-[#0052d1] dark:text-sky-400 block">
                    ₱{Number(activeBooking.final_fare || activeBooking.estimated_fare).toFixed(2)}
                  </span>
                  {activeBooking.additional_fare != null && Number(activeBooking.additional_fare) > 0 && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block">
                      +₱{Number(activeBooking.additional_fare).toFixed(2)} Dagdag
                    </span>
                  )}
                  {isDiscountEligible && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block -mt-0.5">
                      -20% {passengerTypeInfo.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {i18n.language === 'en' ? 'Heading to:' : 'Patungong:'} {selectedLocationFare?.location_name || destinationName}
              </div>

              {activeBooking.rebook_count != null && Number(activeBooking.rebook_count) > 0 && (
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50">
                  <Repeat className="w-3 h-3 shrink-0" />
                  <span>Destinasyon ay na-rebook (+₱{Number(activeBooking.extension_fare || 0).toFixed(2)})</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowChatModal(true)}
                  className="flex-1 py-1.5 sm:py-2 rounded-xl bg-sky-50 text-[#0052d1] dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px] sm:text-xs border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Chat Driver' : 'Mensahe'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRebookModal}
                  className="flex-1 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] sm:text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Repeat className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Extend Route' : 'Dagdag Destinasyon'}</span>
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="py-1.5 sm:py-2 px-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-[11px] sm:text-xs hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{i18n.language === 'en' ? 'Cancel' : 'Kansel'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. PASSENGER E-RECEIPT & 5-STAR REVIEW RATING MODAL */}
      {showRatingModal && activeBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            
            {hasRated ? (
              <div className="py-8 space-y-2 animate-in zoom-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {i18n.language === 'en' ? 'Thank You!' : 'Salamat sa Feedback!'}
                </h3>
                <p className="text-xs text-slate-500">
                  {i18n.language === 'en' ? 'Your rating has been recorded.' : 'Naitatala na ang iyong rating sa profile ng driver.'}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#0052d1] text-white flex items-center justify-center mx-auto shadow-md">
                  <Bike className="w-6 h-6 text-[#fcd400]" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {i18n.language === 'en' ? 'Trip Completed!' : 'Tapos na ang Biyahe!'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {i18n.language === 'en' ? 'Thanks for riding with' : 'Salamat sa pagsakay kasama si'} {activeBooking.driver?.profile?.full_name || 'Driver'}.
                  </p>
                </div>

                {/* E-Receipt Strip */}
                {(() => {
                  let storedEvent: any = null;
                  try {
                    const ev = JSON.parse(localStorage.getItem('pasada_active_trip_event') || '{}');
                    if (ev?.id === activeBooking.id) storedEvent = ev;
                    if (!storedEvent) {
                      const bk = JSON.parse(localStorage.getItem(`pasada_booking_${activeBooking.id}`) || '{}');
                      if (bk?.id === activeBooking.id) storedEvent = bk;
                    }
                  } catch {}

                  const originalDest = activeBooking.original_destination_name || storedEvent?.original_destination_name;
                  const origFare = Number(activeBooking.original_fare || storedEvent?.original_fare || 20);
                  const rebookCount = Number(activeBooking.rebook_count || storedEvent?.rebook_count || 0);
                  const isRebooked = Boolean(
                    rebookCount > 0 ||
                    (originalDest && originalDest !== activeBooking.destination_name) ||
                    (activeBooking.extension_fare || storedEvent?.extension_fare)
                  );
                  const extensionFare = Number(
                    activeBooking.extension_fare ||
                    storedEvent?.extension_fare ||
                    Math.max(0, Number(activeBooking.estimated_fare) - origFare)
                  );

                  const rawAddFare = activeBooking.additional_fare ?? storedEvent?.additional_fare;
                  const effectiveAddFare = rawAddFare != null 
                    ? Number(rawAddFare) 
                    : Math.max(0, Number(activeBooking.final_fare || storedEvent?.final_fare || 0) - Number(activeBooking.base_fare || storedEvent?.base_fare || activeBooking.estimated_fare || 20));

                  const effectiveBaseFare = Number(activeBooking.base_fare || storedEvent?.base_fare || activeBooking.estimated_fare || 20);
                  const effectiveReason = activeBooking.additional_fare_reason || storedEvent?.additional_fare_reason || '';
                  const effectiveDiscount = Number(activeBooking.discount_amount ?? storedEvent?.discount_amount ?? 0);
                  const effectiveFinalFare = Number(activeBooking.final_fare || storedEvent?.final_fare || activeBooking.estimated_fare || 20);

                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-left min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              {i18n.language === 'en' ? 'Fare Paid' : 'Bayad na Pamasahe'}
                            </span>
                            {isRebooked && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                                <Repeat className="w-2.5 h-2.5" />
                                <span>Rebooked</span>
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            {activeBooking.destination_name}
                          </span>
                          {isRebooked && originalDest && (
                            <span className="text-[10px] text-slate-400 line-through block truncate">
                              {i18n.language === 'en' ? 'Original Booking' : 'Dating Destinasyon'}: {originalDest}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-black text-[#0052d1] dark:text-sky-400">
                            ₱{effectiveFinalFare.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Rebooking Route History Details (Shows Past Booked + Extension) */}
                      {isRebooked && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1 text-[11px] text-left">
                          <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 font-extrabold">
                            <span className="flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              <span>{i18n.language === 'en' ? 'Rebooking History' : 'Detalye ng Rebooking'}</span>
                            </span>
                            <span className="text-[9px] bg-amber-200 dark:bg-amber-800/80 px-1.5 py-0.2 rounded-full font-black">
                              {rebookCount ? `${rebookCount}x Rebooked` : 'Extended'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>1. {i18n.language === 'en' ? 'Initial Booking' : 'Unang Nai-book'} ({originalDest || 'Dating Babaan'}):</span>
                            <span className="font-bold">₱{origFare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-amber-800 dark:text-amber-300 font-bold">
                            <span>2. {i18n.language === 'en' ? 'Extension' : 'Rebook Extension'} ({activeBooking.destination_name}):</span>
                            <span>+₱{extensionFare.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Itemized Surcharge & Discount Breakdown */}
                      {(effectiveAddFare > 0 || isRebooked || effectiveDiscount > 0) && (
                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5 text-left font-medium">
                          <div className="flex justify-between">
                            <span>{i18n.language === 'en' ? 'Base Tariff' : 'Base Taripa'} {isRebooked ? `(${i18n.language === 'en' ? 'Cumulative' : 'Pinagsama'})` : ''}:</span>
                            <span>₱{effectiveBaseFare.toFixed(2)}</span>
                          </div>
                          {effectiveAddFare > 0 && (
                            <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-400">
                              <span>{i18n.language === 'en' ? 'Additional Surcharge' : 'Karagdagang Singil'} {effectiveReason ? `(${effectiveReason})` : ''}:</span>
                              <span>+₱{effectiveAddFare.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-400">
                            <span>{i18n.language === 'en' ? 'Subtotal (Gross)' : 'Subtotal (Bago Diskwento)'}:</span>
                            <span>₱{(effectiveBaseFare + effectiveAddFare).toFixed(2)}</span>
                          </div>
                          {effectiveDiscount > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                              <span>Diskwento (-20% {getPassengerTypeInfo(activeBooking.passenger?.passenger_type).label}):</span>
                              <span>-₱{effectiveDiscount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Interactive 5-Star Selector */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {i18n.language === 'en' ? 'Rate your driver service:' : 'I-rate ang serbisyo ni Manong Driver:'}
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
                  placeholder={i18n.language === 'en' ? 'Leave a review comment (e.g. Safe driving, courteous)...' : 'Mag-iwan ng komento (hal. Maingat magmaneho, magalang)...'}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052d1]/20 resize-none"
                />

                {/* Submit CTA */}
                <button
                  onClick={handleSubmitRating}
                  disabled={isSubmittingRating}
                  className="w-full py-3.5 rounded-full bg-[#0052d1] hover:bg-[#206afa] text-white font-bold text-sm shadow-lg shadow-[#0052d1]/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#fcd400]" />
                  <span>{isSubmittingRating ? (i18n.language === 'en' ? 'Submitting...' : 'Isinusumite...') : (i18n.language === 'en' ? 'Submit Rating & Done' : 'Ipadala ang Rating at Tapusin')}</span>
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
                {i18n.language === 'en' ? 'Cancel Booking?' : 'Kanselahin ang Booking?'}
              </h3>
              <p className="text-xs text-slate-500">
                {i18n.language === 'en' ? 'Are you sure you want to cancel your ride request?' : 'Sigurado ka bang nais mong kanselahin ang iyong booking request?'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                disabled={isCancellingBooking}
                onClick={handleConfirmCancelBooking}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancellingBooking ? (i18n.language === 'en' ? 'Cancelling...' : 'Kinakansela...') : (i18n.language === 'en' ? 'Yes, Cancel' : 'Oo, Kanselahin')}
              </button>
              <button
                disabled={isCancellingBooking}
                onClick={() => setShowPassengerCancelModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {i18n.language === 'en' ? 'Keep Ride (Do Not Cancel)' : 'Huwag Kanselahin (Ipagpatuloy ang Biyahe)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSENGER REBOOK / EXTEND DESTINATION MODAL */}
      {showRebookModal && activeBooking && (
        <div className="fixed inset-0 z-[10100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                    {i18n.language === 'en' ? 'Rebook / Extend Destination' : 'Rebook / Dagdag Destinasyon'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    {i18n.language === 'en' ? 'Add drop-off location to current trip' : 'Dagdagan ang biyahe patungo sa bagong destinasyon'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRebookModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Ride Status Pill */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  {i18n.language === 'en' ? 'CURRENT DESTINATION' : 'KASALUKUYANG DESTINASYON'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[11px] sm:text-xs">
                  {activeBooking.destination_name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  {i18n.language === 'en' ? 'CURRENT FARE' : 'BAYAD NGAYON'}
                </span>
                <span className="font-mono font-black text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  ₱{Number(activeBooking.estimated_fare).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Search / Destination Input */}
            <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{i18n.language === 'en' ? 'Choose New Destination' : 'Pumili ng Bagong Destinasyon'}:</span>
                {rebookSelectedLocation && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">✓ Naipili</span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={rebookSearchQuery}
                  onChange={(e) => setRebookSearchQuery(e.target.value)}
                  placeholder={i18n.language === 'en' ? 'Search destination or category (e.g. Church, Farm)...' : 'Maghanap ng destinasyon o kategorya (hal. Simbahan, Farm)...'}
                  className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-[#0052d1] focus:ring-1 focus:ring-[#0052d1] outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                {rebookSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRebookSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Selectable Destination Chips */}
              <div className="overflow-y-auto max-h-36 sm:max-h-44 pr-1 space-y-1.5 mt-2 no-scrollbar hide-scrollbar scrollbar-none">
                {(() => {
                  const filtered = locationFares.filter((lf) => {
                    if (!rebookSearchQuery) return true;
                    return matchesLocationSearch(lf, rebookSearchQuery);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-4 text-slate-400 text-xs">
                        {i18n.language === 'en' ? 'No matching destinations or categories found' : 'Walang nahanap na destinasyon o kategorya'}
                      </div>
                    );
                  }

                  return filtered.map((loc) => {
                    const isSelected = rebookSelectedLocation?.id === loc.id;
                    const fareAmt = Number(loc.standard_fare || 20);
                    const catMeta = getLocationCategoryMeta(loc);

                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setRebookSelectedLocation(loc)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0052d1]/10 border-[#0052d1] ring-1 ring-[#0052d1]'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs ${
                            isSelected ? 'bg-[#0052d1] text-white' : 'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            <span>{catMeta.icon || '📍'}</span>
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block">
                                {loc.location_name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                {i18n.language === 'fil' ? catMeta.nameFil : catMeta.name}
                              </span>
                            </div>
                            {(loc.description || loc.notes) && (
                              <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                                {loc.description || loc.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            +₱{fareAmt.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Live Cumulative Fare Calculation Preview Card */}
            {rebookSelectedLocation && (() => {
              const calc = calculateFare(
                Number(rebookSelectedLocation.standard_fare || 20),
                isDiscountEligible,
                rebookSelectedLocation.discounted_fare
              );
              const currentFare = Number(activeBooking.estimated_fare || 20);
              const extensionFare = calc.finalFare;
              const accumulatedTotal = currentFare + extensionFare;

              return (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>Kasalukuyang Pamasahe:</span>
                    <span className="font-mono font-semibold">₱{currentFare.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-medium">
                    <span>Dagdag Patungong {rebookSelectedLocation.location_name}:</span>
                    <span className="font-mono font-bold">+₱{extensionFare.toFixed(2)}</span>
                  </div>
                  {calc.isDiscounted && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <span>-20% Commuter Diskwento:</span>
                      <span>-₱{calc.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black text-amber-900 dark:text-amber-200 block">
                        {i18n.language === 'en' ? 'New Total Fare' : 'Bagong Kabuuang Bayad'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {i18n.language === 'en' ? 'Cumulative addition to current ride' : 'Pinagsamang bayad sa orihinal at extension'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#0052d1] dark:text-sky-400 font-mono">
                        ₱{accumulatedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRebookModal(false)}
                disabled={isSubmittingRebook}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                {i18n.language === 'en' ? 'Back / Cancel' : 'Bumalik'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRebook}
                disabled={!rebookSelectedLocation || isSubmittingRebook}
                className="flex-1 py-2 rounded-xl bg-[#0052d1] hover:bg-[#003f9e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmittingRebook ? (
                  <span>{i18n.language === 'en' ? 'Updating...' : 'Ina-update...'}</span>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{i18n.language === 'en' ? 'Confirm Extension' : 'Kumpirmahin'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. IN-TRIP CHAT MODAL */}
      {activeBooking && (
        <InTripChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          bookingId={activeBooking.id}
          currentUserId={user?.id || 'passenger'}
          currentUserRole="passenger"
          currentUserName={user?.full_name || 'Pasahero'}
          otherPartyName={activeBooking.driver?.profile?.full_name ? `${activeBooking.driver.profile.full_name} (Body #${activeBooking.driver.body_number || 'Tricycle'})` : 'Tricycle Driver'}
          otherPartySubtitle={`${activeBooking.origin_name} ➔ ${activeBooking.destination_name}`}
        />
      )}

      {/* 8. IN-PHONE MESSAGE NOTIFICATION BANNER (HEADS-UP TOAST) */}
      {activeBooking && (
        <InPhoneMessageBanner
          bookingId={activeBooking.id}
          currentUserId={user?.id || 'passenger'}
          currentUserRole="passenger"
          isChatOpen={showChatModal}
          onOpenChat={() => {
            setShowChatModal(true);
            setUnreadChatCount(0);
          }}
        />
      )}

    </div>
  );
};
