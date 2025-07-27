import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Shield, Smartphone, BarChart3, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };

    checkSession();
  }, [navigate]);

  const features = [
    {
      icon: Users,
      title: "Account Management",
      description: "Organize customers and suppliers with categories and contact details"
    },
    {
      icon: TrendingUp,
      title: "Transaction Tracking", 
      description: "Record credit/debit entries with running balance calculations"
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "Generate detailed reports in Excel and PDF formats"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and stored securely with backup options"
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Access your ledger from any device, anywhere, anytime"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="bg-card/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-white mr-2" />
              <span className="text-xl font-bold text-white">LedgerFlow</span>
            </div>
            <div className="space-x-4">
              <Button variant="outline" onClick={() => navigate('/auth')} className="text-white border-white hover:bg-white hover:text-primary">
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')} className="bg-white text-primary hover:bg-white/90">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Manage Your Business
            <span className="block text-white/90">Credit & Debt Smartly</span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Replace your traditional ledger with a modern, digital cashbook. Track customers, manage transactions, 
            send payment reminders, and generate professional reports.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white hover:text-primary">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Ledger
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for small businesses, retailers, and distributors
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center p-6 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-lg mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Ledger?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of businesses already using LedgerFlow to manage their accounts
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6 mr-2" />
            <span className="font-semibold">LedgerFlow</span>
          </div>
          <p className="text-gray-400">
            © 2024 LedgerFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
