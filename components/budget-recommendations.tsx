"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PieChart
} from 'lucide-react';

interface BudgetRecommendation {
  category: string;
  currentSpending: number;
  recommendedBudget: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  color?: string;
  icon?: string;
}

interface CategorySpending {
  category: string;
  amount: number;
  color?: string;
  icon?: string;
  type: string;
}

interface MonthlySpending {
  month: string;
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
}

interface BudgetRecommendationsProps {
  monthlyData: MonthlySpending[];
  categoryData: CategorySpending[];
  totalIncome?: number;
  className?: string;
}

export function BudgetRecommendations({ 
  monthlyData, 
  categoryData, 
  totalIncome,
  className = '' 
}: BudgetRecommendationsProps) {
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  // Calculate budget recommendations
  const generateRecommendations = (): BudgetRecommendation[] => {
    if (categoryData.length === 0) return [];

    const recommendations: BudgetRecommendation[] = [];
    const totalSpending = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
    const avgMonthlyIncome = monthlyData.length > 0 
      ? monthlyData.reduce((sum, month) => sum + month.total_income, 0) / monthlyData.length
      : totalIncome || totalSpending;

    categoryData.forEach(category => {
      const monthlyAverage = category.amount;
      const percentOfIncome = (monthlyAverage / avgMonthlyIncome) * 100;
      
      let recommendedBudget = monthlyAverage;
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      let reasoning = '';
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      // Apply category-specific recommendations
      switch (category.category.toLowerCase()) {
        case 'food & dining':
          // Food should be 10-15% of income
          if (percentOfIncome > 15) {
            recommendedBudget = avgMonthlyIncome * 0.15;
            reasoning = 'Food spending exceeds recommended 15% of income. Consider meal planning and cooking more at home.';
            riskLevel = 'high';
            confidence = 'high';
          } else if (percentOfIncome < 10) {
            recommendedBudget = avgMonthlyIncome * 0.12;
            reasoning = 'Current food spending is efficient. Budget allows for occasional dining out.';
            riskLevel = 'low';
            confidence = 'high';
          } else {
            recommendedBudget = monthlyAverage * 1.05;
            reasoning = 'Food spending is reasonable. Budget includes 5% buffer for variety.';
            riskLevel = 'low';
            confidence = 'high';
          }
          break;

        case 'transport':
          // Transport should be 10-20% of income
          if (percentOfIncome > 20) {
            recommendedBudget = avgMonthlyIncome * 0.18;
            reasoning = 'Transportation costs are high. Consider carpooling, public transit, or remote work options.';
            riskLevel = 'high';
            confidence = 'high';
          } else {
            recommendedBudget = monthlyAverage * 1.1;
            reasoning = 'Transportation spending is manageable. Budget includes buffer for fuel price changes.';
            riskLevel = 'low';
            confidence = 'medium';
          }
          break;

        case 'entertainment':
          // Entertainment should be 2-5% of income
          if (percentOfIncome > 5) {
            recommendedBudget = avgMonthlyIncome * 0.05;
            reasoning = 'Entertainment spending is high. Consider free activities and home entertainment options.';
            riskLevel = 'medium';
            confidence = 'high';
          } else {
            recommendedBudget = monthlyAverage * 1.2;
            reasoning = 'Entertainment budget allows for leisure activities while maintaining balance.';
            riskLevel = 'low';
            confidence = 'medium';
          }
          break;

        case 'bills & utilities':
          // Utilities are relatively fixed, add small buffer
          recommendedBudget = monthlyAverage * 1.15;
          reasoning = 'Utilities are fairly fixed costs. Budget includes 15% seasonal buffer.';
          riskLevel = 'low';
          confidence = 'high';
          break;

        case 'healthcare':
          // Healthcare can vary, add larger buffer
          recommendedBudget = monthlyAverage * 1.5;
          reasoning = 'Healthcare costs can be unpredictable. Budget includes buffer for unexpected expenses.';
          riskLevel = 'medium';
          confidence = 'medium';
          break;

        case 'shopping':
          // Shopping should be controlled
          if (percentOfIncome > 10) {
            recommendedBudget = avgMonthlyIncome * 0.08;
            reasoning = 'Shopping spending is high. Focus on needs vs. wants and consider a cooling-off period for purchases.';
            riskLevel = 'high';
            confidence = 'high';
          } else {
            recommendedBudget = monthlyAverage * 0.9;
            reasoning = 'Shopping budget encourages mindful spending while allowing for necessary purchases.';
            riskLevel = 'medium';
            confidence = 'medium';
          }
          break;

        default:
          // Default recommendation: current spending + 10% buffer
          recommendedBudget = monthlyAverage * 1.1;
          reasoning = `Budget based on current spending pattern with 10% buffer for ${category.category.toLowerCase()}.`;
          confidence = 'low';
          riskLevel = 'low';
      }

      // Determine trend (simplified - in real app would use historical data)
      if (percentOfIncome > 15) trend = 'increasing';
      else if (percentOfIncome < 5) trend = 'decreasing';
      else trend = 'stable';

      recommendations.push({
        category: category.category,
        currentSpending: monthlyAverage,
        recommendedBudget: Math.round(recommendedBudget),
        confidence,
        reasoning,
        trend,
        riskLevel,
        color: category.color,
        icon: category.icon
      });
    });

    // Sort by potential savings (biggest reductions first)
    return recommendations.sort((a, b) => 
      (b.currentSpending - b.recommendedBudget) - (a.currentSpending - a.recommendedBudget)
    );
  };

  const recommendations = generateRecommendations();
  const totalCurrentSpending = recommendations.reduce((sum, rec) => sum + rec.currentSpending, 0);
  const totalRecommendedBudget = recommendations.reduce((sum, rec) => sum + rec.recommendedBudget, 0);
  const totalSavings = totalCurrentSpending - totalRecommendedBudget;

  const toggleDetails = (category: string) => {
    setShowDetails(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-success/10 text-success border-success/20';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-info/10 text-info border-info/20';
      case 'medium': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className={className}>
        <Card className="swiss-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
            <h3 className="font-medium mb-2 text-foreground">No Budget Recommendations</h3>
            <p className="text-sm">Upload spending data to get personalized budget suggestions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Card */}
      <Card className="swiss-card border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lightbulb className="h-5 w-5 warning-color" />
            Budget Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Spending</p>
              <p className="text-2xl font-bold text-foreground swiss-metric">{formatCurrency(totalCurrentSpending)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Recommended Budget</p>
              <p className="text-2xl font-bold swiss-accent swiss-metric">{formatCurrency(totalRecommendedBudget)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className={`text-2xl font-bold swiss-metric ${totalSavings > 0 ? 'success-color' : 'text-destructive'}`}>
                {totalSavings > 0 ? '' : '+'}{formatCurrency(totalSavings)}
              </p>
            </div>
          </div>
          
          {totalSavings > 0 && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 success-color flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">Great Savings Potential!</h4>
                <p className="text-muted-foreground text-sm mt-1">
                  By following these recommendations, you could save {formatCurrency(totalSavings)} per month.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Recommendations */}
      <div className="grid gap-4">
        {recommendations.map((rec, index) => (
          <Card key={index} className="swiss-card hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                    style={{ backgroundColor: rec.color || 'hsl(var(--muted))' }}
                  >
                    {rec.icon || '💰'}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{rec.category}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`${getRiskColor(rec.riskLevel)} border`}>
                        {rec.riskLevel} risk
                      </Badge>
                      <Badge variant="outline" className={`${getConfidenceColor(rec.confidence)} border`}>
                        {rec.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current → Recommended</p>
                  <p className="font-semibold text-foreground swiss-metric">
                    {formatCurrency(rec.currentSpending)} → {formatCurrency(rec.recommendedBudget)}
                  </p>
                  {rec.currentSpending !== rec.recommendedBudget && (
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {rec.recommendedBudget < rec.currentSpending ? (
                        <TrendingDown className="h-3 w-3 success-color" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      )}
                      <span className={`text-xs ${
                        rec.recommendedBudget < rec.currentSpending ? 'success-color' : 'text-destructive'
                      }`}>
                        {formatCurrency(Math.abs(rec.recommendedBudget - rec.currentSpending))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700">{rec.reasoning}</p>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => toggleDetails(rec.category)}
                className="w-full"
              >
                {showDetails[rec.category] ? 'Hide Details' : 'Show Details'}
              </Button>
              
              {showDetails[rec.category] && (
                <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spending Trend:</span>
                    <div className="flex items-center gap-1">
                      {rec.trend === 'increasing' && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {rec.trend === 'decreasing' && <TrendingDown className="h-3 w-3 text-green-500" />}
                      <span className="capitalize">{rec.trend}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Assessment:</span>
                    <span className="capitalize">{rec.riskLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recommendation Confidence:</span>
                    <span className="capitalize">{rec.confidence}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}