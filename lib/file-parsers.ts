import { parse } from 'csv-parse/sync';

// Note: PDF parsing will be handled server-side due to Node.js dependencies
// This interface defines the expected response from the PDF parsing API

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  merchant?: string;
  category?: string;
  reference?: string;
  type?: 'debit' | 'credit';
}

export interface ParsedFileResult {
  transactions: RawTransaction[];
  totalAmount: number;
  dateRange: {
    start: string;
    end: string;
  };
  errors: string[];
  metadata: {
    rowCount: number;
    originalFilename: string;
    parsedAt: string;
  };
}

// Common CSV column mappings for different banks
const COLUMN_MAPPINGS = {
  // Generic mappings (most common)
  generic: {
    date: ['date', 'transaction_date', 'trans_date', 'posting_date'],
    description: ['description', 'detail', 'memo', 'particulars', 'transaction_details'],
    amount: ['amount', 'debit', 'credit', 'transaction_amount', 'value'],
    balance: ['balance', 'running_balance', 'account_balance'],
    reference: ['reference', 'ref', 'transaction_id', 'cheque_no'],
    type: ['type', 'transaction_type', 'dr_cr']
  },
  
  // Bank-specific mappings
  chase: {
    date: ['transaction_date'],
    description: ['description'],
    amount: ['amount'],
    balance: ['balance'],
    type: ['type']
  },
  
  bankofamerica: {
    date: ['date'],
    description: ['description'],
    amount: ['amount'],
    balance: ['running_bal']
  },
  
  wells_fargo: {
    date: ['date'],
    description: ['description'],
    amount: ['amount']
  }
};

function normalizeColumnName(column: string): string {
  return column
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(normalizeColumnName);
  
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    const index = normalizedHeaders.findIndex(header => 
      header.includes(normalizedName) || normalizedName.includes(header)
    );
    if (index !== -1) return index;
  }
  return -1;
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
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try common date formats
  const formats = [
    // MM/DD/YYYY or MM/DD/YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    // DD/MM/YYYY or DD/MM/YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
  ];
  
  const cleanDate = dateStr.trim();
  
  // Try parsing with Date constructor first
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Continue with manual parsing
  }
  
  // Manual parsing for specific formats
  for (const format of formats) {
    const match = cleanDate.match(format);
    if (match) {
      let [, part1, part2, part3] = match;
      let year, month, day;
      
      // Determine if it's MM/DD/YYYY or DD/MM/YYYY based on values
      if (format.source.startsWith('^(\\d{4})')) {
        // YYYY-MM-DD format
        [year, month, day] = [part1, part2, part3];
      } else {
        // Assume MM/DD/YYYY for US format, DD/MM/YYYY for others
        if (parseInt(part1) > 12) {
          // Must be DD/MM format
          [day, month, year] = [part1, part2, part3];
        } else if (parseInt(part2) > 12) {
          // Must be MM/DD format
          [month, day, year] = [part1, part2, part3];
        } else {
          // Default to MM/DD format (US standard)
          [month, day, year] = [part1, part2, part3];
        }
      }
      
      // Handle 2-digit years
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year = String(currentCentury + parseInt(year));
      }
      
      // Validate and format
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Fallback to current date
  return new Date().toISOString().split('T')[0];
}

function detectBankFormat(headers: string[]): keyof typeof COLUMN_MAPPINGS {
  const normalizedHeaders = headers.map(normalizeColumnName);
  
  // Check for bank-specific patterns
  if (normalizedHeaders.some(h => h.includes('chase'))) return 'chase';
  if (normalizedHeaders.some(h => h.includes('bank_of_america'))) return 'bankofamerica';
  if (normalizedHeaders.some(h => h.includes('wells_fargo'))) return 'wells_fargo';
  
  return 'generic';
}

