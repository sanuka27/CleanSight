import { firebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import DeletedAccount from '../models/DeletedAccount.js';

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please authenticate.' 
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    // Verify Firebase ID token (check revocation to detect deleted/disabled users)
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token, true);

    // Look up the user in the database to check suspension and attach full profile
    let dbUser;
    try {
      dbUser = await User.findOne({ firebaseUid: decodedToken.uid }).lean();
    } catch (dbErr) {
      console.error('Database lookup error in verifyToken:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again.',
      });
    }

    if (!dbUser) {
      const deletedAccount = await DeletedAccount.findOne({ firebaseUid: decodedToken.uid }).lean();
      if (deletedAccount) {
        return res.status(410).json({
          success: false,
          message: 'Account removed',
          deleted: true,
          deletedReason: deletedAccount.reason,
          deletedAt: deletedAccount.deletedAt,
        });
      }
    }

    // If user exists and is suspended, block access
    if (dbUser && dbUser.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        suspended: true,
        suspendedReason: dbUser.suspendedReason || null,
      });
    }

    // Attach user info to request — prefer DB fields but always ensure
    // firebaseUid and email are present (DB user may not exist yet for /register)
    req.user = dbUser
      ? { ...dbUser, firebaseUid: decodedToken.uid, email: decodedToken.email || dbUser.email }
      : { firebaseUid: decodedToken.uid, email: decodedToken.email };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please log in again.' 
      });
    }

    if (error.code === 'auth/user-not-found' || error.code === 'auth/user-disabled') {
      return res.status(401).json({
        success: false,
        message: 'User account is no longer available. Please log in again.',
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token.' 
    });
  }
};

export default verifyToken;
