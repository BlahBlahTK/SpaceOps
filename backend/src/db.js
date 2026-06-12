import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/database.json');

// Memory cache of database
let dbCache = null;

const initialData = {
  users: [
    { id: 'user-1', name: 'Jane Doe', email: 'jane@company.com', role: 'Employee', title: 'Senior Developer' },
    { id: 'user-2', name: 'Bob Smith', email: 'bob@company.com', role: 'IT Admin', title: 'IT Systems Administrator' },
    { id: 'user-3', name: 'Alice Johnson', email: 'alice@company.com', role: 'HR Manager', title: 'Office & HR Manager' },
    { id: 'user-4', name: 'Charlie Brown', email: 'charlie@company.com', role: 'Employee', title: 'Product Manager' }
  ],
  desks: [], // Purged as requested
  rooms: [], // Purged as requested
  assets: [], // Purged as requested
  bookings: [], // Purged as requested
  tickets: [] // Purged as requested
};

export async function getDb() {
  if (dbCache) return dbCache;

  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    dbCache = JSON.parse(data);
    return dbCache;
  } catch (error) {
    // If file doesn't exist, create it with clean initial schema
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    dbCache = JSON.parse(JSON.stringify(initialData));
    await saveDb();
    return dbCache;
  }
}

export async function saveDb() {
  if (!dbCache) return;
  await fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
}

// Helpers for core DB reads
export async function getUsers() {
  const db = await getDb();
  return db.users;
}

export async function getDesks() {
  const db = await getDb();
  return db.desks;
}

export async function getRooms() {
  const db = await getDb();
  return db.rooms;
}

export async function getAssets() {
  const db = await getDb();
  return db.assets;
}

export async function getBookings() {
  const db = await getDb();
  return db.bookings;
}

export async function getTickets() {
  const db = await getDb();
  return db.tickets;
}

// Write Operations
export async function addBooking(booking) {
  const db = await getDb();
  db.bookings.push(booking);
  await saveDb();
  return booking;
}

export async function updateBooking(bookingId, updates) {
  const db = await getDb();
  const idx = db.bookings.findIndex(b => b.id === bookingId);
  if (idx !== -1) {
    db.bookings[idx] = { ...db.bookings[idx], ...updates };
    await saveDb();
    return db.bookings[idx];
  }
  return null;
}

export async function addTicket(ticket) {
  const db = await getDb();
  db.tickets.push(ticket);
  await saveDb();
  return ticket;
}

export async function updateAsset(assetId, updates) {
  const db = await getDb();
  const idx = db.assets.findIndex(a => a.id === assetId);
  if (idx !== -1) {
    db.assets[idx] = { ...db.assets[idx], ...updates };
    await saveDb();
    return db.assets[idx];
  }
  return null;
}

export async function addAsset(asset) {
  const db = await getDb();
  db.assets.push(asset);
  await saveDb();
  return asset;
}

// Seating Plan & Resource Builder Operations
export async function addDesk(desk) {
  const db = await getDb();
  db.desks.push(desk);
  await saveDb();
  return desk;
}

export async function deleteDesk(deskId) {
  const db = await getDb();
  db.desks = db.desks.filter(d => d.id !== deskId);
  // Cancel bookings associated with this deleted desk
  db.bookings = db.bookings.filter(b => !(b.resourceId === deskId && b.resourceType === 'desk'));
  await saveDb();
  return deskId;
}

export async function addRoom(room) {
  const db = await getDb();
  db.rooms.push(room);
  await saveDb();
  return room;
}

export async function deleteRoom(roomId) {
  const db = await getDb();
  db.rooms = db.rooms.filter(r => r.id !== roomId);
  // Cancel bookings associated with this deleted room
  db.bookings = db.bookings.filter(b => !(b.resourceId === roomId && b.resourceType === 'room'));
  await saveDb();
  return roomId;
}
