/**
 * Seed Script — Generate synthetic reports for analytics testing.
 *
 * Usage:
 *   node Backend/src/scripts/seedReports.js
 *
 * Requires MONGODB_URI env var (or uses default localhost).
 * Creates 100 reports spread across the last 30 days with varied
 * status, wasteType, urgency, and assignedTo values.
 *
 * ⚠️  DEV ONLY — never run in production.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cleansight';

// ── Schema (inline to avoid import-path issues when run standalone) ──

const reportSchema = new mongoose.Schema({
  firebaseUid: String,
  imageUrl: String,
  description: String,
  location: { lat: Number, lng: Number },
  wasteType: { type: String, default: 'general' },
  urgency: { type: String, default: 'medium' },
  status: { type: String, default: 'pending' },
  assignedTo: { type: String, default: null },
}, { timestamps: true });

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

// ── Config ───────────────────────────────────────────────────────────

const CITIZEN_UIDS = ['citizen-1', 'citizen-2', 'citizen-3'];
const VOLUNTEER_UIDS = ['volunteer-1', 'volunteer-2'];
const WASTE_TYPES = ['general', 'recyclable', 'organic', 'construction', 'hazardous'];
const URGENCIES = ['low', 'medium', 'high'];
const STATUSES_WEIGHTED = [
  'pending', 'pending', 'pending',
  'assigned', 'assigned',
  'resolved', 'resolved', 'resolved', 'resolved',
];
const TOTAL = 100;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

function randomCoord() {
  // Roughly Colombo area
  return {
    lat: 6.85 + Math.random() * 0.2,
    lng: 79.85 + Math.random() * 0.15,
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🌱  Connecting to ${MONGODB_URI}…`);
  await mongoose.connect(MONGODB_URI);
  console.log('   Connected.\n');

  const docs = [];
  for (let i = 0; i < TOTAL; i++) {
    const status = randomItem(STATUSES_WEIGHTED);
    const createdAt = randomDate(30);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 48 * 60 * 60 * 1000); // 0–48h later

    docs.push({
      firebaseUid: randomItem(CITIZEN_UIDS),
      imageUrl: `https://picsum.photos/seed/${i}/400/300`,
      description: `Seeded waste report #${i + 1}`,
      location: randomCoord(),
      wasteType: randomItem(WASTE_TYPES),
      urgency: randomItem(URGENCIES),
      status,
      assignedTo: status !== 'pending' ? randomItem(VOLUNTEER_UIDS) : null,
      createdAt,
      updatedAt,
    });
  }

  const result = await Report.insertMany(docs);
  console.log(`   ✅  Inserted ${result.length} reports.\n`);

  await mongoose.disconnect();
  console.log('   Disconnected. Done.\n');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
