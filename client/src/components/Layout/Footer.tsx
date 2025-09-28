import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Github, Twitter, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-secondary-200 bg-secondary-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Passwordless Portal</span>
            </div>
            <p className="text-sm text-secondary-600">
              Modern passwordless authentication with WebAuthn and OAuth support.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-secondary-900">Product</h3>
            <ul className="space-y-2 text-sm text-secondary-600">
              <li>
                <Link to="/features" className="hover:text-secondary-900 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-secondary-900 transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-secondary-900 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-secondary-900 transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-secondary-900">Support</h3>
            <ul className="space-y-2 text-sm text-secondary-600">
              <li>
                <Link to="/help" className="hover:text-secondary-900 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary-900 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/status" className="hover:text-secondary-900 transition-colors">
                  Status
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-secondary-900 transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-secondary-900">Legal</h3>
            <ul className="space-y-2 text-sm text-secondary-600">
              <li>
                <Link to="/privacy" className="hover:text-secondary-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-secondary-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-secondary-900 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-secondary-900 transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-secondary-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-secondary-600">
              © 2024 Passwordless Portal. All rights reserved.
            </p>
            <p className="text-sm text-secondary-500 mt-2 md:mt-0">
              Built with ❤️ using WebAuthn & React
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
