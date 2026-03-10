import { firebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';

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

    // Verify Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

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

    // If user exists and is suspended, block access
    if (dbUser && dbUser.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        suspended: true,
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
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please log in again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token.' 
    });
  }
};

export default verifyToken;
