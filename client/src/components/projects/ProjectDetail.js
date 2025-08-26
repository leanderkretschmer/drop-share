import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Share2, 
  Users,
  Calendar,
  Tag,
  Upload,
  Download,
  File,
  MoreVertical,
  Eye,
  EyeOff,
  MessageSquare
} from 'lucide-react';
import ShareModal from './ShareModal';
import CollaboratorsModal from './CollaboratorsModal';
import ChatPanel from './ChatPanel';
import EditProjectModal from './EditProjectModal';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchFiles();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden des Projekts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`/api/files/project/${id}`);
      setFiles(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(`/api/files/upload/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Datei erfolgreich hochgeladen');
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Upload-Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`/api/files/download/${fileId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download gestartet');
    } catch (error) {
      console.error('Download-Fehler:', error);
      toast.error('Fehler beim Download');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Möchten Sie diese Datei wirklich löschen?')) {
      return;
    }

    try {
      await axios.delete(`/api/files/${fileId}`);
      toast.success('Datei erfolgreich gelöscht');
      fetchFiles();
    } catch (error) {
      console.error('Lösch-Fehler:', error);
      toast.error('Fehler beim Löschen der Datei');
    }
  };

  const canUpload = user.canUpload || user.isAdmin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Projekt nicht gefunden</h3>
          <p className="text-gray-600">Das angeforderte Projekt existiert nicht oder Sie haben keine Berechtigung.</p>
        </div>
      </div>
    );
  }

  const isOwner = project?.owner._id === user.id;

  const handleProjectUpdate = (updatedProject) => {
    setProject(updatedProject);
  };

  const handleProjectEdit = (updatedProject) => {
    setProject(updatedProject);
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Möchten Sie dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await axios.delete(`/api/projects/${id}`);
      toast.success('Projekt erfolgreich gelöscht');
      // Zurück zum Dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Lösch-Fehler:', error);
      toast.error('Fehler beim Löschen des Projekts');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-gray-600 mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {isOwner && (
              <>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Bearbeiten</span>
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Teilen</span>
                </button>
                <button 
                  onClick={() => setShowCollaboratorsModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Kollaboratoren</span>
                </button>
                <button 
                  onClick={handleDeleteProject}
                  className="btn-danger flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Löschen</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Projektinformationen
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Besitzer</p>
                  <p className="text-sm text-gray-600">{project.owner.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Erstellt am</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Zuletzt aktualisiert</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(project.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Kollaboratoren</p>
                  <p className="text-sm text-gray-600">
                    {project.collaborators.length} Benutzer
                  </p>
                </div>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tags</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {project.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Files Section */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Dateien ({files.length})
              </h2>
              {canUpload && (
                <button
                  onClick={() => document.getElementById('fileInput').click()}
                  className="btn-primary flex items-center space-x-2"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}</span>
                </button>
              )}
            </div>

            {/* Upload Section */}
            {canUpload && (
              <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip,.rar,.mp4,.avi,.mov,.mp3,.wav,.ogg"
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="btn-primary text-sm"
                      >
                        {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                      </button>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="btn-secondary text-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Klicken Sie auf "Datei hochladen" oder ziehen Sie eine Datei hierher
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Files List */}
            {files.length === 0 ? (
              <div className="text-center py-8">
                <File className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {canUpload ? 'Noch keine Dateien hochgeladen' : 'Keine Dateien verfügbar'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>Hochgeladen von {file.uploadedBy.username}</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                          {file.downloads > 0 && (
                            <span>{file.downloads} Downloads</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(file._id, file.originalName)}
                        className="btn-secondary text-sm flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      
                      {(isOwner || file.uploadedBy._id === user.id) && (
                        <button
                          onClick={() => handleDeleteFile(file._id)}
                          className="btn-danger text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Löschen</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Projektstatus
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Öffentlich</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.isPublic 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {project.isPublic ? 'Ja' : 'Nein'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Berechtigung</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isOwner 
                    ? 'bg-primary-100 text-primary-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isOwner ? 'Besitzer' : 'Kollaborator'}
                </span>
              </div>
            </div>
          </div>

          {/* Collaborators */}
          {project.collaborators.length > 0 && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Kollaboratoren
              </h3>
              
              <div className="space-y-2">
                {project.collaborators.map((collab) => (
                  <div key={collab.user._id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">
                      {collab.user.username}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      collab.permission === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : collab.permission === 'write'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {collab.permission}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Panel */}
          <div className="card mt-6">
            <ChatPanel projectId={id} />
          </div>
        </div>


      </div>

      {/* Modals */}
      <ShareModal
        project={project}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      
      <CollaboratorsModal
        project={project}
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        onUpdate={handleProjectUpdate}
      />
      
      <EditProjectModal
        project={project}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onProjectUpdated={handleProjectEdit}
      />
    </div>
  );
};

export default ProjectDetail;
