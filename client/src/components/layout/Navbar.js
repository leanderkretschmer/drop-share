import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FolderOpen, 
  Users, 
  LogOut, 
  Menu, 
  X,
  User,
  Settings
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">
              kretschmer-leander // drop
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/dashboard" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
            >
              Dashboard
            </Link>
            
            {user?.isAdmin && (
              <Link 
                to="/admin" 
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <Users className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="font-medium">{user?.username}</span>
              {user?.isAdmin && (
                <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                  Admin
                </span>
              )}
              {user?.canUpload && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Upload
                </span>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Abmelden</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/dashboard" 
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              
              {user?.isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200 flex items-center space-x-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{user?.username}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {user?.isAdmin && (
                    <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                  {user?.canUpload && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Upload
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
