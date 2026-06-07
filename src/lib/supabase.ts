import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are valid
const useRealSupabase = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

export const supabase = useRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'rentdrive',
      },
    })
  : null;

// Local JSON database simulation
const dbFilePath = path.resolve(process.cwd(), 'src/contracts/db.json');

const defaultDb = {
  users: [
    { address: '0xF1Ef4c6c486614b3455D583cCaAFcC8d694847a1', name: 'RentDrive Admin', role: 'admin', created_at: new Date().toISOString() },
    { address: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u', name: 'Alice Car Owner', role: 'owner', created_at: new Date().toISOString() },
    { address: '0x1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t', name: 'Bob Renter', role: 'renter', created_at: new Date().toISOString() }
  ],
  vehicles: [
    {
      id: 1,
      contract_id: 1,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '29A-888.88',
      model: 'Tesla Model Y Performance (2024)',
      image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 5.0,
      rate_per_km: 0.5,
      speed_limit_kmh: 100,
      speed_penalty_usdc: 50.0,
      deposit_required: 200.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 5000,
      geofence_violation_penalty: 30.0,
      accepted_currency: 'USDC',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      contract_id: 2,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '30K-999.99',
      model: 'Ducati Panigale V4 S (2025)',
      image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 8.0,
      rate_per_km: 0.8,
      speed_limit_kmh: 120,
      speed_penalty_usdc: 80.0,
      deposit_required: 300.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 3000,
      geofence_violation_penalty: 40.0,
      accepted_currency: 'EURC',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  rentals: [],
  telemetry_logs: [],
  reviews: []
};

// Initialize DB file if not exists
const initializeDb = () => {
  if (typeof window === 'undefined') {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbFilePath)) {
      fs.writeFileSync(dbFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
    }
  }
};

export const getLocalDb = () => {
  initializeDb();
  if (typeof window === 'undefined') {
    try {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.reviews) {
        parsed.reviews = [];
      }
      return parsed;
    } catch (e) {
      return defaultDb;
    }
  }
  return defaultDb;
};

export const writeLocalDb = (data: any) => {
  if (typeof window === 'undefined') {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  }
};

// Client-side & Server-side unified database access layer
export const db = {
  getUsers: async () => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    }
    return getLocalDb().users;
  },
  
  getUser: async (address: string) => {
    const addr = address.toLowerCase();
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('address', addr).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    return getLocalDb().users.find((u: any) => u.address.toLowerCase() === addr) || null;
  },

  createUser: async (user: { address: string; name: string; role: string }) => {
    const addr = user.address.toLowerCase();
    const newUser = { ...user, address: addr, created_at: new Date().toISOString() };
    
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('users').upsert(newUser).select().single();
      if (error) throw error;
      return data;
    }
    
    const local = getLocalDb();
    const exists = local.users.findIndex((u: any) => u.address.toLowerCase() === addr);
    if (exists >= 0) {
      local.users[exists] = { ...local.users[exists], ...newUser };
    } else {
      local.users.push(newUser);
    }
    writeLocalDb(local);
    return newUser;
  },

  getVehicles: async () => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('vehicles').select('*');
      if (error) throw error;
      return data;
    }
    return getLocalDb().vehicles;
  },

  createVehicle: async (vehicle: any) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('vehicles').insert(vehicle).select().single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const newVehicle = {
      ...vehicle,
      id: local.vehicles.length + 1,
      contract_id: local.vehicles.length + 1,
      created_at: new Date().toISOString()
    };
    local.vehicles.push(newVehicle);
    writeLocalDb(local);
    return newVehicle;
  },

  getRentals: async () => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('rentals').select('*');
      if (error) throw error;
      return data;
    }
    return getLocalDb().rentals;
  },

  getRental: async (id: number) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('rentals').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    return getLocalDb().rentals.find((r: any) => r.id === id) || null;
  },

  createRental: async (rental: any) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('rentals').insert(rental).select().single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const newRental = {
      ...rental,
      id: local.rentals.length + 1,
      contract_id: local.rentals.length + 1,
      speed_penalties_accrued: 0,
      distance_charges_accrued: 0,
      crash_detected: false,
      created_at: new Date().toISOString()
    };
    local.rentals.push(newRental);
    writeLocalDb(local);
    return newRental;
  },

  updateRental: async (id: number, updates: any) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('rentals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const idx = local.rentals.findIndex((r: any) => r.id === id);
    if (idx >= 0) {
      local.rentals[idx] = { ...local.rentals[idx], ...updates };
      writeLocalDb(local);
      return local.rentals[idx];
    }
    return null;
  },

  getTelemetryLogs: async (rentalId: number) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('telemetry_logs').select('*').eq('rental_id', rentalId).order('recorded_at', { ascending: true });
      if (error) throw error;
      return data;
    }
    return getLocalDb().telemetry_logs.filter((t: any) => t.rental_id === rentalId);
  },

  getTelemetryLogsAll: async () => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('telemetry_logs').select('*').order('recorded_at', { ascending: true });
      if (error) throw error;
      return data;
    }
    return getLocalDb().telemetry_logs || [];
  },

  updateVehicleStatus: async (id: number, isActive: boolean) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('vehicles').update({ is_active: isActive }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const idx = local.vehicles.findIndex((v: any) => v.id === id);
    if (idx >= 0) {
      local.vehicles[idx].is_active = isActive;
      writeLocalDb(local);
      return local.vehicles[idx];
    }
    return null;
  },

  addTelemetryLog: async (log: any) => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('telemetry_logs').insert(log).select().single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const newLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 15),
      recorded_at: new Date().toISOString()
    };
    local.telemetry_logs.push(newLog);
    writeLocalDb(local);
    return newLog;
  },

  getReviews: async () => {
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase.from('reviews').select('*');
      if (error) throw error;
      return data;
    }
    const local = getLocalDb();
    return local.reviews || [];
  },

  getVehicleReviews: async (vehicleId: number) => {
    if (useRealSupabase && supabase) {
      const { data: rentalsData, error: rError } = await supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicleId);
      if (rError) throw rError;
      const rentalIds = rentalsData?.map((r: any) => r.id) || [];
      if (rentalIds.length === 0) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .in('rental_id', rentalIds);
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const rentals = local.rentals || [];
    const reviews = local.reviews || [];
    const rentalIds = rentals
      .filter((r: any) => Number(r.vehicle_id) === Number(vehicleId))
      .map((r: any) => r.id);
    return reviews.filter((rev: any) => rentalIds.includes(rev.rental_id));
  },

  getUserReviews: async (userAddress: string) => {
    const addr = userAddress.toLowerCase();
    if (useRealSupabase && supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee', addr);
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    const reviews = local.reviews || [];
    return reviews.filter((rev: any) => rev.reviewee.toLowerCase() === addr);
  },

  createReview: async (review: {
    rental_id: number;
    reviewer: string;
    reviewee: string;
    rating: number;
    comment: string;
    role: string;
  }) => {
    const reviewer = review.reviewer.toLowerCase();
    const reviewee = review.reviewee.toLowerCase();
    const newReview = {
      ...review,
      reviewer,
      reviewee,
      created_at: new Date().toISOString(),
    };

    if (useRealSupabase && supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .insert(newReview)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = getLocalDb();
    if (!local.reviews) local.reviews = [];
    
    // Check duplicate
    const exists = local.reviews.some(
      (r: any) => r.rental_id === Number(review.rental_id) && r.reviewer.toLowerCase() === reviewer
    );
    if (exists) {
      throw new Error("Review already exists for this rental and reviewer");
    }

    const createdReview = {
      ...newReview,
      id: local.reviews.length + 1,
    };
    local.reviews.push(createdReview);
    writeLocalDb(local);
    return createdReview;
  }
};
