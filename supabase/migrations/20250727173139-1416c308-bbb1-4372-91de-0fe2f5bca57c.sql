-- Fix security issues by setting search_path on functions
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION calculate_running_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;