import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Plus, 
  FolderOpen, 
  Users, 
  Calendar, 
  MoreVertical,
  Search,
  Filter,
  Trash2,
  Edit
} from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Click outside handler für Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Projekte');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'owned' && project.owner._id === user.id) ||
                         (filterType === 'shared' && project.owner._id !== user.id);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteProject = async (projectId, projectName) => {
    console.log('Attempting to delete project:', projectId, projectName);
    
    if (!window.confirm(`Möchten Sie das Projekt "${projectName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Sending DELETE request to:', `/api/projects/${projectId}`);
      const response = await axios.delete(`/api/projects/${projectId}`);
      console.log('Delete response:', response.data);
      toast.success('Projekt erfolgreich gelöscht');
      fetchProjects(); // Projekte neu laden
    } catch (error) {
      console.error('Lösch-Fehler:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Fehler beim Löschen des Projekts');
    }
  };

  const toggleDropdown = (projectId) => {
    console.log('Toggling dropdown for project:', projectId, 'Current open dropdown:', openDropdown);
    setOpenDropdown(openDropdown === projectId ? null : projectId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Willkommen, {user.username}!
            </h1>
            <p className="mt-2 text-gray-600">
              Verwalten Sie Ihre Projekte und teilen Sie Dateien sicher
            </p>
          </div>
          
          {user.canUpload && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 sm:mt-0 btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Neues Projekt</span>
            </button>
          )}
        </div>

        {/* Status Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {user.isAdmin && (
            <span className="bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full font-medium">
              Administrator
            </span>
          )}
          {user.canUpload ? (
            <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
              Upload berechtigt
            </span>
          ) : (
            <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">
              Warten auf Upload-Genehmigung
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Projekte durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field pl-10 appearance-none"
          >
            <option value="all">Alle Projekte</option>
            <option value="owned">Meine Projekte</option>
            <option value="shared">Geteilte Projekte</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || filterType !== 'all' ? 'Keine Projekte gefunden' : 'Keine Projekte vorhanden'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {user.canUpload 
              ? 'Erstellen Sie Ihr erstes Projekt, um zu beginnen.'
              : 'Warten Sie auf die Genehmigung eines Administrators.'
            }
          </p>
          {user.canUpload && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Neues Projekt erstellen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id} className="card-hover group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="ml-4 relative dropdown-container">
                  <button 
                    onClick={() => toggleDropdown(project._id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {openDropdown === project._id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <div className="py-1">
                        {project.owner._id === user.id && (
                          <>
                            <button
                              onClick={() => {
                                setOpenDropdown(null);
                                // Hier könnte man zur Bearbeitung weiterleiten
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => {
                                setOpenDropdown(null);
                                handleDeleteProject(project._id, project.name);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Löschen
                            </button>
                          </>
                        )}
                        {project.owner._id !== user.id && (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            Nur der Besitzer kann das Projekt bearbeiten
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{project.collaborators.length}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
                
                {project.owner._id === user.id && (
                  <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                    Besitzer
                  </span>
                )}
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 3 && (
                    <span className="text-gray-400 text-xs">
                      +{project.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Link
                  to={`/project/${project._id}`}
                  className="btn-secondary w-full text-center"
                >
                  Projekt öffnen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={(newProject) => {
            setProjects([newProject, ...projects]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
