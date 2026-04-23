import { eq } from 'drizzle-orm';
import { activities, categories, targets, trips, users, type NewCategory } from './schema';

import type { db as appDb } from './client';
type DbLike = typeof appDb;

export const DEFAULT_CATEGORIES: Omit<NewCategory, 'userId' | 'createdAt'>[] = [
  { name: 'Accommodation', color: '#4C6EF5', icon: 'bed-outline' },
  { name: 'Travel', color: '#12B886', icon: 'airplane-outline' },
  { name: 'Activities', color: '#F59F00', icon: 'ticket-outline' },
  { name: 'Food', color: '#E8590C', icon: 'restaurant-outline' },
  { name: 'Extra Spending', color: '#AE3EC9', icon: 'wallet-outline' },
];

export type SeedOps = {
  getCategories: (userId: number) => Promise<Array<{ id: number; name: string }>>;
  insertCategories: (rows: Array<{ userId: number; name: string; color: string; icon: string; createdAt: string }>) => Promise<void>;
  getTrips: (userId: number) => Promise<Array<{ id: number }>>;
  insertTrip: (row: {
    userId: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }) => Promise<{ id: number }>;
  insertActivities: (rows: Array<{
    tripId: number;
    userId: number;
    categoryId: number;
    title: string;
    date: string;
    amount: number;
    durationMinutes?: number | null;
    status: 'planned' | 'completed';
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
  }>) => Promise<void>;
  getTargets: (userId: number) => Promise<Array<{ id: number }>>;
  insertTargets: (rows: Array<{
    userId: number;
    tripId?: number | null;
    categoryId?: number | null;
    periodType: 'weekly' | 'monthly' | 'trip';
    targetAmount: number;
    startDate: string;
    endDate?: string | null;
    active: boolean;
  }>) => Promise<void>;
  userExists: (email: string) => Promise<boolean>;
};

export async function seedDefaultCategoriesIfEmptyOps(userId: number, ops: SeedOps): Promise<number> {
  const existing = await ops.getCategories(userId);
  if (existing.length > 0) return 0;
  const now = new Date().toISOString();
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, createdAt: now }));
  await ops.insertCategories(rows);
  return rows.length;
}

export async function seedSampleTripIfEmptyOps(userId: number, ops: SeedOps): Promise<boolean> {
  const existing = await ops.getTrips(userId);
  if (existing.length > 0) return false;

  const now = new Date().toISOString();
  const trip = await ops.insertTrip({
    userId,
    name: 'Paris Weekend',
    destination: 'Paris, France',
    startDate: '2026-05-15',
    endDate: '2026-05-18',
    totalBudget: 900,
    notes: 'Sample trip',
    createdAt: now,
    updatedAt: now,
  });

  const userCategories = await ops.getCategories(userId);
  const byName = Object.fromEntries(userCategories.map((c) => [c.name, c.id]));

  await ops.insertActivities([
    {
      tripId: trip.id,
      userId,
      categoryId: byName['Accommodation'],
      title: 'Hotel Le Marais',
      date: '2026-05-15',
      amount: 420,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    },
    {
      tripId: trip.id,
      userId,
      categoryId: byName['Travel'],
      title: 'Eurostar return',
      date: '2026-05-15',
      amount: 180,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    },
    {
      tripId: trip.id,
      userId,
      categoryId: byName['Activities'],
      title: 'Louvre entry',
      date: '2026-05-16',
      amount: 22,
      durationMinutes: 180,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    },
    {
      tripId: trip.id,
      userId,
      categoryId: byName['Food'],
      title: 'Dinner at Le Comptoir',
      date: '2026-05-16',
      amount: 65,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const existingTargets = await ops.getTargets(userId);
  if (existingTargets.length === 0) {
    await ops.insertTargets([
      {
        userId,
        tripId: trip.id,
        categoryId: null,
        periodType: 'weekly',
        targetAmount: 250,
        startDate: '2026-05-12',
        endDate: null,
        active: true,
      },
    ]);
  }

  return true;
}

export async function seedForUserOps(userId: number, ops: SeedOps): Promise<{ categoriesAdded: number; sampleTripAdded: boolean }> {
  const categoriesAdded = await seedDefaultCategoriesIfEmptyOps(userId, ops);
  const sampleTripAdded = await seedSampleTripIfEmptyOps(userId, ops);
  return { categoriesAdded, sampleTripAdded };
}

export function makeSeedOps(database: DbLike): SeedOps {
  return {
    getCategories: async (userId) => database.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.userId, userId)),
    insertCategories: async (rows) => {
      await database.insert(categories).values(rows);
    },
    getTrips: async (userId) => database.select({ id: trips.id }).from(trips).where(eq(trips.userId, userId)),
    insertTrip: async (row) => {
      const [t] = await database.insert(trips).values(row).returning({ id: trips.id });
      return t;
    },
    insertActivities: async (rows) => {
      await database.insert(activities).values(rows);
    },
    getTargets: async (userId) => database.select({ id: targets.id }).from(targets).where(eq(targets.userId, userId)),
    insertTargets: async (rows) => {
      await database.insert(targets).values(
        rows.map((r) => ({
          userId: r.userId,
          tripId: r.tripId ?? null,
          categoryId: r.categoryId ?? null,
          periodType: r.periodType,
          targetAmount: r.targetAmount,
          startDate: r.startDate,
          endDate: r.endDate ?? null,
          active: r.active,
        }))
      );
    },
    userExists: async (email) => {
      const found = await database.select({ id: users.id }).from(users).where(eq(users.email, email));
      return found.length > 0;
    },
  };
}

export async function seedForUser(userId: number, database: DbLike) {
  return seedForUserOps(userId, makeSeedOps(database));
}

export async function userExists(email: string, database: DbLike): Promise<boolean> {
  return makeSeedOps(database).userExists(email);
}
