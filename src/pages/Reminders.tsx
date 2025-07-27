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
import { Wizard, WizardStep, WizardField, WizardFormRow } from "@/components/ui/wizard";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToExcel, exportToPDF, formatCurrency, formatDate } from "@/lib/export-utils";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Bell,
  Calendar as CalendarIcon,
  Send,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  MessageSquare,
  Download,
  AlertTriangle,
  User,
  DollarSign,
  FileText
} from "lucide-react";

interface PaymentReminder {
  id: string;
  account_id: string;
  transaction_id?: string;
  reminder_date: string;
  message?: string;
  reminder_type: 'email' | 'sms' | 'call' | 'notification';
  is_sent: boolean;
  sent_at?: string;
  accounts: {
    name: string;
    email?: string;
    phone?: string;
  };
  transactions?: {
    amount: number;
    due_date: string;
    description?: string;
  };
}

interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  due_date: string;
  payment_status: string;
  description?: string;
  accounts: {
    name: string;
    email?: string;
    phone?: string;
  };
}

const Reminders = () => {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [overdueTransactions, setOverdueTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    account_id: "",
    transaction_id: "",
    reminder_date: new Date(),
    message: "",
    reminder_type: "email" as const
  });

  useEffect(() => {
    fetchReminders();
    fetchAccounts();
    fetchOverdueTransactions();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment_reminders')
        .select(`
          *,
          accounts(name, email, phone),
          transactions(amount, due_date, description)
        `)
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to load reminders",
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
        .select('id, name, email, phone')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchOverdueTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name, email, phone)
        `)
        .eq('user_id', user.id)
        .in('payment_status', ['pending', 'overdue'])
        .lt('due_date', today);

      if (error) throw error;
      setOverdueTransactions(data || []);
    } catch (error) {
      console.error('Error fetching overdue transactions:', error);
    }
  };

  const handleWizardSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const reminderData = {
        ...formData,
        user_id: user.id,
        reminder_date: format(formData.reminder_date, 'yyyy-MM-dd'),
        transaction_id: formData.transaction_id || null
      };

      if (editingReminder) {
        const { error } = await supabase
          .from('payment_reminders')
          .update(reminderData)
          .eq('id', editingReminder.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Reminder updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('payment_reminders')
          .insert([reminderData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Reminder created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingReminder(null);
      resetForm();
      fetchReminders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (reminder: PaymentReminder) => {
    setEditingReminder(reminder);
    setFormData({
      account_id: reminder.account_id,
      transaction_id: reminder.transaction_id || "",
      reminder_date: new Date(reminder.reminder_date),
      message: reminder.message || "",
      reminder_type: reminder.reminder_type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;

    try {
      const { error } = await supabase
        .from('payment_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Reminder deleted successfully"
      });
      fetchReminders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendReminder = async (reminder: PaymentReminder) => {
    try {
      // Simulate sending reminder (in real app, integrate with email/SMS service)
      const { error } = await supabase
        .from('payment_reminders')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', reminder.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${reminder.reminder_type.toUpperCase()} reminder sent to ${reminder.accounts.name}`
      });
      fetchReminders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const createReminderForOverdue = (transaction: Transaction) => {
    const defaultMessage = `Dear ${transaction.accounts.name},

This is a friendly reminder that your payment of ${formatCurrency(transaction.amount)} was due on ${formatDate(transaction.due_date)}.

Transaction Details:
- Amount: ${formatCurrency(transaction.amount)}
- Due Date: ${formatDate(transaction.due_date)}
- Description: ${transaction.description || 'N/A'}

Please arrange for payment at your earliest convenience. If you have any questions or concerns, please don't hesitate to contact us.

Thank you for your attention to this matter.

Best regards,
LedgerFlow Team`;

    setFormData({
      account_id: transaction.account_id,
      transaction_id: transaction.id,
      reminder_date: new Date(),
      message: defaultMessage,
      reminder_type: transaction.accounts.email ? "email" : transaction.accounts.phone ? "sms" : "notification"
    });
    setEditingReminder(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      transaction_id: "",
      reminder_date: new Date(),
      message: "",
      reminder_type: "email"
    });
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.accounts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "sent" && reminder.is_sent) ||
                         (filterStatus === "pending" && !reminder.is_sent);
    const matchesType = filterType === "all" || reminder.reminder_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = {
      headers: ['Account', 'Type', 'Date', 'Message', 'Status', 'Sent At'],
      rows: filteredReminders.map(r => [
        r.accounts.name,
        r.reminder_type.toUpperCase(),
        formatDate(r.reminder_date),
        r.message || '',
        r.is_sent ? 'SENT' : 'PENDING',
        r.sent_at ? formatDate(r.sent_at) : ''
      ]),
      filename: `reminders_${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Payment Reminders Report'
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
      description: `Reminders exported as ${format.toUpperCase()}`
    });
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderTypeBadge = (type: string) => {
    const colors = {
      email: "bg-blue-100 text-blue-800",
      sms: "bg-green-100 text-green-800",
      call: "bg-purple-100 text-purple-800",
      notification: "bg-gray-100 text-gray-800"
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || colors.notification}>
        {getReminderTypeIcon(type)}
        <span className="ml-1">{type.toUpperCase()}</span>
      </Badge>
    );
  };

  // Wizard steps
  const wizardSteps: WizardStep[] = [
    {
      id: "basic",
      title: "Basic Details",
      description: "Select account and reminder type",
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
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {account.name}
                        {account.email && <Mail className="h-3 w-3 ml-2 text-gray-400" />}
                        {account.phone && <Phone className="h-3 w-3 ml-1 text-gray-400" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Reminder Type" required>
              <Select 
                value={formData.reminder_type} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, reminder_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="call">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </div>
                  </SelectItem>
                  <SelectItem value="notification">
                    <div className="flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      Notification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </WizardField>
          </WizardFormRow>

          <WizardFormRow>
            <WizardField label="Reminder Date" required>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.reminder_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.reminder_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, reminder_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </WizardField>
          </WizardFormRow>
        </div>
      ),
      validation: () => {
        return formData.account_id && formData.reminder_type;
      }
    },
    {
      id: "message",
      title: "Message Content",
      description: "Compose your reminder message",
      content: (
        <div className="space-y-4">
          <WizardField label="Reminder Message">
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your reminder message..."
              rows={8}
              className="resize-none"
            />
          </WizardField>
          
          <div className="text-sm text-gray-500">
            <p className="font-medium mb-2">Message Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Be polite and professional</li>
              <li>Include specific payment details</li>
              <li>Provide clear next steps</li>
              <li>Include contact information</li>
            </ul>
          </div>
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
            title="Payment Reminders"
            description="Manage payment reminders and follow up on overdue accounts"
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
                    <Button onClick={() => { resetForm(); setEditingReminder(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingReminder ? "Edit Reminder" : "Add New Reminder"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingReminder ? "Update reminder details" : "Create a new payment reminder"}
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

          {/* Overdue Transactions Alert */}
          {overdueTransactions.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Overdue Payments ({overdueTransactions.length})
                </CardTitle>
                <CardDescription>
                  These transactions are past their due date and may need follow-up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.accounts.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(transaction.amount)} - Due: {formatDate(transaction.due_date)}
                          </p>
                          {transaction.description && (
                            <p className="text-xs text-gray-400">{transaction.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {transaction.accounts.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${transaction.accounts.phone}`, '_self')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => createReminderForOverdue(transaction)}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Remind
                        </Button>
                      </div>
                    </div>
                  ))}
                  {overdueTransactions.length > 5 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      And {overdueTransactions.length - 5} more overdue payments...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search reminders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reminders Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Payment Reminders ({filteredReminders.length})
              </CardTitle>
              <CardDescription>
                Manage and track payment reminder communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No reminders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReminders.map((reminder) => (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{reminder.accounts.name}</p>
                                {reminder.transactions && (
                                  <p className="text-sm text-gray-500">
                                    {formatCurrency(reminder.transactions.amount)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getReminderTypeBadge(reminder.reminder_type)}
                          </TableCell>
                          <TableCell>
                            {formatDate(reminder.reminder_date)}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate">
                                {reminder.message || "No message"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reminder.is_sent ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {!reminder.is_sent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => sendReminder(reminder)}
                                  title="Send reminder"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {reminder.accounts.phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`tel:${reminder.accounts.phone}`, '_self')}
                                  title="Call customer"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(reminder)}
                                title="Edit reminder"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(reminder.id)}
                                title="Delete reminder"
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
    </Layout>
  );
};

export default Reminders;