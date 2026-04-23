import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../context/theme-context';
import TripsHome from '../app/(tabs)/index';
import { createTestDb } from '../db/test-client';
import { seedForUser } from '../db/seed';
import { users } from '../db/schema';
import { DataProvider } from '../context/data-context';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 1, name: 'Test', email: 'test@example.com', createdAt: new Date().toISOString() },
  }),
}));

test('Trips list shows seeded data after db init', async () => {
  const now = new Date().toISOString();
  const { db } = await createTestDb();
  await db.insert(users).values({ id: 1, name: 'Test', email: 'test@example.com', passwordHash: 'x', createdAt: now });
  await seedForUser(1, db);

  const { getAllByText } = render(
    <ThemeProvider>
      <DataProvider database={db}>
        <TripsHome />
      </DataProvider>
    </ThemeProvider>
  );

  await waitFor(() => expect(getAllByText('Paris Weekend').length).toBeGreaterThan(0));
});

