"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Clock,
  CreditCard,
  Target,
  Plus,
  BarChart3
} from 'lucide-react';
import { SpendingCharts } from '@/components/spending-charts';
import { BudgetRecommendations } from '@/components/budget-recommendations';
import { UploadModal } from '@/components/upload-modal';
import { parseFile } from '@/lib/file-parsers';
import { categorizeTransactions } from '@/lib/transaction-categorizer';

interface UploadStats {
  totalTransactions: number;
  totalAmount: number;
  dateRange: { start: string; end: string };
  categories: Record<string, number>;
}

interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: {
    id: string;
    name: string;
    type: string;
    color?: string;
    icon?: string;
  };
  subcategory?: string;
  file_source?: string;
}

interface MonthlySpending {
  month: string;
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
}

export default function FinancePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [categorySpending, setCategorySpending] = useState<{ category: string; amount: number; color?: string; icon?: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'budget'>('dashboard');

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load recent transactions
      const transactionsResponse = await fetch('/api/transactions?limit=10');
      if (!transactionsResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const transactions = await transactionsResponse.json();
      setRecentTransactions(transactions);
      
      // Load monthly spending data
      const spendingResponse = await fetch('/api/monthly-spending?months=6');
      if (!spendingResponse.ok) {
        throw new Error('Failed to fetch monthly spending');
      }
      const spending = await spendingResponse.json();
      setMonthlySpending(spending);
      
      // Load category spending data
      const categoryResponse = await fetch('/api/category-spending?months=3');
      if (!categoryResponse.ok) {
        throw new Error('Failed to fetch category spending');
      }
      const categoryData = await categoryResponse.json();
      setCategorySpending(categoryData);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const allTransactions: Array<any> = [];
      let totalAmount = 0;
      const dateRange = { start: '', end: '' };
      const categories: Record<string, number> = {};
      
      for (const file of files) {
        try {
          // Parse the file
          console.log(`Parsing ${file.name}...`);
          const parseResult = await parseFile(file);
          
          // Categorize transactions
          console.log(`Categorizing ${parseResult.transactions.length} transactions...`);
          const categorizedTransactions = await categorizeTransactions(parseResult.transactions);
          
          // Save to database
          console.log(`Saving ${categorizedTransactions.length} transactions to database...`);
          const saveResponse = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactions: categorizedTransactions,
              fileSource: file.name
            })
          });
          
          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save transactions');
          }
          
          const savedTransactions = await saveResponse.json();
          
          // Update stats
          allTransactions.push(...categorizedTransactions);
          totalAmount += parseResult.totalAmount;
          
          if (!dateRange.start || parseResult.dateRange.start < dateRange.start) {
            dateRange.start = parseResult.dateRange.start;
          }
          if (!dateRange.end || parseResult.dateRange.end > dateRange.end) {
            dateRange.end = parseResult.dateRange.end;
          }
          
          // Count categories
          categorizedTransactions.forEach(transaction => {
            categories[transaction.category] = (categories[transaction.category] || 0) + 1;
          });
          
          console.log(`Successfully processed ${file.name}: ${savedTransactions.length} transactions saved`);
          
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          setError(`Error processing ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
      
      if (allTransactions.length > 0) {
        // Update upload stats
        setUploadStats({
          totalTransactions: allTransactions.length,
          totalAmount,
          dateRange,
          categories
        });
        
        // Reload dashboard data
        await loadDashboardData();
        
        console.log(`Upload complete: ${allTransactions.length} transactions processed`);
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Clock className="h-8 w-8 animate-spin mx-auto swiss-accent" />
          <p className="text-muted-foreground">Loading your finance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-mono">Personal Finance</h1>
              <p className="text-muted-foreground">Swiss precision financial analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1 border-border/50">
                <BarChart3 className="h-3 w-3" />
                AI-Powered
              </Badge>
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Upload Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'dashboard' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'transactions' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Transactions
              </div>
            </button>
            <button
              onClick={() => setCurrentView('budget')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'budget' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Budget
              </div>
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="swiss-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                      <p className="text-2xl font-bold text-foreground swiss-metric">{recentTransactions.length}</p>
                    </div>
                    <CreditCard className="h-8 w-8 swiss-accent" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="swiss-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold text-foreground swiss-metric">
                        {monthlySpending.length > 0 
                          ? formatCurrency(monthlySpending[monthlySpending.length - 1]?.total_expenses || 0)
                          : '$0.00'
                        }
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 success-color" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="swiss-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Monthly</p>
                      <p className="text-2xl font-bold text-foreground swiss-metric">
                        {monthlySpending.length > 0
                          ? formatCurrency(
                              monthlySpending.reduce((sum, month) => sum + month.total_expenses, 0) / monthlySpending.length
                            )
                          : '$0.00'
                        }
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 warning-color" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="swiss-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Categories</p>
                      <p className="text-2xl font-bold text-foreground swiss-metric">
                        {new Set(recentTransactions.map(t => t.category?.name).filter(Boolean)).size}
                      </p>
                    </div>
                    <PieChart className="h-8 w-8 swiss-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spending Charts */}
            <SpendingCharts 
              monthlyData={monthlySpending}
              categoryData={categorySpending}
            />
          </div>
        )}

        {/* Transactions View */}
        {currentView === 'transactions' && (
          <div className="space-y-6">
            <Card className="swiss-card">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                    <p className="text-foreground">No transactions found</p>
                    <p className="text-sm">Upload bank statements to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: transaction.category?.color || 'hsl(var(--muted))' }}
                          >
                            {transaction.category?.icon || '💳'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(transaction.date)}</span>
                              {transaction.merchant && (
                                <>
                                  <span>•</span>
                                  <span>{transaction.merchant}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold swiss-metric ${
                            transaction.amount >= 0 ? 'success-color' : 'text-destructive'
                          }`}>
                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </p>
                          <Badge variant="outline" className="mt-1 border-border/50">
                            {transaction.category?.name || 'Uncategorized'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Budget View */}
        {currentView === 'budget' && (
          <div className="space-y-6">
            <BudgetRecommendations 
              monthlyData={monthlySpending}
              categoryData={categorySpending}
              totalIncome={monthlySpending.length > 0 
                ? monthlySpending.reduce((sum, month) => sum + month.total_income, 0) / monthlySpending.length
                : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFilesUpload={handleFilesUpload}
        isProcessing={isProcessing}
        uploadStats={uploadStats}
        error={error}
      />
    </div>
  );
}