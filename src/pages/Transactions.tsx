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
import { Wizard, WizardField, WizardFormRow, type WizardStep } from "@/components/ui/wizard";
import { FileUpload } from "@/components/ui/file-upload";
import { InvoiceGenerator } from "@/components/ui/invoice-generator";
import { QuickEntry } from "@/components/ui/quick-entry";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToExcel, exportToPDF, formatCurrency, formatDate } from "@/lib/export-utils";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Receipt,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  User,
  DollarSign,
  FileText,
  Clock,
  Paperclip,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";

interface Transaction {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  narration?: string;
  attachment_url?: string;
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
  current_balance: number;
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
    attachment_url: null as string | null,
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
        .select('id, name, current_balance')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const calculateRunningBalance = (accountId: string, amount: number, type: 'credit' | 'debit') => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    
    return type === 'credit' 
      ? account.current_balance + amount
      : account.current_balance - amount;
  };

  const handleWizardSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const runningBalance = calculateRunningBalance(formData.account_id, formData.amount, formData.type);

      const transactionData = {
        account_id: formData.account_id,
        type: formData.type,
        amount: formData.amount,
        description: formData.description,
        narration: formData.narration,
        attachment_url: formData.attachment_url,
        running_balance: runningBalance,
        transaction_date: format(formData.transaction_date, 'yyyy-MM-dd'),
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        payment_status: formData.payment_status,
        reference_number: formData.reference_number,
        user_id: user.id
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

        // Update account balance
        const { error: accountError } = await supabase
          .from('accounts')
          .update({ current_balance: runningBalance })
          .eq('id', formData.account_id);

        if (accountError) throw accountError;

        toast({
          title: "Success",
          description: "Transaction created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || "",
      narration: transaction.narration || "",
      attachment_url: transaction.attachment_url || null,
      transaction_date: new Date(transaction.transaction_date),
      due_date: transaction.due_date ? new Date(transaction.due_date) : undefined,
      payment_status: transaction.payment_status,
      reference_number: transaction.reference_number || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
      
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      type: "credit",
      amount: 0,
      description: "",
      narration: "",
      attachment_url: null,
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

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = {
      headers: ['Date', 'Account', 'Type', 'Description', 'Amount', 'Balance', 'Status', 'Reference'],
      rows: filteredTransactions.map(t => [
        formatDate(t.transaction_date),
        t.accounts.name,
        t.type.toUpperCase(),
        t.description || '',
        formatCurrency(t.amount),
        formatCurrency(t.running_balance),
        t.payment_status.toUpperCase(),
        t.reference_number || ''
      ]),
      filename: `transactions_${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Transaction Report'
    };

    switch (format) {
      case 'csv':
        exportToCSV(exportData);
        break;
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'pdf':
        exportToPDF(exportData);
        break;
    }

    toast({
      title: "Export Complete",
      description: `Transactions exported as ${format.toUpperCase()}`
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      partially_paid: "outline",
      paid: "default",
      overdue: "destructive"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  // Wizard steps
  const wizardSteps: WizardStep[] = [
    {
      id: "basic",
      title: "Basic Details",
      description: "Enter transaction details",
      content: (
        <div className="space-y-4">
          <WizardFormRow>
            <WizardField label="Account" required>
              <Select 
                value={formData.account_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Type" required>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'credit' | 'debit') => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Money In)</SelectItem>
                  <SelectItem value="debit">Debit (Money Out)</SelectItem>
                </SelectContent>
              </Select>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Amount" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </WizardField>
          </WizardFormRow>
        </div>
      ),
      validation: () => {
        return formData.account_id && formData.amount > 0;
      }
    },
    {
      id: "description",
      title: "Description & Attachment",
      description: "Add description and attach files",
      content: (
        <div className="space-y-4">
          <WizardField label="Description">
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Transaction description"
            />
          </WizardField>

          <WizardField label="Narration/Notes">
            <Textarea
              value={formData.narration}
              onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
              placeholder="Additional notes or narration"
              rows={3}
            />
          </WizardField>

          <WizardField label="Attachment (Bill/Receipt)">
            <FileUpload
              value={formData.attachment_url}
              onChange={(url) => setFormData(prev => ({ ...prev, attachment_url: url }))}
              accept="image/*,.pdf,.doc,.docx"
              placeholder="Upload bill, receipt, or supporting document"
            />
          </WizardField>
        </div>
      )
    },
    {
      id: "dates",
      title: "Dates & Status",
      description: "Set dates and payment status",
      content: (
        <div className="space-y-4">
          <WizardFormRow>
            <WizardField label="Transaction Date" required>
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
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, transaction_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Due Date (Optional)">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Payment Status">
              <Select 
                value={formData.payment_status} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_status: value }))}
              >
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
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Reference Number">
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="REF001"
              />
            </WizardField>
          </WizardFormRow>
        </div>
      )
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

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Transactions"
            description="Manage all your financial transactions"
            action={
              <div className="flex space-x-2">
                <Select value="export" onValueChange={handleExport}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">Export CSV</SelectItem>
                    <SelectItem value="excel">Export Excel</SelectItem>
                    <SelectItem value="pdf">Export PDF</SelectItem>
                  </SelectContent>
                </Select>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingTransaction(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTransaction ? "Update transaction details" : "Create a new transaction entry"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Wizard
                      steps={wizardSteps}
                      onComplete={handleWizardSubmit}
                      onCancel={() => setIsDialogOpen(false)}
                    />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                    {accounts.map(account => (
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
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {formatDate(transaction.transaction_date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transaction.accounts.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {transaction.description}
                              {transaction.attachment_url && (
                                <Paperclip className="h-4 w-4 ml-2 text-gray-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getTypeIcon(transaction.type)}
                              <span className="ml-2 capitalize">{transaction.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transaction.running_balance)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.payment_status)}
                          </TableCell>
                          <TableCell>
                            {transaction.reference_number || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {transaction.attachment_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(transaction.attachment_url!, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <InvoiceGenerator
                                accountId={transaction.account_id}
                                accountName={transaction.accounts.name}
                                transactions={[transaction]}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(transaction)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Entry Widget */}
      <QuickEntry onEntryAdded={fetchTransactions} />
    </Layout>
  );
};

export default Transactions;