"use client";

import React, { useState, useEffect } from 'react';
import { FileUpload } from '@/components/file-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Target
} from 'lucide-react';
import { SpendingCharts } from '@/components/spending-charts';
import { BudgetRecommendations } from '@/components/budget-recommendations';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading your finance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personal Finance Tracker</h1>
              <p className="text-gray-600">Upload bank statements and get spending insights</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              AI-Powered
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload Bank Statements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onFilesUpload={handleFilesUpload}
                  isProcessing={isProcessing}
                  maxFiles={5}
                />
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Upload Error</h4>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                )}
                
                {uploadStats && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900">Upload Successful!</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-green-700">Transactions</p>
                            <p className="text-lg font-semibold text-green-900">{uploadStats.totalTransactions}</p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Total Amount</p>
                            <p className="text-lg font-semibold text-green-900">{formatCurrency(uploadStats.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Date Range</p>
                            <p className="text-sm font-medium text-green-900">
                              {formatDate(uploadStats.dateRange.start)} - {formatDate(uploadStats.dateRange.end)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Categories</p>
                            <p className="text-lg font-semibold text-green-900">{Object.keys(uploadStats.categories).length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{recentTransactions.length}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {monthlySpending.length > 0 
                          ? formatCurrency(monthlySpending[monthlySpending.length - 1]?.total_expenses || 0)
                          : '$0.00'
                        }
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Monthly</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {monthlySpending.length > 0
                          ? formatCurrency(
                              monthlySpending.reduce((sum, month) => sum + month.total_expenses, 0) / monthlySpending.length
                            )
                          : '$0.00'
                        }
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Categories</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Set(recentTransactions.map(t => t.category?.name).filter(Boolean)).size}
                      </p>
                    </div>
                    <PieChart className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spending Charts */}
            <SpendingCharts 
              monthlyData={monthlySpending}
              categoryData={categorySpending}
            />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No transactions found</p>
                    <p className="text-sm">Upload bank statements to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: transaction.category?.color || '#gray' }}
                          >
                            {transaction.category?.icon || '💳'}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
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
                          <p className={`font-semibold ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {transaction.category?.name || 'Uncategorized'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            <BudgetRecommendations 
              monthlyData={monthlySpending}
              categoryData={categorySpending}
              totalIncome={monthlySpending.length > 0 
                ? monthlySpending.reduce((sum, month) => sum + month.total_income, 0) / monthlySpending.length
                : undefined
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}