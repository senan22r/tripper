import { and, asc, eq } from 'drizzle-orm';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  activities,
  categories,
  targets,
  trips,
  type Activity,
  type Category,
  type NewActivity,
  type NewCategory,
  type NewTarget,
  type NewTrip,
  type Target,
  type Trip,
} from '../db/schema';
import { useAuth } from './auth-context';

type DataContextValue = {
  trips: Trip[];
  categories: Category[];
  activities: Activity[];
  targets: Target[];
  loading: boolean;
  refresh: () => Promise<void>;
  addTrip: (data: Omit<NewTrip, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Trip>;
  updateTrip: (id: number, data: Partial<Omit<NewTrip, 'userId' | 'createdAt'>>) => Promise<void>;
  deleteTrip: (id: number) => Promise<void>;
  addActivity: (data: Omit<NewActivity, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Activity>;
  updateActivity: (id: number, data: Partial<Omit<NewActivity, 'userId' | 'createdAt'>>) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  addCategory: (data: Omit<NewCategory, 'userId' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: number, data: Partial<Omit<NewCategory, 'userId' | 'createdAt'>>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  addTarget: (data: Omit<NewTarget, 'userId'>) => Promise<Target>;
  updateTarget: (id: number, data: Partial<Omit<NewTarget, 'userId'>>) => Promise<void>;
  deleteTarget: (id: number) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

type DbLike = typeof import('../db/client').db;

export function DataProvider({ children, database }: { children: ReactNode; database?: DbLike }) {
  const resolvedDb = database ?? require('../db/client').db;
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [tripList, setTripList] = useState<Trip[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [activityList, setActivityList] = useState<Activity[]>([]);
  const [targetList, setTargetList] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTripList([]);
      setCategoryList([]);
      setActivityList([]);
      setTargetList([]);
      return;
    }
    setLoading(true);
    try {
      const [t, c, a, tg] = await Promise.all([
        resolvedDb.select().from(trips).where(eq(trips.userId, userId)).orderBy(asc(trips.startDate)),
        resolvedDb.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
        resolvedDb.select().from(activities).where(eq(activities.userId, userId)).orderBy(asc(activities.date)),
        resolvedDb.select().from(targets).where(eq(targets.userId, userId)),
      ]);
      setTripList(t);
      setCategoryList(c);
      setActivityList(a);
      setTargetList(tg);
    } finally {
      setLoading(false);
    }
  }, [userId, resolvedDb]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const guard = () => {
    if (!userId) throw new Error('No active session');
    return userId;
  };

  const addTrip: DataContextValue['addTrip'] = async (data) => {
    const uid = guard();
    const now = new Date().toISOString();
    const [row] = await resolvedDb
      .insert(trips)
      .values({ ...data, userId: uid, createdAt: now, updatedAt: now })
      .returning();
    await refresh();
    return row;
  };

  const updateTrip: DataContextValue['updateTrip'] = async (id, data) => {
    const uid = guard();
    await resolvedDb
      .update(trips)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(trips.id, id), eq(trips.userId, uid)));
    await refresh();
  };

  const deleteTrip: DataContextValue['deleteTrip'] = async (id) => {
    const uid = guard();
    await resolvedDb.delete(trips).where(and(eq(trips.id, id), eq(trips.userId, uid)));
    await refresh();
  };

  const addActivity: DataContextValue['addActivity'] = async (data) => {
    const uid = guard();
    const now = new Date().toISOString();
    const [row] = await resolvedDb
      .insert(activities)
      .values({ ...data, userId: uid, createdAt: now, updatedAt: now })
      .returning();
    await refresh();
    return row;
  };

  const updateActivity: DataContextValue['updateActivity'] = async (id, data) => {
    const uid = guard();
    await resolvedDb
      .update(activities)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(activities.id, id), eq(activities.userId, uid)));
    await refresh();
  };

  const deleteActivity: DataContextValue['deleteActivity'] = async (id) => {
    const uid = guard();
    await resolvedDb.delete(activities).where(and(eq(activities.id, id), eq(activities.userId, uid)));
    await refresh();
  };

  const addCategory: DataContextValue['addCategory'] = async (data) => {
    const uid = guard();
    const [row] = await resolvedDb
      .insert(categories)
      .values({ ...data, userId: uid, createdAt: new Date().toISOString() })
      .returning();
    await refresh();
    return row;
  };

  const updateCategory: DataContextValue['updateCategory'] = async (id, data) => {
    const uid = guard();
    await resolvedDb.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.userId, uid)));
    await refresh();
  };

  const deleteCategory: DataContextValue['deleteCategory'] = async (id) => {
    const uid = guard();
    await resolvedDb.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, uid)));
    await refresh();
  };

  const addTarget: DataContextValue['addTarget'] = async (data) => {
    const uid = guard();
    const [row] = await resolvedDb.insert(targets).values({ ...data, userId: uid }).returning();
    await refresh();
    return row;
  };

  const updateTarget: DataContextValue['updateTarget'] = async (id, data) => {
    const uid = guard();
    await resolvedDb.update(targets).set(data).where(and(eq(targets.id, id), eq(targets.userId, uid)));
    await refresh();
  };

  const deleteTarget: DataContextValue['deleteTarget'] = async (id) => {
    const uid = guard();
    await resolvedDb.delete(targets).where(and(eq(targets.id, id), eq(targets.userId, uid)));
    await refresh();
  };

  const value = useMemo<DataContextValue>(
    () => ({
      trips: tripList,
      categories: categoryList,
      activities: activityList,
      targets: targetList,
      loading,
      refresh,
      addTrip,
      updateTrip,
      deleteTrip,
      addActivity,
      updateActivity,
      deleteActivity,
      addCategory,
      updateCategory,
      deleteCategory,
      addTarget,
      updateTarget,
      deleteTarget,
    }),
    [tripList, categoryList, activityList, targetList, loading, refresh]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
