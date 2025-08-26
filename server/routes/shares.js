const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require("path");
const fs = require("fs");
const Share = require('../models/Share');
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Share für ein Projekt abrufen
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const share = await Share.findOne({ project: req.params.projectId })
      .populate('project', 'name description')
      .populate('createdBy', 'username');

    if (!share) {
      return res.status(404).json({ message: 'Kein Share für dieses Projekt gefunden' });
    }

    res.json(share);
  } catch (error) {
    console.error('Fehler beim Abrufen des Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share für ein Projekt erstellen
router.post('/project/:projectId', [
  authenticateToken,
  body('password').optional().isLength({ min: 1 }).withMessage('Passwort darf nicht leer sein'),
  body('expiresAt').optional().isISO8601().withMessage('Ungültiges Datum'),
  body('maxDownloads').optional().isInt({ min: 1 }).withMessage('Max Downloads muss eine positive Zahl sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Nur der Projektbesitzer kann Shares erstellen
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann Shares erstellen' });
    }

    const { password, expiresAt, maxDownloads } = req.body;

    // Prüfen ob bereits ein Share für dieses Projekt existiert
    const existingShare = await Share.findOne({ project: req.params.projectId });
    if (existingShare) {
      return res.status(400).json({ message: 'Für dieses Projekt existiert bereits ein Share-Link' });
    }

    const share = new Share({
      project: req.params.projectId,
      createdBy: req.user.id,
      password: password || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxDownloads: maxDownloads || null
    });

    await share.save();

    const populatedShare = await Share.findById(share._id)
      .populate('project', 'name description')
      .populate('createdBy', 'username');

    res.status(201).json(populatedShare);
  } catch (error) {
    console.error('Fehler beim Erstellen des Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share über Share-ID abrufen (öffentlich)
router.get('/:shareId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project', 'name description')
      .populate('createdBy', 'username');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Prüfen ob Share noch gültig ist
    if (!share.isValid()) {
      return res.status(410).json({ message: 'Share-Link ist nicht mehr verfügbar' });
    }

    // Passwort-geschützte Shares benötigen Passwort
    if (share.password) {
      return res.json({
        requiresPassword: true,
        projectName: share.project.name,
        projectDescription: share.project.description
      });
    }

    res.json({
      share,
      project: share.project,
      createdBy: share.createdBy
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share bearbeiten
router.put('/:shareId', [
  authenticateToken,
  body('password').optional().isLength({ min: 1 }).withMessage('Passwort darf nicht leer sein'),
  body('expiresAt').optional().isISO8601().withMessage('Ungültiges Datum'),
  body('maxDownloads').optional().isInt({ min: 1 }).withMessage('Max Downloads muss eine positive Zahl sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Nur der Projektbesitzer kann Shares bearbeiten
    if (share.project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann Shares bearbeiten' });
    }

    const { password, expiresAt, maxDownloads } = req.body;

    // Share aktualisieren
    if (password !== undefined) {
      share.password = password || null;
    }
    if (expiresAt !== undefined) {
      share.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (maxDownloads !== undefined) {
      share.maxDownloads = maxDownloads || null;
    }

    await share.save();

    const updatedShare = await Share.findById(share._id)
      .populate('project', 'name description')
      .populate('createdBy', 'username');

    res.json(updatedShare);
  } catch (error) {
    console.error('Fehler beim Bearbeiten des Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Dateien für einen Share abrufen
router.get('/:shareId/files', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Prüfen ob Share noch gültig ist
    if (!share.isValid()) {
      return res.status(410).json({ message: 'Share-Link ist nicht mehr verfügbar' });
    }

    // Dateien für das Projekt abrufen
    const File = require('../models/File');
    const files = await File.find({ project: share.project._id })
      .populate('uploadedBy', 'username')
      .sort({ uploadedAt: -1 });

    res.json(files);
  } catch (error) {
    console.error('Fehler beim Abrufen der Dateien:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share mit Passwort überprüfen
router.post('/:shareId/verify', [
  body('password').notEmpty().withMessage('Passwort erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project', 'name description')
      .populate('createdBy', 'username');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Prüfen ob Share noch gültig ist
    if (!share.isValid()) {
      return res.status(410).json({ message: 'Share-Link ist nicht mehr verfügbar' });
    }

    // Passwort überprüfen
    if (!share.checkPassword(req.body.password)) {
      return res.status(401).json({ message: 'Falsches Passwort' });
    }

    res.json({
      share: share,
      project: share.project,
      createdBy: share.createdBy
    });
  } catch (error) {
    console.error('Fehler bei der Passwort-Überprüfung:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Datei über Share-Link herunterladen
router.get('/:shareId/download/:fileId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Prüfen ob Share noch gültig ist
    if (!share.isValid()) {
      return res.status(410).json({ message: 'Share-Link ist nicht mehr verfügbar' });
    }

    // Datei finden
    const File = require('../models/File');
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Prüfen ob Datei zum geteilten Projekt gehört
    if (file.project.toString() !== share.project._id.toString()) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Datei' });
    }

    // Download-Zähler erhöhen
    await share.incrementDownloads();

    // Datei senden
    const filePath = path.join(__dirname, '../uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error('Fehler beim Download:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share deaktivieren
router.delete('/:shareId', authenticateToken, async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Nur der Ersteller kann den Share deaktivieren
    if (share.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    share.isActive = false;
    await share.save();

    res.json({ message: 'Share-Link erfolgreich deaktiviert' });
  } catch (error) {
    console.error('Fehler beim Deaktivieren des Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Share-Statistiken abrufen
router.get('/:shareId/stats', authenticateToken, async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Nur der Ersteller kann Statistiken sehen
    if (share.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const stats = {
      shareId: share.shareId,
      projectName: share.project.name,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads,
      currentDownloads: share.currentDownloads,
      lastAccessed: share.lastAccessed,
      isActive: share.isActive,
      isValid: share.isValid()
    };

    res.json(stats);
  } catch (error) {
    console.error('Fehler beim Abrufen der Share-Statistiken:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Alle Shares des Benutzers abrufen
router.get('/user/shares', authenticateToken, async (req, res) => {
  try {
    const shares = await Share.find({ createdBy: req.user.id })
      .populate('project', 'name description')
      .sort({ createdAt: -1 });

    res.json(shares);
  } catch (error) {
    console.error('Fehler beim Laden der Shares:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Download über Share-Link
router.get('/:shareId/download/:fileId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId })
      .populate('project');

    if (!share) {
      return res.status(404).json({ message: 'Share-Link nicht gefunden' });
    }

    // Prüfen ob Share noch gültig ist
    if (!share.isValid()) {
      return res.status(410).json({ message: 'Share-Link ist nicht mehr verfügbar' });
    }

    // Download zählen
    await share.incrementDownloads();

    // Hier würde die Datei-Download-Logik implementiert werden
    // Für jetzt geben wir nur eine Bestätigung zurück
    res.json({ 
      message: 'Download erfolgreich',
      remainingDownloads: share.maxDownloads ? share.maxDownloads - share.currentDownloads : null
    });
  } catch (error) {
    console.error('Fehler beim Download über Share:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

module.exports = router;
