import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Fingerprint, 
  Smartphone, 
  Lock, 
  Zap, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  const features = [
    {
      icon: Fingerprint,
      title: 'Biometric Authentication',
      description: 'Use your fingerprint, face ID, or security keys for secure login without passwords.',
    },
    {
      icon: Smartphone,
      title: 'Cross-Platform',
      description: 'Works seamlessly across all your devices - desktop, mobile, and tablets.',
    },
    {
      icon: Lock,
      title: 'Zero Passwords',
      description: 'Eliminate password-related security risks with modern authentication methods.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Login in seconds with just a touch or glance - no typing required.',
    },
    {
      icon: Users,
      title: 'Team Ready',
      description: 'Perfect for teams and organizations looking to enhance their security posture.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with FIDO2/WebAuthn standards and audit logging.',
    },
  ];

  const benefits = [
    'No more password fatigue',
    'Protection against phishing',
    'Faster login experience',
    'Reduced support tickets',
    'Enhanced security posture',
    'Compliance ready',
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  <Star className="h-3 w-3 mr-1" />
                  Trusted by 10,000+ users
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 leading-tight">
                  The Future of{' '}
                  <span className="text-gradient">Authentication</span>
                </h1>
                <p className="text-xl text-secondary-600 leading-relaxed">
                  Experience passwordless login with WebAuthn and OAuth. 
                  Secure, fast, and user-friendly authentication for the modern web.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>

              <div className="flex items-center space-x-6 text-sm text-secondary-500">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  Free to start
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  Setup in minutes
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10">
                <Card className="shadow-large border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                        <Shield className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Secure Login</CardTitle>
                        <CardDescription>Use your device to authenticate</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary-50">
                        <Fingerprint className="h-5 w-5 text-primary-600" />
                        <span className="text-sm font-medium">Touch your fingerprint sensor</span>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary-50">
                        <Smartphone className="h-5 w-5 text-primary-600" />
                        <span className="text-sm font-medium">Or use your security key</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-secondary-200">
                      <p className="text-xs text-secondary-500 text-center">
                        No passwords needed • Secure • Fast
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Background decoration */}
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-primary-200 opacity-20 animate-pulse-slow"></div>
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-secondary-200 opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900">
              Why Choose Passwordless?
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Experience the next generation of authentication with cutting-edge security 
              and unparalleled user experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-medium transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 mb-4">
                      <feature.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-secondary-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-secondary-900">
                  Transform Your Security
                </h2>
                <p className="text-xl text-secondary-600">
                  Join thousands of organizations that have eliminated password-related 
                  security risks and improved their user experience.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center space-x-3"
                  >
                    <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0" />
                    <span className="text-secondary-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="pt-4">
                <Link to="/register">
                  <Button size="lg">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle className="text-center">Security Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-secondary-600">Password attacks prevented</span>
                      <span className="text-2xl font-bold text-success-600">99.9%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div className="bg-success-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-secondary-600">Login time reduction</span>
                      <span className="text-2xl font-bold text-primary-600">75%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-secondary-600">User satisfaction</span>
                      <span className="text-2xl font-bold text-warning-600">98%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div className="bg-warning-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Go Passwordless?
            </h2>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Join the future of authentication. Get started in minutes and 
              experience the security and convenience of passwordless login.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};
