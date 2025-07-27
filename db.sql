-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  category_id uuid,
  opening_balance numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  credit_limit numeric DEFAULT 0,
  status USER-DEFINED DEFAULT 'active'::account_status,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT accounts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.cashbook_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text NOT NULL,
  category text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  attachment_url text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cashbook_entries_pkey PRIMARY KEY (id),
  CONSTRAINT cashbook_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6'::text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.payment_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  transaction_id uuid,
  reminder_date date NOT NULL,
  message text,
  is_sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT payment_reminders_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT payment_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT payment_reminders_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text,
  narration text,
  attachment_url text,
  running_balance numeric NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_status USER-DEFINED DEFAULT 'pending'::payment_status,
  reference_number text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);