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
    },
    {
      id: 3,
      contract_id: 3,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '30F-123.45',
      model: 'Tesla Model S Plaid (2025)',
      image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 10.0,
      rate_per_km: 1.2,
      speed_limit_kmh: 110,
      speed_penalty_usdc: 75.0,
      deposit_required: 300.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 5000,
      geofence_violation_penalty: 50.0,
      accepted_currency: 'USDC',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      contract_id: 4,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '29T-999.88',
      model: 'Porsche Taycan Turbo S (2024)',
      image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 15.0,
      rate_per_km: 1.5,
      speed_limit_kmh: 120,
      speed_penalty_usdc: 100.0,
      deposit_required: 500.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 6000,
      geofence_violation_penalty: 80.0,
      accepted_currency: 'USDC',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      contract_id: 5,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '30E-888.99',
      model: 'BMW i7 xDrive60 (2024)',
      image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 12.0,
      rate_per_km: 1.0,
      speed_limit_kmh: 100,
      speed_penalty_usdc: 60.0,
      deposit_required: 400.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 4000,
      geofence_violation_penalty: 40.0,
      accepted_currency: 'EURC',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 6,
      contract_id: 6,
      owner: '0xaB1C2d3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u',
      plate_number: '30G-555.55',
      model: 'Audi e-tron GT (2024)',
      image_url: 'https://images.unsplash.com/photo-1614200179396-2bab57ef3301?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 14.0,
      rate_per_km: 1.3,
      speed_limit_kmh: 115,
      speed_penalty_usdc: 90.0,
      deposit_required: 450.0,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 5000,
      geofence_violation_penalty: 60.0,
      accepted_currency: 'USDC',
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
  },

  bootstrapOwner: async (owner: string) => {
    const ownerAddr = owner.toLowerCase();
    const local = getLocalDb();

    // Check if owner already has vehicles listed under their name
    const hasVehicles = local.vehicles.some((v: any) => v.owner.toLowerCase() === ownerAddr);
    if (hasVehicles) return;

    // Generate 3 gorgeous vehicles owned by this address
    const vehicle1Id = local.vehicles.length + 1;
    const v1 = {
      id: vehicle1Id,
      contract_id: vehicle1Id,
      owner: ownerAddr,
      plate_number: '30F-123.45',
      model: 'Tesla Model S Plaid (2025)',
      image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 10.00,
      rate_per_km: 1.20,
      speed_limit_kmh: 110,
      speed_penalty_usdc: 75.00,
      deposit_required: 300.00,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 5000,
      geofence_violation_penalty: 50.00,
      accepted_currency: 'USDC',
      is_active: true,
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    };

    const vehicle2Id = local.vehicles.length + 2;
    const v2 = {
      id: vehicle2Id,
      contract_id: vehicle2Id,
      owner: ownerAddr,
      plate_number: '29T-999.88',
      model: 'Porsche Taycan Turbo S (2024)',
      image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 15.00,
      rate_per_km: 1.50,
      speed_limit_kmh: 120,
      speed_penalty_usdc: 100.00,
      deposit_required: 500.00,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 6000,
      geofence_violation_penalty: 80.00,
      accepted_currency: 'USDC',
      is_active: true,
      created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
    };

    const vehicle3Id = local.vehicles.length + 3;
    const v3 = {
      id: vehicle3Id,
      contract_id: vehicle3Id,
      owner: ownerAddr,
      plate_number: '30E-888.99',
      model: 'BMW i7 xDrive60 (2024)',
      image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: 12.00,
      rate_per_km: 1.00,
      speed_limit_kmh: 100,
      speed_penalty_usdc: 60.00,
      deposit_required: 400.00,
      geofence_center_lat: 21.028511,
      geofence_center_lng: 105.804817,
      geofence_radius_meters: 4000,
      geofence_violation_penalty: 40.00,
      accepted_currency: 'EURC',
      is_active: true,
      created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
    };

    local.vehicles.push(v1, v2, v3);

    // Generate rentals on these vehicles
    const renterBob = '0x1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t'.toLowerCase();
    const renterCharlie = '0x2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u'.toLowerCase();
    const renterDave = '0x3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v'.toLowerCase();

    const rentalsList = [
      {
        id: local.rentals.length + 1,
        contract_id: local.rentals.length + 1,
        vehicle_id: vehicle1Id,
        renter: renterBob,
        start_time: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 10000,
        current_odometer: 10150,
        escrow_balance: 0,
        distance_charges_accrued: 180.00,
        speed_penalties_accrued: 75.00,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 2,
        contract_id: local.rentals.length + 2,
        vehicle_id: vehicle2Id,
        renter: renterCharlie,
        start_time: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 20000,
        current_odometer: 20220,
        escrow_balance: 0,
        distance_charges_accrued: 330.00,
        speed_penalties_accrued: 0,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 3,
        contract_id: local.rentals.length + 3,
        vehicle_id: vehicle3Id,
        renter: renterDave,
        start_time: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 5000,
        current_odometer: 5120,
        escrow_balance: 0,
        distance_charges_accrued: 120.00,
        speed_penalties_accrued: 0,
        geofence_penalties_accrued: 40.00,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'EURC',
        created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 4,
        contract_id: local.rentals.length + 4,
        vehicle_id: vehicle1Id,
        renter: renterCharlie,
        start_time: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 10150,
        current_odometer: 10310,
        escrow_balance: 0,
        distance_charges_accrued: 192.00,
        speed_penalties_accrued: 75.00,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 5,
        contract_id: local.rentals.length + 5,
        vehicle_id: vehicle2Id,
        renter: renterBob,
        start_time: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 20220,
        current_odometer: 20250,
        escrow_balance: 0,
        distance_charges_accrued: 45.00,
        speed_penalties_accrued: 100.00,
        geofence_penalties_accrued: 0,
        crash_detected: true,
        status: 'Resolved',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 6,
        contract_id: local.rentals.length + 6,
        vehicle_id: vehicle3Id,
        renter: renterCharlie,
        start_time: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 5120,
        current_odometer: 5200,
        escrow_balance: 400.00,
        distance_charges_accrued: 80.00,
        speed_penalties_accrued: 60.00,
        geofence_penalties_accrued: 40.00,
        crash_detected: false,
        status: 'Disputed',
        payment_currency: 'EURC',
        created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 7,
        contract_id: local.rentals.length + 7,
        vehicle_id: vehicle1Id,
        renter: renterDave,
        start_time: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        start_odometer: 10310,
        current_odometer: 10390,
        escrow_balance: 300.00,
        distance_charges_accrued: 96.00,
        speed_penalties_accrued: 0,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Active',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
      }
    ];

    local.rentals.push(...rentalsList);

    // Active telemetry logs
    const activeRentalId = rentalsList[6].id;
    const baseLat = 21.028511;
    const baseLng = 105.804817;
    const tLogs = [
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat,
        longitude: baseLng,
        speed: 45,
        odometer: 10310000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString()
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat + 0.001,
        longitude: baseLng - 0.002,
        speed: 65,
        odometer: 10335000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat + 0.002,
        longitude: baseLng - 0.004,
        speed: 55,
        odometer: 10360000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat + 0.003,
        longitude: baseLng - 0.005,
        speed: 80,
        odometer: 10390000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 0.5 * 3600 * 1000).toISOString()
      }
    ];
    local.telemetry_logs.push(...tLogs);

    // Owner reviews
    const reviewsList = [
      {
        id: local.reviews.length + 1,
        rental_id: rentalsList[0].id,
        reviewer: renterBob,
        reviewee: ownerAddr,
        rating: 5,
        comment: 'Amazing Tesla! Pristine condition, instant smart contract unlock was mind-blowing.',
        role: 'renter',
        created_at: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.reviews.length + 2,
        rental_id: rentalsList[1].id,
        reviewer: renterCharlie,
        reviewee: ownerAddr,
        rating: 4,
        comment: 'Excellent Taycan, fast telemetry response. Minor delay in GPS sync, but overall beautiful rent.',
        role: 'renter',
        created_at: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.reviews.length + 3,
        rental_id: rentalsList[3].id,
        reviewer: renterCharlie,
        reviewee: ownerAddr,
        rating: 5,
        comment: 'Listed model was exactly as advertised. Fast and secure checkout settlement.',
        role: 'renter',
        created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      }
    ];
    local.reviews.push(...reviewsList);

    writeLocalDb(local);
  },

  bootstrapRenter: async (renter: string) => {
    const renterAddr = renter.toLowerCase();
    const local = getLocalDb();

    // Check if renter already has rentals
    const hasRentals = local.rentals.some((r: any) => r.renter.toLowerCase() === renterAddr);
    if (hasRentals) return;

    if (local.vehicles.length === 0) return;

    const v1Id = local.vehicles[0].id;
    const v2Id = local.vehicles.length > 1 ? local.vehicles[1].id : v1Id;

    const rentalsList = [
      {
        id: local.rentals.length + 1,
        contract_id: local.rentals.length + 1,
        vehicle_id: v1Id,
        renter: renterAddr,
        start_time: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 10000,
        current_odometer: 10080,
        escrow_balance: 0,
        distance_charges_accrued: 40.00,
        speed_penalties_accrued: 0,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 2,
        contract_id: local.rentals.length + 2,
        vehicle_id: v2Id,
        renter: renterAddr,
        start_time: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        end_time: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        start_odometer: 20000,
        current_odometer: 20110,
        escrow_balance: 0,
        distance_charges_accrued: 88.00,
        speed_penalties_accrued: 80.00,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Completed',
        payment_currency: 'EURC',
        created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: local.rentals.length + 3,
        contract_id: local.rentals.length + 3,
        vehicle_id: v1Id,
        renter: renterAddr,
        start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        start_odometer: 10080,
        current_odometer: 10100,
        escrow_balance: 200.00,
        distance_charges_accrued: 10.00,
        speed_penalties_accrued: 0,
        geofence_penalties_accrued: 0,
        crash_detected: false,
        status: 'Active',
        payment_currency: 'USDC',
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      }
    ];

    local.rentals.push(...rentalsList);

    // Active telemetry logs
    const activeRentalId = rentalsList[2].id;
    const baseLat = 21.028511;
    const baseLng = 105.804817;
    const tLogs = [
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat,
        longitude: baseLng,
        speed: 35,
        odometer: 10080000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString()
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat + 0.0005,
        longitude: baseLng - 0.001,
        speed: 55,
        odometer: 10090000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        rental_id: activeRentalId,
        latitude: baseLat + 0.0008,
        longitude: baseLng - 0.0018,
        speed: 48,
        odometer: 10100000,
        crash_detected: false,
        recorded_at: new Date(Date.now() - 0.2 * 3600 * 1000).toISOString()
      }
    ];
    local.telemetry_logs.push(...tLogs);

    // Owner reviews
    const ownerAlice = local.vehicles[0].owner.toLowerCase();
    const reviewsList = [
      {
        id: local.reviews.length + 1,
        rental_id: rentalsList[0].id,
        reviewer: ownerAlice,
        reviewee: renterAddr,
        rating: 5,
        comment: 'Great driver, vehicle returned clean and exactly on time. High trust rating.',
        role: 'owner',
        created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString()
      }
    ];
    local.reviews.push(...reviewsList);

    writeLocalDb(local);
  }
};
