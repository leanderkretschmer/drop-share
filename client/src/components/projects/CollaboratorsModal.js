import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit, Trash2, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CollaboratorsModal = ({ project, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [editingCollaborator, setEditingCollaborator] = useState(null);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`/api/projects/${project._id}/collaborators`, {
        email: email.trim(),
        permission
      });
      
      setEmail('');
      setPermission('read');
      onUpdate(response.data);
      toast.success('Kollaborator erfolgreich hinzugefügt');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Hinzufügen des Kollaborators');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId, newPermission) => {
    try {
      const response = await axios.put(`/api/projects/${project._id}/collaborators/${userId}`, {
        permission: newPermission
      });
      
      setEditingCollaborator(null);
      onUpdate(response.data);
      toast.success('Berechtigung erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Berechtigung');
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!window.confirm('Möchten Sie diesen Kollaborator wirklich entfernen?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/projects/${project._id}/collaborators/${userId}`);
      onUpdate(response.data);
      toast.success('Kollaborator erfolgreich entfernt');
    } catch (error) {
      toast.error('Fehler beim Entfernen des Kollaborators');
    }
  };

  const getPermissionIcon = (perm) => {
    switch (perm) {
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'write':
        return <ShieldCheck className="w-4 h-4 text-blue-600" />;
      case 'read':
        return <ShieldX className="w-4 h-4 text-gray-600" />;
      default:
        return <ShieldX className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPermissionLabel = (perm) => {
    switch (perm) {
      case 'admin':
        return 'Administrator';
      case 'write':
        return 'Bearbeiten';
      case 'read':
        return 'Nur Lesen';
      default:
        return 'Unbekannt';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Kollaboratoren verwalten</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kollaborator hinzufügen */}
        <form onSubmit={handleAddCollaborator} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Neuen Kollaborator hinzufügen</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="benutzer@beispiel.de"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Berechtigung
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="input-field"
              >
                <option value="read">Nur Lesen</option>
                <option value="write">Bearbeiten</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}</span>
            </button>
          </div>
        </form>

        {/* Kollaboratoren-Liste */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Aktuelle Kollaboratoren</h3>
          
          {project.collaborators.length === 0 ? (
            <p className="text-gray-500 text-sm">Noch keine Kollaboratoren hinzugefügt</p>
          ) : (
            <div className="space-y-2">
              {project.collaborators.map((collab) => (
                <div
                  key={collab.user._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {collab.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {collab.user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {collab.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {editingCollaborator === collab.user._id ? (
                      <select
                        value={collab.permission}
                        onChange={(e) => handleUpdatePermission(collab.user._id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="read">Nur Lesen</option>
                        <option value="write">Bearbeiten</option>
                        <option value="admin">Administrator</option>
                      </select>
                    ) : (
                      <div className="flex items-center space-x-1">
                        {getPermissionIcon(collab.permission)}
                        <span className="text-xs text-gray-600">
                          {getPermissionLabel(collab.permission)}
                        </span>
                      </div>
                    )}

                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingCollaborator(
                          editingCollaborator === collab.user._id ? null : collab.user._id
                        )}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.user._id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsModal;
