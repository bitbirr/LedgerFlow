import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Badge } from "./badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Zap, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Check
} from "lucide-react";

interface QuickEntryProps {
  onEntryAdded?: () => void;
}

interface Account {
  id: string;
  name: string;
  current_balance: number;
}

export function QuickEntry({ onEntryAdded }: QuickEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    account_id: '',
    type: 'credit' as 'credit' | 'debit',
    amount: '',
    description: '',
    narration: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please select an account and enter an amount",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const amount = parseFloat(formData.amount);
      const account = accounts.find(a => a.id === formData.account_id);
      if (!account) throw new Error("Account not found");

      // Calculate new running balance
      const runningBalance = formData.type === 'credit' 
        ? account.current_balance + amount
        : account.current_balance - amount;

      // Insert transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          account_id: formData.account_id,
          type: formData.type,
          amount,
          description: formData.description || `Quick ${formData.type} entry`,
          narration: formData.narration,
          running_balance: runningBalance,
          transaction_date: new Date().toISOString().split('T')[0],
          user_id: user.id
        });

      if (transactionError) throw transactionError;

      // Update account balance
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ current_balance: runningBalance })
        .eq('id', formData.account_id);

      if (accountError) throw accountError;

      toast({
        title: "Transaction Added",
        description: `${formData.type === 'credit' ? 'Credit' : 'Debit'} of $${amount} added successfully`
      });

      // Reset form
      setFormData({
        account_id: '',
        type: 'credit',
        amount: '',
        description: '',
        narration: ''
      });
      
      setIsOpen(false);
      onEntryAdded?.();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Quick Entry
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Selection */}
              <div>
                <Label htmlFor="account">Account</Label>
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
                        <div className="flex justify-between items-center w-full">
                          <span>{account.name}</span>
                          <Badge variant="outline" className="ml-2">
                            ${account.current_balance.toFixed(2)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Type */}
              <div>
                <Label>Type</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    type="button"
                    variant={formData.type === 'credit' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'credit' }))}
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Credit
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'debit' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'debit' }))}
                    className="flex-1"
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Debit
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {quickAmounts.map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: amount.toString() }))}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Transaction description"
                />
              </div>

              {/* Narration */}
              <div>
                <Label htmlFor="narration">Notes (Optional)</Label>
                <Textarea
                  id="narration"
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Add Entry
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}