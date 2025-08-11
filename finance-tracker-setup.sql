-- Personal Finance Tracker Database Schema

-- Categories table for transaction categorization
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default categories
INSERT INTO categories (name, type, icon, color) VALUES
-- Expense categories
('Food & Dining', 'expense', '🍕', '#FF6B6B'),
('Transport', 'expense', '🚗', '#4ECDC4'),
('Entertainment', 'expense', '🎬', '#45B7D1'),
('Shopping', 'expense', '🛍️', '#96CEB4'),
('Bills & Utilities', 'expense', '⚡', '#FECA57'),
('Healthcare', 'expense', '🏥', '#FF9FF3'),
('Education', 'expense', '📚', '#54A0FF'),
('Travel', 'expense', '✈️', '#5F27CD'),
('Personal Care', 'expense', '💄', '#00D2D3'),
('Home & Garden', 'expense', '🏠', '#FF9F43'),
('Insurance', 'expense', '🛡️', '#A55EEA'),
('Taxes', 'expense', '📋', '#26DE81'),
('Gifts & Donations', 'expense', '🎁', '#FD79A8'),
('Business', 'expense', '💼', '#6C5CE7'),
('Other Expenses', 'expense', '💸', '#A0A0A0'),
-- Income categories
('Salary', 'income', '💰', '#00B894'),
('Freelance', 'income', '💻', '#00CEC9'),
('Investment', 'income', '📈', '#81ECEC'),
('Business Income', 'income', '🏢', '#55A3FF'),
('Other Income', 'income', '💵', '#FDCB6E');

-- Transactions table
CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount decimal(12,2) NOT NULL,
  description text NOT NULL,
  merchant text,
  category_id uuid REFERENCES categories(id),
  subcategory text,
  file_source text,
  raw_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Budgets table
CREATE TABLE budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  amount decimal(12,2) NOT NULL,
  period text NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- File uploads table to track processed files
CREATE TABLE uploaded_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  storage_path text NOT NULL,
  processed_at timestamp with time zone,
  transaction_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Categories are public (everyone can read, only admin can modify)
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Uploaded files policies
CREATE POLICY "Users can view own uploaded files" ON uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploaded files" ON uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploaded files" ON uploaded_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploaded files" ON uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(period, start_date, end_date);

CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for transaction summaries
CREATE OR REPLACE VIEW transaction_summaries AS
SELECT 
    t.user_id,
    c.name as category_name,
    c.type as category_type,
    c.color as category_color,
    c.icon as category_icon,
    DATE_TRUNC('month', t.date) as month,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY t.user_id, c.id, c.name, c.type, c.color, c.icon, DATE_TRUNC('month', t.date);

-- Grant access to the view
GRANT SELECT ON transaction_summaries TO authenticated;

-- Enable real-time subscriptions for transactions (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;