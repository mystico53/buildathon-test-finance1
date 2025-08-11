import { NextRequest, NextResponse } from 'next/server';
import { ParsedFileResult, RawTransaction } from '@/lib/file-parsers';

// Note: This is a simplified PDF parser implementation
// In production, you would use libraries like pdf-parse, pdf2pic, or pdf-data-parser
// For the buildathon, we'll implement a basic text extraction approach

interface PDFTextContent {
  text: string;
  pages: string[];
}

// Mock PDF text extraction (in production, use proper PDF parsing libraries)
async function extractTextFromPDF(file: File): Promise<PDFTextContent> {
  // This is a placeholder implementation
  // In a real app, you'd use pdf-parse or similar library:
  /*
  const pdfParse = require('pdf-parse');
  const buffer = await file.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  return {
    text: data.text,
    pages: data.text.split('\f') // Form feed character separates pages
  };
  */
  
  // For demo purposes, return mock data
  return {
    text: `BANK STATEMENT
    Account: 1234567890
    Statement Period: 01/01/2024 - 01/31/2024
    
    Date        Description                     Amount      Balance
    01/02/2024  GROCERY STORE PURCHASE         -45.67      2,954.33
    01/03/2024  SALARY DEPOSIT                2,500.00      5,454.33
    01/05/2024  COFFEE SHOP                    -4.50      5,449.83
    01/07/2024  GAS STATION                   -35.00      5,414.83
    01/10/2024  RESTAURANT DINNER             -67.89      5,346.94
    01/12/2024  ATM WITHDRAWAL                -100.00      5,246.94
    01/15/2024  ELECTRIC BILL                 -89.45      5,157.49
    01/18/2024  ONLINE SHOPPING               -123.45      5,034.04
    01/20/2024  FREELANCE PAYMENT             800.00      5,834.04
    01/25/2024  RENT PAYMENT                -1,200.00      4,634.04
    01/28/2024  INSURANCE PREMIUM            -156.78      4,477.26`,
    pages: ['mock page content']
  };
}

function parseTransactionsFromText(text: string, filename: string): ParsedFileResult {
  const errors: string[] = [];
  const transactions: RawTransaction[] = [];
  
  try {
    // Split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Find transaction lines (look for date patterns)
    const datePattern = /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/;
    const transactionLines = lines.filter(line => datePattern.test(line));
    
    if (transactionLines.length === 0) {
      // Try alternative parsing methods
      errors.push('No transaction lines found with standard date patterns');
      
      // Look for table-like structures
      const tableLines = lines.filter(line => {
        // Look for lines with multiple whitespace-separated fields
        const fields = line.split(/\s{2,}/).filter(field => field.length > 0);
        return fields.length >= 3 && 
               fields.some(field => /\d/.test(field)) && // Has numbers
               fields.some(field => field.includes('.') || field.includes(',')) && // Has amounts
               !line.toLowerCase().includes('total') &&
               !line.toLowerCase().includes('balance') &&
               !line.toLowerCase().includes('date');
      });
      
      transactionLines.push(...tableLines);
    }
    
    for (let i = 0; i < transactionLines.length; i++) {
      const line = transactionLines[i];
      
      try {
        // Parse different line formats
        const parsed = parseTransactionLine(line);
        if (parsed) {
          transactions.push(parsed);
        } else {
          errors.push(`Line ${i + 1}: Could not parse transaction line: ${line}`);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (transactions.length === 0) {
      throw new Error('No valid transactions found in PDF');
    }
    
    // Calculate summary statistics
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const sortedDates = transactions.map(t => t.date).sort();
    
    return {
      transactions,
      totalAmount,
      dateRange: {
        start: sortedDates[0],
        end: sortedDates[sortedDates.length - 1]
      },
      errors,
      metadata: {
        rowCount: transactions.length,
        originalFilename: filename,
        parsedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to parse PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseTransactionLine(line: string): RawTransaction | null {
  // Remove extra whitespace and normalize
  const normalizedLine = line.replace(/\s+/g, ' ').trim();
  
  // Try different parsing patterns
  const patterns = [
    // Pattern 1: Date Description Amount Balance
    /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2})\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2})$/,
    
    // Pattern 2: Date Description Amount (no balance)
    /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2})$/,
    
    // Pattern 3: Date Amount Description
    /^(\d{1,2}\/\d{1,2}\/\d{4})\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2})\s+(.+)$/,
    
    // Pattern 4: ISO Date format
    /^(\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2})(?:\s+([-+]?\$?\d{1,3}(?:,\d{3})*\.?\d{0,2}))?$/,
  ];
  
  for (const pattern of patterns) {
    const match = normalizedLine.match(pattern);
    if (match) {
      const [, dateStr, descOrAmount, amountOrDesc, balance] = match;
      
      let description: string;
      let amountStr: string;
      
      // Determine which field is description vs amount
      if (pattern === patterns[2]) {
        // Date Amount Description pattern
        description = amountOrDesc;
        amountStr = descOrAmount;
      } else {
        // Date Description Amount pattern
        description = descOrAmount;
        amountStr = amountOrDesc;
      }
      
      // Parse the amount
      const amount = parseAmount(amountStr);
      if (amount === 0 && amountStr !== '0.00') {
        continue; // Try next pattern
      }
      
      // Parse the date
      const date = parseDate(dateStr);
      
      const transaction: RawTransaction = {
        date,
        description: description.trim(),
        amount,
      };
      
      // Add balance if available
      if (balance) {
        const balanceAmount = parseAmount(balance);
        if (balanceAmount !== 0) {
          transaction.balance = balanceAmount;
        }
      }
      
      // Extract merchant name
      const merchant = extractMerchantName(description);
      if (merchant) {
        transaction.merchant = merchant;
      }
      
      return transaction;
    }
  }
  
  return null;
}

function parseAmount(value: string): number {
  if (!value || value.trim() === '') return 0;
  
  // Remove currency symbols, commas, and extra spaces
  const cleanValue = value
    .replace(/[$£€¥,\s]/g, '')
    .replace(/[()]/g, '') // Remove parentheses
    .trim();
  
  // Handle negative amounts in parentheses format
  const isNegativeParens = value.includes('(') && value.includes(')');
  
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue)) return 0;
  
  return isNegativeParens ? -Math.abs(numValue) : numValue;
}

function parseDate(dateStr: string): string {
  const cleanDate = dateStr.trim();
  
  // Try parsing with Date constructor first
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (_e) {
    // Continue with manual parsing
  }
  
  // Handle MM/DD/YYYY format
  const match = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Fallback to current date
  return new Date().toISOString().split('T')[0];
}

function extractMerchantName(description: string): string | undefined {
  if (!description) return undefined;
  
  // Remove common transaction codes and prefixes
  const cleaned = description
    .replace(/^(POS|ATM|ACH|CHECK|TRANSFER|PAYMENT|DEPOSIT)\s+/i, '')
    .replace(/\d{4}\*+\d{4}/g, '') // Remove card numbers
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Remove dates
    .replace(/\d{2}\/\d{2}/g, '') // Remove dates
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take the first meaningful part (usually the merchant)
  const parts = cleaned.split(/\s+/);
  if (parts.length > 0 && parts[0].length > 2) {
    return parts.slice(0, 3).join(' '); // Take first 3 words max
  }
  
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }
    
    // Extract text from PDF
    const pdfContent = await extractTextFromPDF(file);
    
    // Parse transactions from extracted text
    const result = parseTransactionsFromText(pdfContent.text, file.name);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}