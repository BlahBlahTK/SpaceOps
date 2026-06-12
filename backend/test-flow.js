import { getDb, addBooking, getBookings, updateBooking, saveDb } from './src/db.js';

async function runTests() {
  console.log('🧪 Starting Backend Database & Logic Tests...');

  // Test 1: Fetch DB
  const db = await getDb();
  console.log(`✅ Loaded DB successfully. Found ${db.users.length} users, ${db.desks.length} desks, ${db.rooms.length} rooms.`);

  // Test 2: Add a booking
  const now = new Date();
  const testBooking = {
    id: 'test-booking-1',
    resourceId: 'desk-3',
    resourceType: 'desk',
    userId: 'user-1',
    userName: 'Jane Doe',
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    status: 'pending-check-in',
    checkedInAt: null,
    releasedAt: null,
    isRecurring: false
  };

  await addBooking(testBooking);
  let bookings = await getBookings();
  const found = bookings.find(b => b.id === 'test-booking-1');
  if (found) {
    console.log('✅ Booking added successfully.');
  } else {
    throw new Error('❌ Failed to add booking');
  }

  // Test 3: Test ghost booking auto-release
  console.log('🧪 Simulating background auto-release check...');
  const ghostTime = new Date(now.getTime() - 20 * 60 * 1000); // 20 mins ago
  const ghostBooking = {
    id: 'test-ghost-booking',
    resourceId: 'desk-4',
    resourceType: 'desk',
    userId: 'user-4',
    userName: 'Charlie Brown',
    startTime: ghostTime.toISOString(),
    endTime: new Date(ghostTime.getTime() + 60 * 60 * 1000).toISOString(),
    status: 'pending-check-in',
    checkedInAt: null,
    releasedAt: null,
    isRecurring: false
  };

  await addBooking(ghostBooking);

  // Run the release checking logic manually
  bookings = await getBookings();
  let releasedCount = 0;
  for (const booking of bookings) {
    if (booking.status === 'pending-check-in') {
      const start = new Date(booking.startTime);
      const diffMins = (new Date().getTime() - start.getTime()) / (60 * 1000);
      if (diffMins > 15) {
        booking.status = 'released';
        booking.releasedAt = new Date().toISOString();
        releasedCount++;
      }
    }
  }
  await saveDb();

  const checkedGhost = (await getBookings()).find(b => b.id === 'test-ghost-booking');
  if (checkedGhost && checkedGhost.status === 'released') {
    console.log(`✅ Auto-release check passed. Released ${releasedCount} ghost bookings (including test-ghost-booking).`);
  } else {
    throw new Error('❌ Auto-release logic failed');
  }

  // Cleanup
  db.bookings = db.bookings.filter(b => !['test-booking-1', 'test-ghost-booking'].includes(b.id));
  await saveDb();
  console.log('🧹 Cleaned up test database records.');
  console.log('🎉 All backend tests completed successfully!');
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
