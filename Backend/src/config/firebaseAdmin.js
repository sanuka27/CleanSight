import admin from 'firebase-admin';
import dotenv from 'dotenv';
import logger from './logger.js';

// Load environment variables
dotenv.config();

const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      logger.error('Firebase Admin configuration is missing', {
        missing: {
          projectId: !projectId,
          privateKey: !privateKey,
          clientEmail: !clientEmail,
        },
      });
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
      }),
    });

    logger.info('Firebase Admin SDK initialised', { projectId });
  }
  return admin;
};

export const firebaseAdmin = initializeFirebaseAdmin();
export default firebaseAdmin;
