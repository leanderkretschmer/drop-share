const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registrierung
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Benutzername muss zwischen 3 und 30 Zeichen lang sein')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten'),
  body('email')
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Passwort muss mindestens 6 Zeichen lang sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Prüfen ob Benutzer bereits existiert
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Benutzername oder E-Mail bereits vergeben'
      });
    }

    // Prüfen ob es der erste Benutzer ist
    const isFirstUser = await User.isFirstUser();
    
    // Neuen Benutzer erstellen
    const user = new User({
      username,
      email,
      password,
      isAdmin: isFirstUser, // Erster Benutzer wird Admin
      canUpload: isFirstUser // Erster Benutzer kann auch uploaden
    });

    await user.save();

    // Token generieren
    const token = generateToken(user._id);

    const message = isFirstUser 
      ? 'Registrierung erfolgreich! Sie sind der erste Benutzer und wurden automatisch zum Administrator ernannt.'
      : 'Registrierung erfolgreich! Warten Sie auf Admin-Genehmigung für Uploads.';

    res.status(201).json({
      message,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        canUpload: user.canUpload
      }
    });

  } catch (error) {
    console.error('Registrierungsfehler:', error);
    res.status(500).json({ message: 'Server Fehler bei der Registrierung' });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Benutzername erforderlich'),
  body('password').notEmpty().withMessage('Passwort erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Benutzer finden
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    // Passwort überprüfen
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    // Last Login aktualisieren
    user.lastLogin = new Date();
    await user.save();

    // Token generieren
    const token = generateToken(user._id);

    res.json({
      message: 'Login erfolgreich',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        canUpload: user.canUpload
      }
    });

  } catch (error) {
    console.error('Login Fehler:', error);
    res.status(500).json({ message: 'Server Fehler beim Login' });
  }
});

// Admin: Upload-Berechtigung erteilen/entziehen
router.post('/grant-upload/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { canUpload } = req.body;

    // Prüfen ob der aktuelle Benutzer Admin ist
    const currentUser = await User.findById(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ message: 'Admin-Berechtigung erforderlich' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    user.canUpload = canUpload;
    await user.save();

    res.json({
      message: `Upload-Berechtigung ${canUpload ? 'erteilt' : 'entzogen'}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        canUpload: user.canUpload
      }
    });

  } catch (error) {
    console.error('Fehler beim Ändern der Upload-Berechtigung:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Admin: Alle Benutzer anzeigen
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Prüfen ob der aktuelle Benutzer Admin ist
    const currentUser = await User.findById(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ message: 'Admin-Berechtigung erforderlich' });
    }

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    res.json(users);

  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Admin-Status prüfen (wird beim Serverstart aufgerufen)
router.post('/check-admin', async (req, res) => {
  try {
    const isFirstUser = await User.isFirstUser();
    res.json({ 
      isFirstUser,
      message: isFirstUser ? 'Erster Benutzer wird Admin' : 'Admin bereits vorhanden'
    });
  } catch (error) {
    console.error('Fehler beim Prüfen des Admin-Status:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Prüfen ob Admin existiert (für Frontend)
router.get('/has-admin', async (req, res) => {
  try {
    const adminExists = await User.exists({ isAdmin: true });
    res.json({ hasAdmin: adminExists });
  } catch (error) {
    console.error('Fehler beim Prüfen des Admin-Status:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

module.exports = router;
