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
import { Wizard, WizardField, WizardFormRow, type WizardStep } from "@/components/ui/wizard";
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
  User,
  Building,
  DollarSign
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
    status: "active" as "active" | "inactive" | "blocked"
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

  const handleWizardSubmit = async (data: any) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accountData = {
        ...data,
        user_id: user.id,
        current_balance: data.opening_balance
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
      status: "active" as "active" | "inactive" | "blocked"
    });
  };

  const handleWizardComplete = async () => {
    await handleWizardSubmit(formData);
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

  const wizardSteps: WizardStep[] = [
    {
      id: "basic",
      title: "Basic Information",
      description: "Enter the basic account details",
      content: (
        <div className="space-y-4">
          <WizardField label="Name" required>
            <Input
              name="name"
              placeholder="Enter account name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </WizardField>
          <WizardField label="Phone">
            <Input
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </WizardField>
          <WizardField label="Email">
            <Input
              name="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </WizardField>
        </div>
      )
    },
    {
      id: "details",
      title: "Account Details",
      description: "Configure account settings and category",
      content: (
        <div className="space-y-4">
          <WizardField label="Address">
            <Input
              name="address"
              placeholder="Enter address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </WizardField>
          <WizardField label="Category">
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
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
          </WizardField>
          <WizardField label="Status">
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "active" | "inactive" | "blocked" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </WizardField>
        </div>
      )
    },
    {
      id: "financial",
      title: "Financial Settings",
      description: "Set opening balance and credit limits",
      content: (
        <div className="space-y-4">
          <WizardFormRow>
            <WizardField label="Opening Balance">
              <Input
                name="opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: Number(e.target.value) }))}
              />
            </WizardField>
            <WizardField label="Credit Limit">
              <Input
                name="credit_limit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.credit_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: Number(e.target.value) }))}
              />
            </WizardField>
          </WizardFormRow>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <Navigation />
      <div className="md:ml-64">
        <div className="responsive-container p-4 md:p-6 space-y-6">
          <PageHeader
            title="Accounts"
            description="Manage your customers and suppliers"
            action={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingAccount(null); }} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAccount ? "Edit Account" : "Add New Account"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAccount ? "Update account information" : "Create a new customer or supplier account"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Wizard
                    steps={wizardSteps}
                    onComplete={handleWizardComplete}
                    onCancel={() => setIsDialogOpen(false)}
                    className="mt-4"
                  />
                </DialogContent>
              </Dialog>
            }
          />

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="responsive-grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
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
                  <SelectTrigger>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[150px] hidden sm:table-cell">Contact</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Category</TableHead>
                        <TableHead className="min-w-[120px]">Balance</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Status</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
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
                                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {account.address}
                                  </p>
                                )}
                                {/* Show contact info on mobile */}
                                <div className="sm:hidden mt-1 space-y-1">
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
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
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
                            <TableCell className="hidden md:table-cell">
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
                              <div>
                                <span className={`font-medium ${
                                  account.current_balance >= 0 ? 'text-success' : 'text-destructive'
                                }`}>
                                  {formatCurrency(account.current_balance)}
                                </span>
                                {/* Show status on mobile */}
                                <div className="lg:hidden mt-1">
                                  {getStatusBadge(account.status)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {getStatusBadge(account.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Accounts;