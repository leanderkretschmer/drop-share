const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware für JWT Token Validierung
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Zugriff verweigert. Token erforderlich.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Ungültiger Token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Ungültiger Token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token abgelaufen.' });
    }
    res.status(500).json({ message: 'Server Fehler bei Token Validierung.' });
  }
};

// Middleware für Admin-Berechtigung
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin-Berechtigung erforderlich.' });
  }
  next();
};

// Middleware für Upload-Berechtigung
const requireUploadPermission = (req, res, next) => {
  if (!req.user.canUpload && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Upload-Berechtigung erforderlich. Kontaktieren Sie einen Administrator.' });
  }
  next();
};

// Token generieren
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUploadPermission,
  generateToken
};
