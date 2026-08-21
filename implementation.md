# PasadaGuide — Web & Mobile Implementation Plan

### Mobile-Responsive Tricycle Fare Transparency & Booking System

**Stack:** React + Tailwind CSS + Supabase (Backend-as-a-Service)

---

## 1. System Overview

**PasadaGuide** is a digital platform for local tricycle fare transparency, dispatch, tourist guides, and complaint management. The system serves three role-based user groups across a unified, responsive React frontend and a shared Supabase backend:

| Role | Interface Surface | Core Capabilities |
| --- | --- | --- |
| **Passenger** | Mobile-responsive React Web / PWA | Destination search, upfront fare calculation, tricycle booking, live GPS tracking, safety alerts, audio tours, digital fare receipts, ratings, complaints. |
| **Driver** | Mobile-responsive React Web / PWA | Ride request queue, acceptance/rejection, live turn-by-turn passenger routing, trip status management, passenger rating, earnings summary. |
| **Administrator** | Desktop-optimized React Web Dashboard | TODA/terminal management, dynamic fare matrix updates, driver verification, dispute/complaint resolution, GIS analytics. |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Responsive React Client Layer                     │
│                        (React + Tailwind CSS + Vite)                    │
│                                                                         │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐  │
│  │ Mobile PWA Client         │         │ Admin Web Portal            │  │
│  │ (Passenger & Driver Views)│         │ (LGU / TODA / MITO Desk UI) │  │
│  │ • Tailwind Touch Layouts  │         │ • Tailwind Data Tables      │  │
│  │ • React-Leaflet (OSM)     │         │ • Recharts / Leaflet Map    │  │
│  │ • Web Geolocation API     │         │ • Complaint Triage Worklist │  │
│  │ • Workbox Service Worker  │         │ • Fare Matrix Versioning    │  │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘  │
└────────────────┼──────────────────────────────────────┼─────────────────┘
                 │                                      │
                 │     @supabase/supabase-js (v2)       │
                 └──────────────────┬───────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                            Supabase Platform                            │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│ │ Auth (RLS / OTP)     │ │ PostgreSQL Database  │ │ Realtime Channels │ │
│ │ • Role verification  │ │ • Geolocation data   │ │ • Driver GPS      │ │
│ │ • Session management │ │ • Dynamic fare rules │ │ • Dispatch queue  │ │
│ └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│ │ Storage Buckets      │ │ Edge Functions (Deno)│ │ pg_cron / Webhooks│ │
│ │ • Driver KYC photos  │ │ • Fare computation   │ │ • Stale dispatch  │ │
│ │ • Audio tour tracks  │ │ • PDF receipt engine │ │ • Push/SMS alerts │ │
│ └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

```

### Key Architectural Decisions

* **Single Responsive Codebase:** Built with React and Tailwind CSS. The mobile viewport is structured with native-like mobile view containers (`h-[100dvh]`, touch targets $\ge 48\text{px}$, bottom-sheet drawers, and swipeable tabs) while responsive breakpoints adapt dynamically for tablet and desktop viewports.
* **Open-Source Mapping:** Uses OpenStreetMap (OSM) base tiles rendered through `react-leaflet`, avoiding proprietary map API subscription fees while maintaining parity between mobile and admin maps.
* **Tamper-Proof Edge Computations:** Upfront fare estimates and final calculations are executed in Supabase Edge Functions to prevent client-side rate manipulation.
* **Realtime Communication:** Supabase Realtime channels power low-latency driver dispatch broadcasting, live GPS position updates, in-trip status transitions, and in-app chat.

---

## 3. Database Schema & Security (Supabase / PostgreSQL)

### 3.1 Core Database Tables

```sql
-- Extensions
create extension if not exists "postgis";

-- Enum Types
create type user_role as enum ('passenger', 'driver', 'admin');
create type booking_status as enum (
  'searching', 'driver_assigned', 'driver_arrived', 
  'in_transit', 'completed', 'cancelled'
);
create type payment_method as enum ('cash', 'digital_wallet');
create type complaint_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- 1. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'passenger',
  full_name text not null,
  phone_number text,
  photo_url text,
  language_pref text default 'fil',
  created_at timestamptz default now()
);

