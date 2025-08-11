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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    query = query.limit(limit);
    
    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { transactions, fileSource } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 });
    }

    // Get all categories to map names to IDs
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Prepare transaction data
    const transactionData = transactions.map((transaction: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let categoryId = categoryMap.get(transaction.category);
      
      if (!categoryId) {
        // Fall back to 'Other Expenses' or 'Other Income' if category not found
        const fallbackCategory = transaction.amount >= 0 ? 'Other Income' : 'Other Expenses';
        categoryId = categoryMap.get(fallbackCategory) || null;
      }

      return {
        user_id: user.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
        merchant: transaction.merchant || null,
        category_id: categoryId,
        subcategory: transaction.subcategory || null,
        file_source: fileSource || null,
        raw_data: {
          confidence: transaction.confidence,
          categorySource: transaction.categorySource,
          originalData: transaction
        }
      };
    });

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select(`
        *,
        category:categories(*)
      `);

    if (error) {
      throw new Error(`Failed to save transactions: ${error.message}`);
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Save transactions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}