import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Shield, LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient">Passwordless Portal</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/devices"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Devices
              </Link>
              <Link
                to="/sessions"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Sessions
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        {isAuthenticated && user ? (
          <div className="flex items-center space-x-4">
            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                {getInitials(user.displayName)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-secondary-900">{user.displayName}</p>
                <p className="text-xs text-secondary-500">{user.email}</p>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-600 hover:text-secondary-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
