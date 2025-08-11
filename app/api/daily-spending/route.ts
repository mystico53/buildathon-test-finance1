import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Query transactions grouped by date
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        date,
        amount,
        category:categories(name, type, color, icon)
      `)
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch daily spending: ${error.message}`);
    }

    // Group transactions by date and calculate daily totals
    const dailySpending = transactions?.reduce((acc: Record<string, any>, transaction) => {
      const date = transaction.date;
      
      if (!acc[date]) {
        acc[date] = {
          date,
          total_income: 0,
          total_expenses: 0,
          net_income: 0,
          transaction_count: 0,
          transactions: []
        };
      }
      
      const amount = parseFloat(transaction.amount.toString());
      
      if (amount >= 0) {
        acc[date].total_income += amount;
      } else {
        acc[date].total_expenses += Math.abs(amount);
      }
      
      acc[date].net_income += amount;
      acc[date].transaction_count += 1;
      acc[date].transactions.push(transaction);
      
      return acc;
    }, {}) || {};

    // Convert to array and fill missing dates
    const result = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailySpending[dateStr] || {
        date: dateStr,
        total_income: 0,
        total_expenses: 0,
        net_income: 0,
        transaction_count: 0,
        transactions: []
      };
      
      result.push({
        ...dayData,
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        day_of_month: currentDate.getDate(),
        formatted_date: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Daily spending API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}