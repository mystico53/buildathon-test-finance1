"use client";

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

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

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#A55EEA', '#26DE81', '#FD79A8', '#6C5CE7', '#A0A0A0'
];

export function SpendingCharts({ monthlyData, categoryData, className = '' }: SpendingChartsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Prepare data for charts
  const trendData = monthlyData.map(item => ({
    month: formatMonth(item.month),
    income: item.total_income,
    expenses: item.total_expenses,
    net: item.net_income,
    fullMonth: item.month
  }));

  // Prepare category data with colors
  const categoryChartData = categoryData.map((item, index) => ({
    ...item,
    displayColor: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
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
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
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
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.category}</p>
          <p className="text-sm text-gray-600">
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
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium mb-2">No Data Available</h3>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Spending Trends
              </CardTitle>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#FF6B6B" 
                  fill="#FF6B6B" 
                  fillOpacity={0.1}
                  name="Expenses"
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#26DE81" 
                  fill="#26DE81" 
                  fillOpacity={0.1}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#45B7D1" 
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Income vs Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" fill="#26DE81" name="Income" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expenses" fill="#FF6B6B" name="Expenses" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown Pie Chart */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
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