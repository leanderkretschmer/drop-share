const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { authenticateToken, requireUploadPermission } = require('../middleware/auth');

const router = express.Router();

// Alle Projekte des Benutzers abrufen
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    })
    .populate('owner', 'username')
    .populate('collaborators.user', 'username')
    .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Fehler beim Laden der Projekte:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Einzelnes Projekt abrufen
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id },
        { isPublic: true }
      ]
    })
    .populate('owner', 'username')
    .populate('collaborators.user', 'username');

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    res.json(project);
  } catch (error) {
    console.error('Fehler beim Laden des Projekts:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Neues Projekt erstellen
router.post('/', [
  authenticateToken,
  requireUploadPermission,
  body('name').notEmpty().withMessage('Projektname erforderlich'),
  body('description').optional().isLength({ max: 500 }).withMessage('Beschreibung zu lang')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, tags, isPublic } = req.body;

    const project = new Project({
      name,
      description,
      tags: tags || [],
      isPublic: isPublic || false,
      owner: req.user.id
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username');

    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Fehler beim Erstellen des Projekts:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Projekt aktualisieren
router.put('/:id', [
  authenticateToken,
  body('name').optional().notEmpty().withMessage('Projektname darf nicht leer sein'),
  body('description').optional().isLength({ max: 500 }).withMessage('Beschreibung zu lang')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Prüfen ob Benutzer Berechtigung hat
    const isOwner = project.owner.toString() === req.user.id;
    const isCollaborator = project.collaborators.some(
      collab => collab.user.toString() === req.user.id && collab.permission === 'write'
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const { name, description, tags, isPublic } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (tags) project.tags = tags;
    if (isPublic !== undefined) project.isPublic = isPublic;

    project.updatedAt = new Date();
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username')
      .populate('collaborators.user', 'username');

    res.json(updatedProject);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Projekts:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Projekt löschen
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Nur der Besitzer kann das Projekt löschen
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann das Projekt löschen' });
    }

    // Alle zugehörigen Daten löschen
    const File = require('../models/File');
    const Share = require('../models/Share');
    const Message = require('../models/Message');

    // Dateien löschen
    await File.deleteMany({ project: req.params.id });
    
    // Share-Links löschen
    await Share.deleteMany({ project: req.params.id });
    
    // Chat-Nachrichten löschen
    await Message.deleteMany({ project: req.params.id });

    // Projekt löschen
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Projekt erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Projekts:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Kollaborator hinzufügen (per E-Mail)
router.post('/:id/collaborators', [
  authenticateToken,
  body('email').isEmail().withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('permission').isIn(['read', 'write', 'admin']).withMessage('Ungültige Berechtigung')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Nur der Besitzer kann Kollaboratoren hinzufügen
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann Kollaboratoren hinzufügen' });
    }

    const { email, permission } = req.body;

    // Benutzer anhand E-Mail finden
    const User = require('../models/User');
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Benutzer mit dieser E-Mail-Adresse nicht gefunden' });
    }

    // Prüfen ob Kollaborator bereits existiert
    const existingCollaborator = project.collaborators.find(
      collab => collab.user.toString() === user._id.toString()
    );

    if (existingCollaborator) {
      existingCollaborator.permission = permission;
    } else {
      project.collaborators.push({
        user: user._id,
        permission
      });
    }

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username')
      .populate('collaborators.user', 'username email');

    res.json(updatedProject);
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Kollaborators:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Kollaborator-Berechtigung ändern
router.put('/:id/collaborators/:userId', [
  authenticateToken,
  body('permission').isIn(['read', 'write', 'admin']).withMessage('Ungültige Berechtigung')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Nur der Besitzer kann Berechtigungen ändern
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann Berechtigungen ändern' });
    }

    const { permission } = req.body;

    // Kollaborator finden und Berechtigung ändern
    const collaborator = project.collaborators.find(
      collab => collab.user.toString() === req.params.userId
    );

    if (!collaborator) {
      return res.status(404).json({ message: 'Kollaborator nicht gefunden' });
    }

    collaborator.permission = permission;
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username')
      .populate('collaborators.user', 'username email');

    res.json(updatedProject);
  } catch (error) {
    console.error('Fehler beim Ändern der Berechtigung:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

// Kollaborator entfernen
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Projekt nicht gefunden' });
    }

    // Nur der Besitzer kann Kollaboratoren entfernen
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nur der Projektbesitzer kann Kollaboratoren entfernen' });
    }

    project.collaborators = project.collaborators.filter(
      collab => collab.user.toString() !== req.params.userId
    );

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username')
      .populate('collaborators.user', 'username');

    res.json(updatedProject);
  } catch (error) {
    console.error('Fehler beim Entfernen des Kollaborators:', error);
    res.status(500).json({ message: 'Server Fehler' });
  }
});

module.exports = router;
