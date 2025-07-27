import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/ui/layout";
import { Navigation } from "@/components/Navigation";
import { PageHeader } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Receipt,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download
} from "lucide-react";

interface Transaction {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  narration?: string;
  running_balance: number;
  transaction_date: string;
  due_date?: string;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  reference_number?: string;
  accounts: {
    name: string;
  };
}

interface Account {
  id: string;
  name: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    account_id: "",
    type: "credit" as const,
    amount: 0,
    description: "",
    narration: "",
    transaction_date: new Date(),
    due_date: undefined as Date | undefined,
    payment_status: "pending" as const,
    reference_number: ""
  });

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionData = {
        ...formData,
        user_id: user.id,
        transaction_date: format(formData.transaction_date, 'yyyy-MM-dd'),
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Transaction updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Transaction created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      type: "credit",
      amount: 0,
      description: "",
      narration: "",
      transaction_date: new Date(),
      due_date: undefined,
      payment_status: "pending",
      reference_number: ""
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.accounts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = selectedAccount === "all" || transaction.account_id === selectedAccount;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    const matchesStatus = selectedStatus === "all" || transaction.payment_status === selectedStatus;
    return matchesSearch && matchesAccount && matchesType && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      partially_paid: "warning",
      paid: "default",
      overdue: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? 
      <ArrowUpRight className="h-4 w-4 text-success" /> : 
      <ArrowDownRight className="h-4 w-4 text-destructive" />;
  };

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Transactions"
            description="Manage credit and debit entries"
            action={
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingTransaction(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTransaction ? "Update transaction details" : "Record a new credit or debit entry"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="account">Account *</Label>
                        <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type *</Label>
                        <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Credit (Money In)</SelectItem>
                            <SelectItem value="debit">Debit (Money Out)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="narration">Narration</Label>
                        <Textarea
                          id="narration"
                          value={formData.narration}
                          onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                          placeholder="Detailed notes"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Transaction Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(formData.transaction_date, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.transaction_date}
                                onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.due_date ? format(formData.due_date, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.due_date}
                                onSelect={(date) => setFormData({ ...formData, due_date: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_status">Payment Status</Label>
                          <Select value={formData.payment_status} onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="partially_paid">Partially Paid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reference_number">Reference #</Label>
                          <Input
                            id="reference_number"
                            value={formData.reference_number}
                            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                            placeholder="REF001"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Saving..." : editingTransaction ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Transactions ({filteredTransactions.length})
              </CardTitle>
              <CardDescription>
                Credit and debit entries for all accounts
              </CardDescription>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transaction.accounts.name}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              {transaction.narration && (
                                <p className="text-sm text-muted-foreground">{transaction.narration}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(transaction.type)}
                              <span className="capitalize">{transaction.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.type === 'credit' ? 'text-success' : 'text-destructive'
                            }`}>
                              {transaction.type === 'credit' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.running_balance >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {formatCurrency(transaction.running_balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.payment_status)}
                          </TableCell>
                          <TableCell>
                            {transaction.reference_number && (
                              <Badge variant="outline">
                                {transaction.reference_number}
                              </Badge>
                            )}
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
    </Layout>
  );
};

export default Transactions;