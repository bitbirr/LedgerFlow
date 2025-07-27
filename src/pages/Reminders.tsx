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
  Bell,
  Calendar as CalendarIcon,
  Send,
  Edit,
  Trash2,
  Clock,
  CheckCircle
} from "lucide-react";

interface PaymentReminder {
  id: string;
  account_id: string;
  transaction_id?: string;
  reminder_date: string;
  message?: string;
  is_sent: boolean;
  sent_at?: string;
  accounts: {
    name: string;
  };
  transactions?: {
    amount: number;
    due_date: string;
  };
}

interface Account {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  due_date: string;
  payment_status: string;
  accounts: {
    name: string;
  };
}

const Reminders = () => {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [overdueTransactions, setOverdueTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    account_id: "",
    transaction_id: "",
    reminder_date: new Date(),
    message: ""
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
          accounts(name),
          transactions(amount, due_date)
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

  const fetchOverdueTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name)
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .lt('due_date', today);

      if (error) throw error;
      setOverdueTransactions(data || []);
    } catch (error) {
      console.error('Error fetching overdue transactions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reminder: PaymentReminder) => {
    setEditingReminder(reminder);
    setFormData({
      account_id: reminder.account_id,
      transaction_id: reminder.transaction_id || "",
      reminder_date: new Date(reminder.reminder_date),
      message: reminder.message || ""
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

  const markAsSent = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('payment_reminders')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', reminderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Reminder marked as sent"
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
    setFormData({
      account_id: transaction.account_id,
      transaction_id: transaction.id,
      reminder_date: new Date(),
      message: `Payment reminder for overdue amount of $${transaction.amount}. Due date was ${format(new Date(transaction.due_date), 'MMM dd, yyyy')}.`
    });
    setEditingReminder(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      transaction_id: "",
      reminder_date: new Date(),
      message: ""
    });
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.accounts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "sent" && reminder.is_sent) ||
                         (filterStatus === "pending" && !reminder.is_sent);
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Payment Reminders"
            description="Manage payment reminders and follow up on overdue accounts"
            action={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingReminder(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reminder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReminder ? "Edit Reminder" : "Add New Reminder"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingReminder ? "Update reminder details" : "Create a new payment reminder"}
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
                      <Label htmlFor="reminder_date">Reminder Date *</Label>
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
                            onSelect={(date) => date && setFormData({ ...formData, reminder_date: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Enter reminder message..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : editingReminder ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            }
          />

          {/* Overdue Transactions Alert */}
          {overdueTransactions.length > 0 && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="flex items-center text-warning">
                  <Clock className="h-5 w-5 mr-2" />
                  Overdue Payments ({overdueTransactions.length})
                </CardTitle>
                <CardDescription>
                  These transactions are past their due date and may need follow-up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-2 bg-warning/10 rounded">
                      <div>
                        <p className="font-medium">{transaction.accounts.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(transaction.amount)} - Due: {format(new Date(transaction.due_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createReminderForOverdue(transaction)}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Remind
                      </Button>
                    </div>
                  ))}
                  {overdueTransactions.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search reminders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reminders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
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
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Reminder Date</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReminders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No reminders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReminders.map((reminder) => (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reminder.accounts.name}</p>
                              {reminder.transactions && (
                                <p className="text-sm text-muted-foreground">
                                  Amount: {formatCurrency(reminder.transactions.amount)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(reminder.reminder_date), 'MMM dd, yyyy')}
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
                              <Badge variant="default" className="bg-success">
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
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {!reminder.is_sent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsSent(reminder.id)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(reminder)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(reminder.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

export default Reminders;