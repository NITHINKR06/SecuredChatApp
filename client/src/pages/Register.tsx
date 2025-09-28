import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { getOAuthUrl } from '@/lib/api';
import { Shield, Github, Chrome, AlertCircle, CheckCircle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers, no spaces')
    .transform(val => val.toLowerCase()),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser, webAuthnSupported } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await registerUser(data.email, data.username, data.displayName);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message?.includes('username')) {
        setError('Username is already taken. Please choose another one.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = getOAuthUrl(provider);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-large border-0">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                  <Shield className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>
                  Join the future of secure authentication
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {!webAuthnSupported && (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    WebAuthn is not supported in your browser. Please use OAuth registration instead.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  {...register('displayName')}
                  type="text"
                  label="Display Name"
                  placeholder="Enter your name"
                  error={errors.displayName?.message}
                  disabled={isLoading}
                />

                <Input
                  {...register('username')}
                  type="text"
                  label="Username"
                  placeholder="Choose a unique username (lowercase, no spaces)"
                  error={errors.username?.message}
                  disabled={isLoading}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    e.target.value = value;
                    register('username').onChange(e);
                  }}
                />

                <Input
                  {...register('email')}
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={isLoading}
                  disabled={!webAuthnSupported}
                >
                  {isLoading ? 'Setting up your account...' : 'Create Account'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-secondary-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-secondary-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Card className="bg-success-50 border-success-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-success-900">What happens next?</h3>
                  <div className="space-y-2 text-xs text-success-700">
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span>We'll ask you to register your device (fingerprint, face ID, or security key)</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span>Your account will be created securely</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span>You can start using passwordless login immediately</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};