-- 2. Drivers Table (Role Extension)
create table public.drivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  terminal_id uuid,
  tricycle_model text not null,
  plate_number text not null unique,
  body_number text not null,
  verification_status text default 'pending',
  is_available boolean default false,
  current_lat double precision,
  current_lng double precision,
  rating_avg numeric(3,2) default 5.00,
  updated_at timestamptz default now()
);

-- 3. Terminals
create table public.terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  coverage_polygon jsonb
);

-- 4. Fare Matrix (Versioned & Immutable History)
create table public.fare_matrix (
  id uuid primary key default gen_random_uuid(),
  origin_terminal_id uuid references public.terminals(id),
  base_fare numeric(6,2) not null,
  base_km numeric(4,2) default 1.00,
  per_km_rate numeric(6,2) not null,
  night_differential_multiplier numeric(3,2) default 1.00,
  effective_date date not null default current_date,
  updated_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 5. Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(id),
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_name text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  estimated_distance_km numeric(5,2) not null,
  estimated_duration_min integer not null,
  estimated_fare numeric(8,2) not null,
  final_fare numeric(8,2),
  cancellation_fee numeric(8,2) default 0.00,
  cancellation_reason text,
  cancelled_by uuid references public.profiles(id),
  status booking_status not null default 'searching',
  payment_method payment_method default 'cash',
  created_at timestamptz default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

-- 6. Ratings & Reviews
create table public.trip_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  passenger_rating smallint check (passenger_rating between 1 and 5),
  passenger_feedback text,
  driver_rating smallint check (driver_rating between 1 and 5),
  driver_feedback text,
  created_at timestamptz default now()
);

-- 7. Complaints
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  passenger_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(id),
  category text not null,
  description text not null,
  status complaint_status default 'open',
  resolution_notes text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- 8. Tourist Spots
create table public.tourist_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  lat double precision not null,
  lng double precision not null,
  opening_hours text,
  audio_url text,
  cover_image_url text,
  qr_code_ref text unique
);

```

### 3.2 Row-Level Security (RLS) Policies

```sql
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.drivers enable row level security;
alter table public.fare_matrix enable row level security;

-- Profiles: users can read public details; edit only their own
create policy "Read all profiles" on public.profiles
  for select using (true);

