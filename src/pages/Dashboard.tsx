import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickEntry } from "@/components/ui/quick-entry";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  Star,
  Share2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  BarChart3,
  DollarSign,
  CreditCard,
  FileText,
  Calendar,
  AlertCircle,
  Wallet,
  BookOpen,
  Bell
} from "lucide-react";

interface DashboardStats {
  totalAccounts: number;
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  recentTransactions: any[];
  overduePayments: any[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    totalCredit: 0,
    totalDebit: 0,
    netBalance: 0,
    recentTransactions: [],
    overduePayments: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accounts count
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      // Fetch transactions summary
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (transactionsError) throw transactionsError;

      // Calculate totals
      const totalCredit = accounts?.reduce((sum, acc) => 
        sum + (acc.current_balance > 0 ? Number(acc.current_balance) : 0), 0) || 0;
      
      const totalDebit = accounts?.reduce((sum, acc) => 
        sum + (acc.current_balance < 0 ? Math.abs(Number(acc.current_balance)) : 0), 0) || 0;

      // Fetch overdue payments
      const today = new Date().toISOString().split('T')[0];
      const { data: overduePayments, error: overdueError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name)
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .lt('due_date', today);

      if (overdueError) throw overdueError;

      setStats({
        totalAccounts: accounts?.length || 0,
        totalCredit,
        totalDebit,
        netBalance: totalCredit - totalDebit,
        recentTransactions: transactions || [],
        overduePayments: overduePayments || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const categories = [
    {
      name: "Accounts",
      count: `${stats.totalAccounts} accounts`,
      icon: Users,
      color: "bg-[hsl(var(--category-purple))]",
      href: "/accounts"
    },
    {
      name: "Transactions",
      count: `${stats.recentTransactions.length} recent`,
      icon: Receipt,
      color: "bg-[hsl(var(--category-teal))]",
      href: "/transactions"
    },
    {
      name: "Reports",
      count: "Analytics",
      icon: BarChart3,
      color: "bg-[hsl(var(--category-pink))]",
      href: "/reports"
    },
    {
      name: "Cashbook",
      count: "Cash flow",
      icon: BookOpen,
      color: "bg-[hsl(var(--category-blue))]",
      href: "/cashbook"
    }
  ];

  const files = [
    {
      name: "Receivables",
      type: "Financial",
      size: formatCurrency(stats.totalCredit),
      icon: TrendingUp,
      color: "bg-[hsl(var(--category-blue))]"
    },
    {
      name: "Payables",
      type: "Financial",
      size: formatCurrency(stats.totalDebit),
      icon: TrendingDown,
      color: "bg-[hsl(var(--category-pink))]"
    },
    {
      name: "Net Balance",
      type: "Summary",
      size: formatCurrency(stats.netBalance),
      icon: BarChart3,
      color: "bg-[hsl(var(--category-teal))]"
    },
    {
      name: "Overdue Items",
      type: "Alerts",
      size: `${stats.overduePayments.length} items`,
      icon: Bell,
      color: "bg-[hsl(var(--category-orange))]"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="main-content sidebar-open">
          <div className="responsive-container card-padding">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const refreshDashboard = () => {
    fetchStats();
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="main-content sidebar-open">
        <div className="responsive-container card-padding">
          <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  placeholder="Search" 
                  className="form-input pl-12 py-3 text-base"
                />
              </div>
              <Link to="/transactions">
                <Button className="modern-button-primary">
                  <Download className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Add new entry</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            </div>

            {/* Categories Section */}
            <div>
              <h2 className="responsive-subtitle text-gray-800 mb-4 sm:mb-6">Categories</h2>
              <div className="responsive-grid">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Link key={category.name} to={category.href}>
                      <div className={`category-card ${category.color}`}>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white/60" />
                          </div>
                          <h3 className="font-semibold text-base sm:text-lg mb-1">{category.name}</h3>
                          <p className="text-white/80 text-xs sm:text-sm">{category.count}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Files Section */}
            <div>
              <h2 className="responsive-subtitle text-gray-800 mb-4 sm:mb-6">Financial Overview</h2>
              <div className="space-y-3 sm:space-y-4">
                {files.map((file, index) => {
                  const Icon = file.icon;
                  return (
                    <div key={index} className="file-item">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${file.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{file.name}</h3>
                            <p className="text-gray-500 text-xs sm:text-sm">{file.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                          <span className="text-gray-600 font-medium text-sm sm:text-base hidden sm:inline">{file.size}</span>
                          <span className="text-gray-600 font-medium text-xs sm:hidden">{file.size.length > 10 ? file.size.substring(0, 8) + '...' : file.size}</span>
                          <div className="hidden sm:flex space-x-2">
                            <Button variant="ghost" size="sm" className="rounded-xl">
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-xl">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" className="rounded-xl sm:hidden">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h2 className="responsive-subtitle text-gray-800 mb-4 sm:mb-6">Recent Transactions</h2>
              <div className="modern-card card-padding">
                <div className="space-y-3 sm:space-y-4">
                  {stats.recentTransactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 responsive-body">
                      No recent transactions
                    </p>
                  ) : (
                    stats.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50/50">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${
                            transaction.type === 'credit' ? 'bg-[hsl(var(--category-teal))]' : 'bg-[hsl(var(--category-pink))]'
                          } flex items-center justify-center flex-shrink-0`}>
                            {transaction.type === 'credit' ? 
                              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" /> : 
                              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-gray-800 text-sm sm:text-base truncate">{transaction.description}</h4>
                            <p className="text-gray-500 text-xs sm:text-sm">
                              <span className="hidden sm:inline">{transaction.accounts?.name} • </span>
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-semibold text-sm sm:text-base ${
                            transaction.type === 'credit' ? 'text-[hsl(var(--category-teal))]' : 'text-[hsl(var(--category-pink))]'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            <span className="hidden sm:inline">{formatCurrency(Number(transaction.amount))}</span>
                            <span className="sm:hidden">${Number(transaction.amount).toFixed(0)}</span>
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div className="responsive-grid-2">
              <div className="modern-card card-padding">
                <h3 className="font-semibold text-gray-800 mb-4 text-base sm:text-lg">Your Balance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net Balance</span>
                    <span className="font-medium">{formatCurrency(stats.netBalance)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[hsl(var(--category-teal))] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.max((stats.netBalance / (stats.totalCredit || 1)) * 100, 0), 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.netBalance >= 0 ? 'Positive' : 'Negative'} balance
                  </p>
                </div>
              </div>

              <div className="modern-card card-padding">
                <h3 className="font-semibold text-gray-800 mb-4 text-base sm:text-lg">Quick Actions</h3>
                <div className="space-y-3">
                  <Link to="/accounts" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--category-purple))] flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Manage Accounts</span>
                  </Link>
                  <Link to="/transactions" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--category-teal))] flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Add Transaction</span>
                  </Link>
                  <Link to="/reports" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--category-pink))] flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">View Reports</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Entry Widget */}
      <QuickEntry onEntryAdded={refreshDashboard} />
    </div>
  );
};

export default Dashboard;