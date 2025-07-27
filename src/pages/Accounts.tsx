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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Eye
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  category_id?: string;
  opening_balance: number;
  current_balance: number;
  credit_limit: number;
  status: 'active' | 'inactive' | 'blocked';
  categories?: {
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    category_id: "",
    opening_balance: 0,
    credit_limit: 0,
    status: "active" as const
  });

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accountData = {
        ...formData,
        user_id: user.id,
        current_balance: formData.opening_balance
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Account updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([accountData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Account created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
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

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      phone: account.phone || "",
      email: account.email || "",
      address: account.address || "",
      category_id: account.category_id || "",
      opening_balance: account.opening_balance,
      credit_limit: account.credit_limit,
      status: account.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Account deleted successfully"
      });
      fetchAccounts();
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
      name: "",
      phone: "",
      email: "",
      address: "",
      category_id: "",
      opening_balance: 0,
      credit_limit: 0,
      status: "active"
    });
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.phone?.includes(searchTerm) ||
                         account.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || account.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      blocked: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Accounts"
            description="Manage your customers and suppliers"
            action={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingAccount(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAccount ? "Edit Account" : "Add New Account"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAccount ? "Update account information" : "Create a new customer or supplier account"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="opening_balance">Opening Balance</Label>
                        <Input
                          id="opening_balance"
                          type="number"
                          step="0.01"
                          value={formData.opening_balance}
                          onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credit_limit">Credit Limit</Label>
                        <Input
                          id="credit_limit"
                          type="number"
                          step="0.01"
                          value={formData.credit_limit}
                          onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : editingAccount ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            }
          />

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Accounts ({filteredAccounts.length})
              </CardTitle>
              <CardDescription>
                Manage your customer and supplier accounts
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
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{account.name}</p>
                              {account.address && (
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {account.address}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {account.phone && (
                                <p className="text-sm flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {account.phone}
                                </p>
                              )}
                              {account.email && (
                                <p className="text-sm flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {account.email}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {account.categories && (
                              <Badge 
                                variant="outline" 
                                style={{ borderColor: account.categories.color, color: account.categories.color }}
                              >
                                {account.categories.name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              account.current_balance >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {formatCurrency(account.current_balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(account.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(account.id)}
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

export default Accounts;