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
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 6;

    // Calculate the start date (months ago from now)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Query for monthly aggregated data
    const { data, error } = await supabase.rpc('get_monthly_spending', {
      user_uuid: user.id,
      start_date: startDateStr
    });

    if (error) {
      // Fallback query if RPC function doesn't exist
      const { data: transactions, error: fallbackError } = await supabase
        .from('transactions')
        .select(`
          date,
          amount,
          category:categories(type)
        `)
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (fallbackError) {
        throw new Error(`Failed to fetch spending data: ${fallbackError.message}`);
      }

      // Group by month and calculate totals
      const monthlyData = new Map();
      
      transactions?.forEach(transaction => {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM format
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            total_income: 0,
            total_expenses: 0,
            net_income: 0,
            transaction_count: 0
          });
        }
        
        const monthData = monthlyData.get(monthKey);
        monthData.transaction_count++;
        
        if (transaction.amount >= 0) {
          monthData.total_income += transaction.amount;
        } else {
          monthData.total_expenses += Math.abs(transaction.amount);
        }
        
        monthData.net_income = monthData.total_income - monthData.total_expenses;
      });

      return NextResponse.json(Array.from(monthlyData.values()));
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Monthly spending API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}