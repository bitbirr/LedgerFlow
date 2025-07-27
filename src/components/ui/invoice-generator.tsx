import React, { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Download, 
  Share2, 
  Printer,
  Calendar,
  DollarSign,
  User,
  Building
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  accountId: string;
  accountName: string;
  accountAddress?: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceGeneratorProps {
  accountId: string;
  accountName: string;
  transactions?: any[];
  onInvoiceGenerated?: (invoiceData: InvoiceData) => void;
}

export function InvoiceGenerator({
  accountId,
  accountName,
  transactions = [],
  onInvoiceGenerated
}: InvoiceGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    accountId,
    accountName,
    items: transactions.length > 0 ? transactions.map(t => ({
      description: t.description || 'Transaction',
      quantity: 1,
      rate: Number(t.amount),
      amount: Number(t.amount)
    })) : [{
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }],
    notes: '',
    terms: 'Payment is due within 30 days of invoice date.'
  });
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate amount if quantity or rate changed
      if (field === 'quantity' || field === 'rate') {
        newItems[index].amount = newItems[index].quantity * newItems[index].rate;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Create HTML content for the invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: #2563eb; }
            .invoice-details { text-align: right; }
            .bill-to { margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .items-table th { background-color: #f8f9fa; }
            .total-row { font-weight: bold; background-color: #f8f9fa; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">LedgerFlow</div>
              <div>Professional Ledger Management</div>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
              <p><strong>Date:</strong> ${format(invoiceData.date, 'MMM dd, yyyy')}</p>
              <p><strong>Due Date:</strong> ${format(invoiceData.dueDate, 'MMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div class="bill-to">
            <h3>Bill To:</h3>
            <p><strong>${invoiceData.accountName}</strong></p>
            ${invoiceData.accountAddress ? `<p>${invoiceData.accountAddress}</p>` : ''}
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.rate.toFixed(2)}</td>
                  <td>$${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total</strong></td>
                <td><strong>$${calculateTotal().toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoiceData.notes ? `
            <div>
              <h4>Notes:</h4>
              <p>${invoiceData.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p><strong>Terms & Conditions:</strong></p>
            <p>${invoiceData.terms}</p>
          </div>
        </body>
        </html>
      `;

      // Create a new window and print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-print after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      // Save invoice record to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceData.invoiceNumber,
            account_id: invoiceData.accountId,
            total_amount: calculateTotal(),
            invoice_date: invoiceData.date.toISOString().split('T')[0],
            due_date: invoiceData.dueDate.toISOString().split('T')[0],
            items: invoiceData.items,
            notes: invoiceData.notes,
            terms: invoiceData.terms,
            user_id: user.id
          });

        if (error) {
          console.error('Error saving invoice:', error);
        }
      }

      onInvoiceGenerated?.(invoiceData);
      setIsOpen(false);
      
      toast({
        title: "Invoice Generated",
        description: "Invoice has been generated and is ready for printing/download"
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="accountName">Bill To</Label>
              <Input
                id="accountName"
                value={invoiceData.accountName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, accountName: e.target.value }))}
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button onClick={addItem} variant="outline" size="sm">
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {invoiceData.items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Rate ($)</Label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-muted-foreground">
                        Amount: ${item.amount.toFixed(2)}
                      </span>
                      {invoiceData.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-right mt-4">
              <div className="text-lg font-semibold">
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={invoiceData.terms}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                placeholder="Payment terms..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generatePDF} disabled={generating}>
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Generate & Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}