create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Bookings: passengers and drivers can view bookings they are party to; admins see all
create policy "Parties view bookings" on public.bookings
  for select using (
    auth.uid() = passenger_id 
    or auth.uid() = driver_id 
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Passengers insert booking requests
create policy "Passengers create bookings" on public.bookings
  for insert with check (auth.uid() = passenger_id);

-- Drivers update assigned bookings or accept open ones
create policy "Driver update booking status" on public.bookings
  for update using (
    auth.uid() = driver_id 
    or (status = 'searching' and (select role from public.profiles where id = auth.uid()) = 'driver')
  );

-- Fare Matrix: public read; admin write only
create policy "Public read fare matrix" on public.fare_matrix
  for select using (true);

create policy "Admin modify fare matrix" on public.fare_matrix
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

```

---

## 4. Detailed Passenger Booking Flow Implementation

The passenger journey is implemented as a reactive state machine using React state and Supabase Realtime subscriptions.

```
[Search & Select Destination]
            │
            ▼
[Upfront Fare & Route Calculation] (Edge Function)
            │
            ▼
[Broadcast Booking Request] ──────── (Status: 'searching')
            │
    ┌───────┴───────────────────────┐
    │                               │
(Driver Accepts)            (Timeout / No Driver)
    │                               │
    ▼                               ▼
[Driver Assigned]           [Retry / Adjust Fare UI]
(Live ETA, Route, Chat)
    │
    ▼
[Driver Arrived at Pickup] (Waiting Timer)
    │
    ▼
[Trip In Progress] (Live Map & SOS Emergency Button)
    │
    ▼
[Trip Completed] (Fare Summary & Breakdown)
    │
    ▼
[Payment & Two-Way Rating Review]

```

### Stage-by-Stage Specifications

#### 1. Destination Search & Upfront Fare Estimation

* Passenger searches for destinations via an address autocomplete search input or by directly tapping the map.
* The frontend invokes the `calculate-fare` Edge Function with coordinates for origin and destination.
* Upfront fare is computed and rendered with trip distance ($km$) and estimated duration ($min$) before any booking request is dispatched.

#### 2. Booking Request & Realtime Dispatch

* Passenger clicks **"Confirm & Request Tricycle"**.
* A record is inserted into `bookings` with `status: 'searching'`.
* Realtime channel (`dispatch-channel`) broadcasts the request to all verified, online drivers located within the terminal boundary or a $2.5\text{ km}$ geofence.

#### 3. Waiting & Timeout Handling

* UI displays an animated **"Finding your driver..."** radar state.
* A $60$-second countdown timer runs client-side while listening to Realtime updates on the specific `booking.id`.
* **Passenger Cancellation:** Free cancellation with instant status update to `cancelled`.
* **Timeout Behavior:** If no driver accepts within $60\text{ seconds}$, provide options:
1. *Retry Request* (re-triggers broadcast).
2. *Adjust Fare / Add Tip* (updates `estimated_fare`).
3. *View Terminal Hotspots* (shows closest physical tricycle terminal on the map).



#### 4. Driver Acceptance & Route to Pickup

* When a driver taps "Accept", the record transitions to `driver_assigned` with `driver_id: auth.uid()`.
* **Driver View:** Displays route to the passenger's pickup coordinates with a "Navigate" option.
* **Passenger View:** Instantly renders the driver's profile card (photo, name, plate number, body number, average rating), contact actions (Direct Call / In-app Chat drawer), and the live driver marker moving toward pickup with dynamic ETA.
* **Cancellation Rules:**
* Cancellation after driver assignment calculates whether driver traveled $>200\text{ meters}$ or $>2\text{ minutes}$, appending a predetermined flat cancellation fee if applicable.



#### 5. Driver Arrival at Pickup

* Driver taps **"Arrived at Pickup"** (status: `driver_arrived`).
* Passenger receives an audible and haptic notification.
* A $3$-minute grace period timer is initiated.

#### 6. Trip in Progress & Safety

* Driver taps **"Start Trip"** (status: `in_transit`).
* Map re-centers on the active route from pickup to destination.
* **Safety Feature:** A high-contrast **Emergency / SOS Button** is pinned on screen. Tapping it opens a one-touch modal with:
* Direct emergency dialer (LGU Emergency Hotline / PNP).
* Direct "Share Trip Link" action copying a secure tracking link containing live GPS telemetry.



#### 7. Trip Completion & Payment

* Driver taps **"Arrived at Destination"** (status: `completed`).
* Digital fare summary is calculated including any surcharges or discounts.
* Passenger selects payment method (**Cash** or **Digital Wallet**).

#### 8. Two-Way Rating & Reviews

* A rating modal is presented to both passenger and driver simultaneously:
* 1 to 5 Star selector with preset quick tags (e.g., *Safe Driver*, *Clean Vehicle*, *Courteous*).
* Optional written feedback.


* Upon rating submission, user returns to the primary map interface.

---

## 5. Mobile-Responsive React & Tailwind Architecture

Since the client uses React (rather than React Native), the interface is engineered as an **App-Shell Single Page Application** with tailored mobile design tokens and PWA integration.

### 5.1 Tailwind Design Tokens & Mobile Helpers

```javascript
// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        slate: {
          850: '#151f32',
        }
      },
      height: {
        'screen-dvh': '100dvh', // Dynamic viewport height for iOS/Android address bars
      }
    }
  },
  plugins: [],
};

```

### 5.2 Responsive Layout Strategy

```tsx
// src/components/layout/AppShell.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import MobileNavbar from './MobileNavbar';
import DesktopSidebar from './DesktopSidebar';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen-dvh w-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Desktop/Admin Sidebar: Visible only on lg screens */}
      {user?.role === 'admin' && (
        <aside className="hidden lg:flex lg:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-col">
          <DesktopSidebar />
        </aside>
      )}

      {/* Main Viewport Container */}
      <main className="relative flex-1 flex flex-col h-full w-full max-w-lg mx-auto lg:max-w-none shadow-2xl lg:shadow-none overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 relative overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        
        {/* Mobile App Bar: Visible on small viewports */}
        <div className="lg:hidden">
          <MobileNavbar />
        </div>
      </main>
    </div>
  );
};