export async function parseCSV(file: File): Promise<ParsedFileResult> {
  const errors: string[] = [];
  const transactions: RawTransaction[] = [];
  
  try {
    // Read file content
    const content = await file.text();
    
    // Parse CSV with various options to handle different formats
    let records: any[];
    
    try {
      records = parse(content, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow varying column counts
        cast: false // Keep everything as strings initially
      });
    } catch (parseError) {
      // Try parsing without headers if the above fails
      try {
        records = parse(content, {
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true
        });
        
        // Manually set headers if we have data
        if (records.length > 0) {
          const headers = records[0];
          records = records.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        }
      } catch (secondError) {
        throw new Error(`Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
    
    if (!records || records.length === 0) {
      throw new Error('No data found in CSV file');
    }
    
    // Get headers and detect bank format
    const headers = Object.keys(records[0]);
    const bankFormat = detectBankFormat(headers);
    const mappings = COLUMN_MAPPINGS[bankFormat];
    
    // Find column indices
    const dateIndex = findColumnIndex(headers, mappings.date);
    const descriptionIndex = findColumnIndex(headers, mappings.description);
    const amountIndex = findColumnIndex(headers, mappings.amount);
    const balanceIndex = findColumnIndex(headers, (mappings as any).balance || []);
    const typeIndex = findColumnIndex(headers, (mappings as any).type || []);
    
    if (dateIndex === -1 || descriptionIndex === -1 || amountIndex === -1) {
      throw new Error(`Required columns not found. Expected columns containing: date, description, and amount. Found headers: ${headers.join(', ')}`);
    }
    
    // Process each record
    records.forEach((record, index) => {
      try {
        const values = Object.values(record);
        const dateStr = String(values[dateIndex] || '').trim();
        const description = String(values[descriptionIndex] || '').trim();
        const amountStr = String(values[amountIndex] || '').trim();
        
        if (!dateStr || !description || !amountStr) {
          errors.push(`Row ${index + 2}: Missing required data (date, description, or amount)`);
          return;
        }
        
        const amount = parseAmount(amountStr);
        if (amount === 0 && amountStr !== '0' && amountStr !== '0.00') {
          errors.push(`Row ${index + 2}: Could not parse amount "${amountStr}"`);
          return;
        }
        
        const transaction: RawTransaction = {
          date: parseDate(dateStr),
          description: description,
          amount: amount,
        };
        
        // Add optional fields
        if (balanceIndex !== -1) {
          const balanceStr = String(values[balanceIndex] || '').trim();
          if (balanceStr) {
            transaction.balance = parseAmount(balanceStr);
          }
        }
        
        if (typeIndex !== -1) {
          const typeStr = String(values[typeIndex] || '').trim().toLowerCase();
          if (typeStr.includes('credit') || typeStr.includes('cr')) {
            transaction.type = 'credit';
          } else if (typeStr.includes('debit') || typeStr.includes('dr')) {
            transaction.type = 'debit';
          }
        }
        
        // Extract merchant name from description (simple heuristic)
        const merchant = extractMerchantName(description);
        if (merchant) {
          transaction.merchant = merchant;
        }
        
        transactions.push(transaction);
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    if (transactions.length === 0) {
      throw new Error('No valid transactions found in the file');
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
        originalFilename: file.name,
        parsedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

export async function parsePDF(file: File): Promise<ParsedFileResult> {
  // PDF parsing requires server-side processing due to Node.js dependencies
  // We'll send the file to our API endpoint for processing
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to parse PDF`);
    }
    
    const result: ParsedFileResult = await response.json();
    return result;
    
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Universal file parser that detects file type and uses appropriate parser
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;
  
  if (fileExtension === 'csv' || mimeType === 'text/csv') {
    return parseCSV(file);
  } else if (fileExtension === 'pdf' || mimeType === 'application/pdf') {
    return parsePDF(file);
  } else {
    throw new Error(`Unsupported file type: ${fileExtension || mimeType}. Please upload CSV or PDF files.`);
  }
}