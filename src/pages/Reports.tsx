import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/ui/layout";
import { Navigation } from "@/components/Navigation";
import { PageHeader } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import {
  BarChart3,
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  DollarSign,
  FileText,
  AlertCircle
} from "lucide-react";

interface ReportData {
  totalAccounts: number;
  totalTransactions: number;
  totalReceivables: number;
  totalPayables: number;
  netBalance: number;
  accountBalances: Array<{
    name: string;
    balance: number;
    category: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    total: number;
  }>;
  overduePayments: Array<{
    account: string;
    amount: number;
    daysOverdue: number;
  }>;
}

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalAccounts: 0,
    totalTransactions: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netBalance: 0,
    accountBalances: [],
    monthlyTrends: [],
    categoryBreakdown: [],
    overduePayments: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("this_month");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const { toast } = useToast();

  useEffect(() => {
    updateDateRange();
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const updateDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "this_month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case "this_year":
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        break;
      case "custom":
        // Keep current dates for custom range
        break;
    }
  };

  const fetchReportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);

      // Fetch accounts data
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      // Fetch transactions data
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(endDate, 'yyyy-MM-dd'));

      if (transactionsError) throw transactionsError;

      // Fetch cashbook entries
      const { data: cashbookEntries, error: cashbookError } = await supabase
        .from('cashbook_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(endDate, 'yyyy-MM-dd'));

      if (cashbookError) throw cashbookError;

      // Calculate totals
      const totalReceivables = accounts?.reduce((sum, acc) => 
        sum + (acc.current_balance > 0 ? Number(acc.current_balance) : 0), 0) || 0;
      
      const totalPayables = accounts?.reduce((sum, acc) => 
        sum + (acc.current_balance < 0 ? Math.abs(Number(acc.current_balance)) : 0), 0) || 0;

      // Calculate account balances
      const accountBalances = accounts?.map(acc => ({
        name: acc.name,
        balance: Number(acc.current_balance),
        category: acc.categories?.name || 'Uncategorized'
      })) || [];

      // Calculate monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const monthTransactions = transactions?.filter(t => 
          new Date(t.transaction_date) >= monthStart && 
          new Date(t.transaction_date) <= monthEnd
        ) || [];

        const monthCashbook = cashbookEntries?.filter(e => 
          new Date(e.entry_date) >= monthStart && 
          new Date(e.entry_date) <= monthEnd
        ) || [];

        const income = monthTransactions
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + Number(t.amount), 0) +
          monthCashbook
          .filter(e => e.type === 'credit')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const expenses = monthTransactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + Number(t.amount), 0) +
          monthCashbook
          .filter(e => e.type === 'debit')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        monthlyTrends.push({
          month: format(monthStart, 'MMM yyyy'),
          income,
          expenses
        });
      }

      // Calculate category breakdown
      const categoryMap = new Map();
      cashbookEntries?.forEach(entry => {
        const category = entry.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { count: 0, total: 0 });
        }
        const current = categoryMap.get(category);
        categoryMap.set(category, {
          count: current.count + 1,
          total: current.total + Number(entry.amount)
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        total: data.total
      }));

      // Calculate overdue payments
      const today = new Date();
      const overduePayments = transactions?.filter(t => 
        t.payment_status === 'pending' && 
        t.due_date && 
        new Date(t.due_date) < today
      ).map(t => ({
        account: t.accounts.name,
        amount: Number(t.amount),
        daysOverdue: Math.floor((today.getTime() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      setReportData({
        totalAccounts: accounts?.length || 0,
        totalTransactions: transactions?.length || 0,
        totalReceivables,
        totalPayables,
        netBalance: totalReceivables - totalPayables,
        accountBalances,
        monthlyTrends,
        categoryBreakdown,
        overduePayments
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
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

  const exportToCSV = () => {
    // Simple CSV export functionality
    const csvData = [
      ['Account Name', 'Current Balance', 'Category'],
      ...reportData.accountBalances.map(acc => [
        acc.name,
        acc.balance.toString(),
        acc.category
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledgerflow-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully"
    });
  };

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Reports & Analytics"
            description="Comprehensive business insights and financial reports"
            action={
              <Button onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            }
          />

          {/* Date Range Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {dateRange === "custom" && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-40">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(startDate, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-40">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endDate, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalAccounts}</div>
                <p className="text-xs text-muted-foreground">Active customer accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(reportData.totalReceivables)}
                </div>
                <p className="text-xs text-muted-foreground">Amount owed to you</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(reportData.totalPayables)}
                </div>
                <p className="text-xs text-muted-foreground">Amount you owe</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  reportData.netBalance >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(reportData.netBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reportData.netBalance >= 0 ? 'Positive balance' : 'Negative balance'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Account Balances
                </CardTitle>
                <CardDescription>Current balance by account</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.accountBalances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            No accounts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.accountBalances.map((account, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{account.category}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              account.balance >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {formatCurrency(account.balance)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>Income vs Expenses (Last 6 months)</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.monthlyTrends.map((trend, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trend.month}</TableCell>
                          <TableCell className="text-right text-success">
                            {formatCurrency(trend.income)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(trend.expenses)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            (trend.income - trend.expenses) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {formatCurrency(trend.income - trend.expenses)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Expense Categories
                </CardTitle>
                <CardDescription>Breakdown by expense category</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.categoryBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            No expenses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.categoryBreakdown.map((category, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{category.category}</TableCell>
                            <TableCell className="text-right">{category.count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(category.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Overdue Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-warning" />
                  Overdue Payments
                </CardTitle>
                <CardDescription>Payments that are past due</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.overduePayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            No overdue payments
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.overduePayments.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{payment.account}</TableCell>
                            <TableCell className="text-right text-destructive font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="destructive">{payment.daysOverdue} days</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;