```

### 5.3 Offline Support & PWA Setup

* **Service Worker (`vite-plugin-pwa`):** Caches the application bundle, OpenStreetMap tiles, audio tour files, and terminal metadata.
* **Local Fallback:** Uses `idb-keyval` (IndexedDB) to cache active fare matrices and tourist spots for offline calculations and browsing when connectivity is lost.

---

## 6. Frontend Project Structure

```
pasadaguide-web/
├── public/
│   ├── icons/
│   ├── audio/
│   └── manifest.json
├── src/
│   ├── api/
│   │   ├── supabaseClient.ts      # Initialized Supabase client
│   │   └── edgeFunctions.ts       # Typed wrappers for Edge Function calls
│   ├── components/
│   │   ├── common/                # Buttons, Modals, Drawers, Inputs
│   │   ├── map/
│   │   │   ├── MapContainer.tsx   # React-Leaflet base
│   │   │   ├── DriverMarker.tsx   # Animated driver marker
│   │   │   └── RoutePolyline.tsx  # Dynamic path rendering
│   │   ├── booking/
│   │   │   ├── DestinationSearch.tsx
│   │   │   ├── FareEstimateCard.tsx
│   │   │   ├── DriverDispatchRadar.tsx
│   │   │   ├── ActiveRideCard.tsx
│   │   │   └── RatingModal.tsx
│   │   ├── tourism/
│   │   │   ├── TouristSpotCard.tsx
│   │   │   ├── AudioTourPlayer.tsx
│   │   │   └── QRScannerModal.tsx # html5-qrcode integration
│   │   ├── admin/
│   │   │   ├── FareMatrixEditor.tsx
│   │   │   ├── ComplaintTable.tsx
│   │   │   └── DriverKYCList.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       └── MobileNavbar.tsx
│   ├── hooks/
│   │   ├── useAuth.ts             # Profile & role state
│   │   ├── useBookingFlow.ts      # Active ride state machine
│   │   ├── useDriverLocation.ts   # HTML5 Geolocation broadcaster
│   │   └── useRealtimeChannel.ts  # Supabase subscription hooks
│   ├── i18n/
│   │   ├── config.ts              # i18next configuration
│   │   └── locales/
│   │       ├── en.json
│   │       └── fil.json           # Default Filipino locale
│   ├── pages/
│   │   ├── PassengerHome.tsx
│   │   ├── DriverDashboard.tsx
│   │   ├── AdminPortal.tsx
│   │   ├── TouristGuide.tsx
│   │   └── HistoryAndReceipts.tsx
│   ├── types/
│   │   └── database.types.ts      # Generated Supabase TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                  # Tailwind directives & base styles
├── supabase/
│   ├── functions/
│   │   ├── calculate-fare/
│   │   │   └── index.ts           # Serverless fare algorithm
│   │   └── generate-receipt/
│   │       └── index.ts           # PDF receipt generator
│   └── migrations/
│       └── 20260101_initial_schema.sql
├── tailwind.config.js
├── vite.config.ts
└── package.json

