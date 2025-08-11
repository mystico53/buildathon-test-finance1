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
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 3;

    // Calculate the start date (months ago from now)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Query for category spending data
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        category:categories(name, type, color, icon)
      `)
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .not('category_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch category spending: ${error.message}`);
    }

    // Group by category and calculate totals
    const categoryMap = new Map();
    
    data?.forEach((transaction: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!transaction.category) return;
      
      const categoryName = transaction.category.name;
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category: categoryName,
          amount: 0,
          color: transaction.category.color,
          icon: transaction.category.icon,
          type: transaction.category.type
        });
      }
      
      const categoryData = categoryMap.get(categoryName);
      categoryData.amount += Math.abs(transaction.amount);
    });

    // Convert to array and sort by amount (descending)
    const categorySpending = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json(categorySpending);

  } catch (error) {
    console.error('Category spending API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}