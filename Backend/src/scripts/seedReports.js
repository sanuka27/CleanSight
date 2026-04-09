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
// Uses proper GeoJSON format for location

const reportSchema = new mongoose.Schema({
  firebaseUid: String,
  imageUrl: String,
  description: String,
  title: { type: String, default: null },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  wasteType: { type: String, default: 'general' },
  urgency: { type: String, default: 'medium' },
  status: { type: String, default: 'pending' },
  assignedTo: { type: String, default: null },
  aiReviewStatus: { type: String, default: 'approved' },
  imageValidationLabel: { type: String, default: 'trash' },
  imageValidationConfidence: { type: Number, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

// 2dsphere index for geospatial queries
reportSchema.index({ location: '2dsphere' });

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

// ── Config ───────────────────────────────────────────────────────────

const CITIZEN_UIDS = ['citizen-seed-1', 'citizen-seed-2', 'citizen-seed-3'];
const VOLUNTEER_UIDS = ['volunteer-seed-1', 'volunteer-seed-2'];
const WASTE_TYPES = ['general', 'recyclable', 'organic', 'construction', 'hazardous'];
const URGENCIES = ['low', 'medium', 'high'];
const STATUSES_WEIGHTED = [
  'pending', 'pending', 'pending',
  'verified', 'verified',
  'assigned', 'assigned',
  'in_progress',
  'resolved', 'resolved', 'resolved', 'resolved',
  'rejected',
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
  // Roughly Colombo area - returns GeoJSON format [lng, lat]
  return {
    type: 'Point',
    coordinates: [
      79.85 + Math.random() * 0.15,  // longitude first
      6.85 + Math.random() * 0.2      // latitude second
    ]
  };
}

function randomConfidence() {
  // Random confidence between 0.5 and 1.0
  return parseFloat((0.5 + Math.random() * 0.5).toFixed(3));
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
    
    const isAssigned = ['assigned', 'in_progress', 'resolved'].includes(status);
    const isResolved = status === 'resolved';

    docs.push({
      firebaseUid: randomItem(CITIZEN_UIDS),
      imageUrl: `https://picsum.photos/seed/cleansight${i}/400/300`,
      title: `Waste Report #${i + 1}`,
      description: `Seeded waste report #${i + 1} - ${randomItem(WASTE_TYPES)} waste spotted near location`,
      location: randomCoord(),
      wasteType: randomItem(WASTE_TYPES),
      urgency: randomItem(URGENCIES),
      status,
      assignedTo: isAssigned ? randomItem(VOLUNTEER_UIDS) : null,
      aiReviewStatus: 'approved',
      imageValidationLabel: 'trash',
      imageValidationConfidence: randomConfidence(),
      resolvedAt: isResolved ? updatedAt : null,
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
