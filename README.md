SmartLedger is a web application for managing credit ledger account books, daily sales, inventory, cashbook, and debt management. It is designed to replace traditional paper ledgers and cashbooks, making it ideal for small businesses, shopkeepers, wholesalers, retailers, and distributors.
LedgerFlow cashbook application with the following key features:

🎨 Design System
Professional blue and green gradient theme
Semantic color tokens for consistent branding
Custom shadows and hover effects
Mobile-responsive design

🏗️ Database Architecture

Categories: Organize accounts by type (customers, suppliers, shops)
Accounts: Customer/supplier profiles with contact details and balances
Transactions: Credit/debit entries with running balance calculation
Cashbook Entries: Business expense tracking
Payment Reminders: Automated reminder system
Secure Row Level Security (RLS) policies
Automatic balance calculation triggers

🚀 Core Features Built

- Landing Page
= Professional hero section showcasing key benefits
- Feature highlights for business users
- Clear call-to-action for registration
- Authentication System
- Email/password registration and login
- Secure session management
- Auto-redirect for authenticated users
- Password visibility toggle

Dashboard

Real-time financial overview
Key metrics: Total accounts, receivables, payables, net balance
Recent transactions list
Overdue payments alerts
Beautiful stat cards with trend indicators
Navigation
Responsive sidebar navigation
Professional branding with LedgerFlow logo
Mobile-friendly hamburger menu
Clean route structure

🎯 User Experience

- Intuitive Interface: Clean, professional design focusing on usability
- Mobile-First: Responsive design works on all devices
- Real-Time Updates: Live balance calculations and transaction tracking
- Visual Feedback: Color-coded transaction types, status badges
= Professional Appearance: Builds trust for business use

💼 Business Value

- Replace Traditional Ledgers: Digital alternative to paper ledgers
- Customer Management: Organized account tracking with categories
- Credit/Debt Monitoring: Clear visibility of who owes what
- Payment Tracking: Due date monitoring and overdue alerts
- Professional Reports: Data ready for Excel/PDF export (extensible)


Users can start managing their business accounts, track transactions, and monitor cash flow. Users can register, log in, and immediately see their financial dashboard with all the core functionality of a modern digital ledger system.


## Technical Features

- **Customer Credit & Debit Ledger:**  
  Maintain customer credit, debit, and ledger accounts. Track investments and all monetary transactions with ease.

- **Account & Category Management:**  
  Create accounts for customers, suppliers, or any entity. Organize accounts into categories (e.g., by shop, customer type) for easy sorting and viewing.

- **Transaction Management:**  
  - Add credit or debit entries for each account.
  - Attach narrations and upload photos of bills/receipts for each transaction.
  - Edit or delete transaction entries as needed.
  - View running balance after each transaction.
  - Generate and share invoices with customers.

- **Reporting:**  
  - Dashboard displays all accounts and their current balances.
  - Separate tabs for creditors and debtors.
  - Generate transaction reports for daily, weekly, monthly, or custom date ranges.
  - Export reports in Excel and PDF formats.

- **Cashbook:**  
  Record and manage business expenses in a dedicated cashbook.

- **Payment Reminders:**  
  - Send payment reminders with transaction details and bills/receipts to customers.
  - Set self-reminders for payments; receive notifications on due dates.
  - Call debtors and creditors directly from the app.

- **Data Privacy & Security:**  
  - All data is stored locally on your device or in your Google Drive folder—never on external servers.
  - Password and fingerprint protection for app access.
  - Google Drive backup and restore support.
  - Offline functionality.

- **Widgets & Quick Entry:**  
  Add a widget to your home screen for fast and easy transaction entry.

## Example Use Cases

- Categorize accounts as customers or suppliers.
- Group accounts by different shops for multi-location businesses.
- Track debts and credits with friends, family, or business partners.
- Quickly know who owes you money and whom you owe.

## Database Schema

The backend uses PostgreSQL with the following structure:

- **Enum Types:**  
  - `transaction_type`: `credit`, `debit`
  - `account_status`: `active`, `inactive`, `blocked`
  - `payment_status`: `pending`, `partially_paid`, `paid`, `overdue`

- **Tables:**  
  - `categories`: Organize accounts into categories.
  - `accounts`: Store customer/supplier details and balances.
  - `transactions`: Record all credit/debit entries.
  - `cashbook_entries`: Track business expenses.
  - `payment_reminders`: Manage and send payment reminders.

- **Security:**  
  - Row Level Security (RLS) ensures users can only access their own data.
  - Policies restrict access to each user's records.

- **Triggers & Functions:**  
  - Automatic calculation of account balances and running balances after each transaction.