```

---

## 7. Key Module Implementations

### 7.1 Fare Calculation Edge Function (`calculate-fare`)

```typescript
// supabase/functions/calculate-fare/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { origin_terminal_id, distance_km, duration_min } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the latest effective fare matrix
    const { data: matrix, error } = await supabase
      .from('fare_matrix')
      .select('*')
      .eq('origin_terminal_id', origin_terminal_id)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !matrix) {
      throw new Error("Fare matrix not found for this terminal.");
    }

    const baseFare = Number(matrix.base_fare);
    const baseKm = Number(matrix.base_km);
    const perKmRate = Number(matrix.per_km_rate);

    let calculatedFare = baseFare;
    if (distance_km > baseKm) {
      calculatedFare += (distance_km - baseKm) * perKmRate;
    }

    // Check night differential (10:00 PM to 4:00 AM)
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 4;
    if (isNight) {
      calculatedFare *= Number(matrix.night_differential_multiplier || 1.15);
    }

    const finalEstimate = Math.round(calculatedFare * 100) / 100;

    return new Response(
      JSON.stringify({
        estimated_fare: finalEstimate,
        distance_km,
        duration_min,
        is_night_differential: isNight,
        breakdown: {
          base_fare: baseFare,
          excess_km_charge: distance_km > baseKm ? (distance_km - baseKm) * perKmRate : 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

```

### 7.2 Driver Location Broadcast Hook (React)

```typescript
// src/hooks/useDriverLocation.ts
import { useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

export const useDriverLocation = (driverId: string | undefined, isOnline: boolean) => {
  useEffect(() => {
    if (!driverId || !isOnline || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // 1. Update in Postgres for spatial queries
        await supabase
          .from('drivers')
          .update({
            current_lat: latitude,
            current_lng: longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', driverId);

        // 2. Broadcast high-frequency updates via Realtime Broadcast channel
        const channel = supabase.channel(`tracking:${driverId}`);
        channel.send({
          type: 'broadcast',
          event: 'location_update',
          payload: { lat: latitude, lng: longitude },
        });
      },
      (err) => console.error("Geolocation watch error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverId, isOnline]);
};

```

---

## 8. Development & Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation (Auth, DB, Base Shell, i18n)                      │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Upfront Fare Engine & Map Visualization                       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Realtime Passenger Booking & Driver Dispatch Flow             │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Trip Lifecycle, In-Trip Safety (SOS) & Two-Way Reviews        │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Tourism Guide (Audio Tours, QR Scanner) & Complaints System   │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 6: Admin Web Dashboard & Fare Matrix Management                  │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 7: PWA Offline Resilience & Production Hardening                 │
└────────────────────────────────────────────────────────────────────────┘

```

| Phase | Duration | Key Deliverables |
| --- | --- | --- |
| **Phase 1: Foundation** | Week 1–2 | Vite + React + Tailwind setup, Supabase database migrations, RLS policies, role-based Auth routing, Filipino/English translation setup. |
| **Phase 2: Fare Engine & Maps** | Week 3 | Leaflet map integration, terminal markers, `calculate-fare` Edge Function implementation (<3 second benchmark), offline fare matrix caching. |
| **Phase 3: Booking Flow** | Week 4–5 | End-to-end booking state machine, driver broadcast radar, driver acceptance queue, dynamic ETA calculation, and cancellation rules. |
| **Phase 4: Safety & Reviews** | Week 6 | In-trip live tracking, SOS emergency button, driver/passenger contact drawer, completion summary, and two-way review schema. |
| **Phase 5: Tourism & Complaints** | Week 7 | Web QR scanner (`html5-qrcode`), audio player with offline storage, and passenger complaint submission with admin notification webhooks. |
| **Phase 6: Admin Dashboard** | Week 8 | Responsive desktop dashboard layout, dynamic fare matrix editor with date versioning, driver verification triage, and dispute resolution table. |
| **Phase 7: PWA & Hardening** | Week 9 | Workbox service worker configuration, Data Privacy Act compliance audit, audit logging, and mobile cross-browser testing (Chrome & Safari). |

---

## 9. Technology Stack Summary

| Layer | Technology | Function |
| --- | --- | --- |
| **Client Framework** | React 18+ (Vite) | Single-Page Application (SPA) architecture |
| **Styling & Layout** | Tailwind CSS | Mobile-first utility design and responsive viewport layouts |
| **UI Components** | Lucide React + Headless UI / Radix | Accessible mobile touch components and drawers |
| **Mapping** | Leaflet.js + `react-leaflet` | OpenStreetMap rendering, custom markers, polyline routing |
| **QR & Media** | `html5-qrcode` & HTML5 Audio API | Tourist spot scanning and audio tour streaming |
| **Backend & Auth** | Supabase (PostgreSQL 15+) | Data persistence, RLS security, and identity |
| **Realtime Sync** | Supabase Realtime | Live driver GPS broadcast and booking dispatch channels |
| **Serverless Logic** | Supabase Edge Functions (Deno) | Upfront fare calculation engine and PDF receipts |
| **Localization** | `i18next` + `react-i18next` | Seamless bilingual switching (Tagalog/Filipino & English) |
| **Offline & PWA** | `vite-plugin-pwa` + `idb-keyval` | Service worker asset caching and local storage fallback |