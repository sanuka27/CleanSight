import { firebaseAdmin } from '../config/firebaseAdmin.js';

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
    
    // Attach user info to request
    req.user = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
    };

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
