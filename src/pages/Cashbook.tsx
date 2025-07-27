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
  BookOpen,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface CashbookEntry {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category?: string;
  entry_date: string;
  attachment_url?: string;
}

const Cashbook = () => {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashbookEntry | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    type: "debit" as const,
    amount: 0,
    description: "",
    category: "",
    entry_date: new Date()
  });

  // Predefined categories for business expenses
  const categories = [
    "Office Supplies",
    "Travel & Transport",
    "Marketing & Advertising",
    "Utilities",
    "Rent",
    "Insurance",
    "Professional Services",
    "Equipment",
    "Maintenance",
    "Meals & Entertainment",
    "Bank Charges",
    "Taxes",
    "Other"
  ];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cashbook_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching cashbook entries:', error);
      toast({
        title: "Error",
        description: "Failed to load cashbook entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const entryData = {
        ...formData,
        user_id: user.id,
        entry_date: format(formData.entry_date, 'yyyy-MM-dd')
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('cashbook_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Entry updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('cashbook_entries')
          .insert([entryData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Entry created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      fetchEntries();
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

  const handleEdit = (entry: CashbookEntry) => {
    setEditingEntry(entry);
    setFormData({
      type: entry.type,
      amount: entry.amount,
      description: entry.description,
      category: entry.category || "",
      entry_date: new Date(entry.entry_date)
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await supabase
        .from('cashbook_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Entry deleted successfully"
      });
      fetchEntries();
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
      type: "debit",
      amount: 0,
      description: "",
      category: "",
      entry_date: new Date()
    });
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || entry.type === selectedType;
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate totals
  const totalIncome = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? 
      <ArrowUpRight className="h-4 w-4 text-success" /> : 
      <ArrowDownRight className="h-4 w-4 text-destructive" />;
  };

  const uniqueCategories = [...new Set(entries.map(e => e.category).filter(Boolean))];

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Cashbook"
            description="Track business income and expenses"
            action={
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingEntry(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEntry ? "Edit Entry" : "Add New Entry"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingEntry ? "Update cashbook entry" : "Record a new income or expense"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Type *</Label>
                        <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Income (Money In)</SelectItem>
                            <SelectItem value="debit">Expense (Money Out)</SelectItem>
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
                        <Label htmlFor="description">Description *</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="What was this for?"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Entry Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.entry_date, "PPP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.entry_date}
                              onSelect={(date) => date && setFormData({ ...formData, entry_date: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Saving..." : editingEntry ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground">Money received</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">Money spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                {netCashFlow >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 text-success" /> : 
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                }
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netCashFlow)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {netCashFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Income</SelectItem>
                    <SelectItem value="debit">Expenses</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category!}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Cashbook Entries ({filteredEntries.length})
              </CardTitle>
              <CardDescription>
                Business income and expense records
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
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.entry_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.description}
                          </TableCell>
                          <TableCell>
                            {entry.category && (
                              <Badge variant="outline">
                                {entry.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(entry.type)}
                              <span className="capitalize">
                                {entry.type === 'credit' ? 'Income' : 'Expense'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              entry.type === 'credit' ? 'text-success' : 'text-destructive'
                            }`}>
                              {entry.type === 'credit' ? '+' : '-'}
                              {formatCurrency(entry.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                              >
                                Delete
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

export default Cashbook;