import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatsCard } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from "lucide-react";

interface DashboardStats {
  totalAccounts: number;
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  recentTransactions: any[];
  overduePayments: any[];
}

export function Dashboard() {
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
        .select('*')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your accounts and transactions"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Quick Entry
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Accounts"
          value={stats.totalAccounts.toString()}
          description="Active customer accounts"
          icon={<Users className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Receivables"
          value={formatCurrency(stats.totalCredit)}
          description="Amount owed to you"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <StatsCard
          title="Total Payables"
          value={formatCurrency(stats.totalDebit)}
          description="Amount you owe"
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
        />
        <StatsCard
          title="Net Balance"
          value={formatCurrency(stats.netBalance)}
          description={stats.netBalance >= 0 ? "Positive balance" : "Negative balance"}
          icon={stats.netBalance >= 0 ? 
            <ArrowUpRight className="h-4 w-4 text-success" /> : 
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest transaction entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No transactions yet
                </p>
              ) : (
                stats.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.type === 'credit' ? 'bg-success' : 'bg-destructive'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'credit' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(Number(transaction.amount))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-warning" />
              Overdue Payments
            </CardTitle>
            <CardDescription>Payments that are past due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.overduePayments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No overdue payments
                </p>
              ) : (
                stats.overduePayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{payment.accounts?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(payment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-destructive">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}