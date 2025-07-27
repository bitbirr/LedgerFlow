-- Create enum types for the application
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE payment_status AS ENUM ('pending', 'partially_paid', 'paid', 'overdue');

-- Create categories table for organizing accounts
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Create accounts table for customers/suppliers
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  status account_status DEFAULT 'active',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Create transactions table for all credit/debit entries
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  narration TEXT,
  attachment_url TEXT,
  running_balance DECIMAL(15,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_status payment_status DEFAULT 'pending',
  reference_number TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cashbook table for business expenses
CREATE TABLE public.cashbook_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment reminders table
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  message TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Users can manage their own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for accounts
CREATE POLICY "Users can manage their own accounts" ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for transactions
CREATE POLICY "Users can manage their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for cashbook entries
CREATE POLICY "Users can manage their own cashbook entries" ON public.cashbook_entries
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for payment reminders
CREATE POLICY "Users can manage their own payment reminders" ON public.payment_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Create function to update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the account's current balance
  UPDATE public.accounts 
  SET current_balance = (
    SELECT 
      opening_balance + 
      COALESCE(SUM(CASE 
        WHEN type = 'credit' THEN amount 
        WHEN type = 'debit' THEN -amount 
      END), 0)
    FROM public.transactions 
    WHERE account_id = NEW.account_id
  ),
  updated_at = now()
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update account balance
CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Create function to calculate running balance
CREATE OR REPLACE FUNCTION calculate_running_balance()
RETURNS TRIGGER AS $$
DECLARE
  prev_balance DECIMAL(15,2) := 0;
  account_opening_balance DECIMAL(15,2) := 0;
BEGIN
  -- Get account's opening balance
  SELECT opening_balance INTO account_opening_balance
  FROM public.accounts WHERE id = NEW.account_id;
  
  -- Calculate running balance up to this transaction
  SELECT COALESCE(
    account_opening_balance + SUM(CASE 
      WHEN type = 'credit' THEN amount 
      WHEN type = 'debit' THEN -amount 
    END), 
    account_opening_balance
  ) INTO prev_balance
  FROM public.transactions 
  WHERE account_id = NEW.account_id 
    AND transaction_date < NEW.transaction_date
    AND id != NEW.id;
  
  -- Set the running balance for this transaction
  NEW.running_balance := prev_balance + CASE 
    WHEN NEW.type = 'credit' THEN NEW.amount 
    WHEN NEW.type = 'debit' THEN -NEW.amount 
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for running balance calculation
CREATE TRIGGER calculate_running_balance_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION calculate_running_balance();

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_category_id ON public.accounts(category_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_cashbook_user_id ON public.cashbook_entries(user_id);
CREATE INDEX idx_cashbook_date ON public.cashbook_entries(entry_date);
CREATE INDEX idx_reminders_account_id ON public.payment_reminders(account_id);
CREATE INDEX idx_reminders_date ON public.payment_reminders(reminder_date);