import { DEFAULT_CATEGORIES, seedForUserOps, type SeedOps } from '../db/seed';

test('seedForUser inserts sample data without duplication', async () => {
  let categoryId = 1;
  let tripId = 1;
  let activityId = 1;
  let targetId = 1;
  const categories: Array<{ id: number; userId: number; name: string }> = [];
  const trips: Array<{ id: number; userId: number }> = [];
  const activities: Array<{ id: number; userId: number }> = [];
  const targets: Array<{ id: number; userId: number }> = [];

  const ops: SeedOps = {
    getCategories: async (userId) => categories.filter((c) => c.userId === userId).map(({ id, name }) => ({ id, name })),
    insertCategories: async (rows) => {
      for (const r of rows) categories.push({ id: categoryId++, userId: r.userId, name: r.name });
    },
    getTrips: async (userId) => trips.filter((t) => t.userId === userId).map(({ id }) => ({ id })),
    insertTrip: async (row) => {
      const t = { id: tripId++, userId: row.userId };
      trips.push(t);
      return { id: t.id };
    },
    insertActivities: async (rows) => {
      for (const r of rows) activities.push({ id: activityId++, userId: r.userId });
    },
    getTargets: async (userId) => targets.filter((t) => t.userId === userId).map(({ id }) => ({ id })),
    insertTargets: async (rows) => {
      for (const r of rows) targets.push({ id: targetId++, userId: r.userId });
    },
    userExists: async () => false,
  };

  await seedForUserOps(1, ops);
  await seedForUserOps(1, ops);

  expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
  expect(trips).toHaveLength(1);
  expect(activities.length).toBeGreaterThan(0);
  expect(targets.length).toBeGreaterThan(0);
});

