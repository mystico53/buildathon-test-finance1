"use client";

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Calendar, BarChart3 } from 'lucide-react';

interface MonthlySpending {
  month: string;
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  color?: string;
  icon?: string;
  type: string;
}

interface SpendingChartsProps {
  monthlyData: MonthlySpending[];
  categoryData: CategorySpending[];
  className?: string;
}

type TimePeriod = 'days' | 'weeks' | 'months';

// Swiss Bank Color Palette - Sophisticated & Muted
const SWISS_COLORS = [
  'hsl(142 71% 45%)',  // Muted Green
  'hsl(346 77% 49%)',  // Muted Red  
  'hsl(221 83% 53%)',  // Swiss Blue
  'hsl(262 83% 58%)',  // Deep Purple
  'hsl(43 96% 56%)',   // Amber
  'hsl(195 100% 39%)', // Teal
  'hsl(271 91% 65%)',  // Violet
  'hsl(142 71% 45%)',  // Forest Green
  'hsl(215 20% 65%)',  // Swiss Gray
  'hsl(217 32% 17%)',  // Dark Gray
];

export function SpendingCharts({ monthlyData, categoryData, className = '' }: SpendingChartsProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('days');
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  // Fetch daily data when time period changes to days
  const fetchDailyData = async () => {
    if (timePeriod !== 'days') return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/daily-spending?days=30');
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch daily data when switching to days view
  useEffect(() => {
    fetchDailyData();
  }, [timePeriod]);

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Prepare data for charts based on selected time period
  const trendData = timePeriod === 'days' && dailyData.length > 0
    ? dailyData.map(item => ({
        month: item.formatted_date,
        income: item.total_income,
        expenses: item.total_expenses,
        net: item.net_income,
        fullMonth: item.date
      }))
    : monthlyData.map(item => ({
        month: formatMonth(item.month),
        income: item.total_income,
        expenses: item.total_expenses,
        net: item.net_income,
        fullMonth: item.month
      }));

  // Prepare category data with colors
  const categoryChartData = categoryData.map((item, index) => ({
    ...item,
    displayColor: item.color || SWISS_COLORS[index % SWISS_COLORS.length]
  }));

  // Calculate trend indicators
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const expenseTrend = currentMonth && previousMonth 
    ? ((currentMonth.total_expenses - previousMonth.total_expenses) / previousMonth.total_expenses) * 100
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg backdrop-blur-sm">
          <p className="font-medium mb-2 text-card-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-card-foreground font-mono" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg backdrop-blur-sm">
          <p className="font-medium text-card-foreground">{data.category}</p>
          <p className="text-sm text-muted-foreground font-mono">
            {formatCurrency(data.amount)} ({((data.amount / categoryData.reduce((sum, item) => sum + item.amount, 0)) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (monthlyData.length === 0 && categoryData.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="swiss-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
            <h3 className="font-medium mb-2 text-foreground">No Data Available</h3>
            <p className="text-sm">Upload bank statements to see spending insights and trends.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Monthly Trends Chart */}
      {monthlyData.length > 0 && (
        <Card className="swiss-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 swiss-accent" />
                <CardTitle className="text-foreground">Spending Trends</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={timePeriod === 'days' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('days')}
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Days
                </Button>
                <Button 
                  variant={timePeriod === 'months' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('months')}
                  className="text-xs"
                >
                  Months
                </Button>
              </div>
              {expenseTrend !== 0 && (
                <Badge variant={expenseTrend > 0 ? "destructive" : "default"} className="flex items-center gap-1">
                  {expenseTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(expenseTrend).toFixed(1)}% vs last month
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="hsl(346 77% 49%)" 
                  fill="hsl(346 77% 49%)" 
                  fillOpacity={0.1}
                  name="Expenses"
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="hsl(142 71% 45%)" 
                  fill="hsl(142 71% 45%)" 
                  fillOpacity={0.1}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="hsl(221 83% 53%)" 
                  strokeWidth={2}
                  name="Net Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Chart */}
        {monthlyData.length > 0 && (
          <Card className="swiss-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <DollarSign className="h-5 w-5 success-color" />
                Income vs Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={formatCurrency}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="income" fill="hsl(142 71% 45%)" name="Income" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(346 77% 49%)" name="Expenses" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown Pie Chart */}
        {categoryData.length > 0 && (
          <Card className="swiss-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <PieChartIcon className="h-5 w-5 swiss-accent" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.displayColor} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-4 space-y-2 max-w-xs">
                  {categoryChartData.slice(0, 6).map((category, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate flex-1">{category.category}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  ))}
                  {categoryChartData.length > 6 && (
                    <div className="text-xs text-gray-500 pt-1">
                      +{categoryChartData.length - 6} more categories
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Categories List */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.slice(0, 8).map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.category}</span>
                    </div>
                    {category.icon && (
                      <span className="text-lg">{category.icon}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(category.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {((category.amount / categoryData.reduce((sum, item) => sum + item.amount, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}