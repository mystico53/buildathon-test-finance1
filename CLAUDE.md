# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build production application (required before deployment)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks (must pass for deployment)

## Project Architecture

This is a Next.js 15 App Router application with two main features:
1. **URL-based collaborative workspaces** using Supabase real-time features
2. **Personal Finance Tracker** with AI-powered transaction categorization

### Core Architecture Patterns

**URL = Identity**: Workspaces are identified by URL paths (`/workspace/[workspaceId]`). No authentication required - anyone with the URL can access the workspace.

**Real-time Collaboration**: Uses Supabase real-time subscriptions for presence tracking and collaborative features. Each browser session gets a UUID for temporary identification.

**Three-Layer Supabase Integration**:
- `lib/supabase/client.ts` - Browser client for client components
- `lib/supabase/server.ts` - Server client for server components/API routes
- `lib/supabase/middleware.ts` - Session management in middleware

### Key Components & Flow

**Workspace Entry Point**: `app/workspace/[workspaceId]/page.tsx` is the main workspace interface. It:
1. Validates database schema via `setupWorkspaceSchema()`
2. Initializes workspace activity via `useWorkspaceActivity()` hook
3. Renders collaborative interface with presence indicators

**Activity Management**: `hooks/useWorkspaceActivity.ts` consolidates all real-time logic:
- Session management with localStorage
- Presence updates every 30 seconds
- Real-time subscription to workspace changes
- Cleanup handling for page visibility/unload events

**Presence System**: `lib/workspace-activity.ts` handles core business logic:
- UUID-based session tracking
- Debounced presence updates
- Automatic cleanup of stale records
- User name management

### Database Schema

Located in `supabase-setup.sql`, defines two main tables:

**workspace_presence**: Tracks online users per workspace
- `workspace_id` links to URL parameter
- `user_session` for browser-unique identification
- `last_seen` for cleanup of inactive users
- Real-time enabled for instant presence updates

**workspace_items**: Future collaborative data storage
- Scoped by `workspace_id`
- JSONB content for flexible data types
- Position tracking for spatial collaboration

### Environment Configuration

Required environment variables (in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` - Public API key

### Development Workflow

1. **Database Setup**: Run `supabase-setup.sql` in Supabase dashboard SQL editor
2. **Environment**: Copy `.env.example` to `.env.local` and add Supabase credentials
3. **Development**: Use `npm run dev` with Turbopack for fast iteration
4. **Testing Multi-user**: Open workspace URLs in multiple browser tabs/windows
5. **Deployment**: Ensure `npm run build` and `npm run lint` pass before deployment

### Real-time Subscription Pattern

The codebase uses a centralized subscription pattern in `useWorkspaceActivity`:
```typescript
const subscription = supabase
  .channel(`workspace-${workspaceId}`)
  .on('postgres_changes', { 
    table: 'workspace_presence', 
    filter: `workspace_id=eq.${workspaceId}` 
  }, handleChange)
  .subscribe();
```

### Performance Considerations

- **Debounced Updates**: Presence fetching is debounced to prevent excessive API calls
- **Visibility Optimization**: Pauses presence updates when tab is hidden
- **Cleanup Strategy**: Automatic removal of stale presence records older than 1 hour
- **Local Storage**: Session and user name persistence across page reloads

### UI Component Structure

Uses shadcn/ui components with Tailwind CSS. Key patterns:
- `UserActivityIndicator` - Shows online users with color-coded avatars
- `UserProfileCard` - Editable user name with session info
- Responsive grid layout for workspace content areas
- Loading states during database schema validation

### Error Handling Strategy

- **Schema Validation**: Checks database setup before rendering workspace
- **Connection Testing**: `components/connection-test.tsx` validates Supabase connection
- **Graceful Degradation**: Shows helpful setup instructions when database isn't configured
- **Real-time Fallbacks**: Continues working if real-time subscription fails

When working with this codebase, always test multi-user scenarios and ensure real-time features work across multiple browser sessions.

## Personal Finance Tracker Architecture

The Personal Finance Tracker (`/finance`) implements a complete financial analysis system using the "assemble, don't build" philosophy.

### Finance Tracker Core Flow

**File Processing Pipeline**: 
1. `components/file-upload.tsx` - Drag-and-drop interface using `react-dropzone`
2. `lib/file-parsers.ts` - CSV parsing with `csv-parse`, PDF parsing via API route
3. `lib/transaction-categorizer.ts` - AI categorization with rule-based fallbacks
4. `lib/finance-db.ts` - Database operations and data aggregation

**Database Schema**: Located in `finance-tracker-setup.sql`, defines:
- `categories` - Predefined expense/income categories with icons and colors
- `transactions` - Individual financial transactions linked to users
- `budgets` - User-defined spending limits per category
- `uploaded_files` - File processing tracking and metadata

### Key Finance Components

**FileUpload Component**: Multi-file drag-and-drop with validation for CSV/PDF files, processing status indicators, and error handling.

**SpendingCharts Component**: Uses Recharts library for:
- Monthly spending trends (line/area charts)
- Category breakdown (pie charts)
- Income vs expense comparisons (bar charts)

**BudgetRecommendations Component**: AI-powered budget suggestions based on spending patterns and financial analysis.

### File Processing Architecture

**CSV Processing**: Client-side parsing using `csv-parse` with support for multiple bank formats through column mapping strategies.

**PDF Processing**: Server-side processing via `/api/parse-pdf` route using PDF text extraction and table recognition.

**Transaction Categorization**: 
- Primary: AI API categorization for accuracy
- Fallback: Rule-based categorization using merchant keywords
- Manual: User override capabilities

### Data Flow Pattern

```typescript
File Upload → Parse (CSV/PDF) → Categorize (AI/Rules) → Save to Database → Update Dashboard
```

### Financial Analytics Features

**Dashboard Analytics**:
- Monthly spending trends and patterns
- Category-based spending breakdown
- Budget vs actual spending comparisons
- Transaction history with filtering

**Budget Intelligence**:
- Automated budget recommendations
- Spending pattern analysis
- Alert system for budget overages
- Historical spending averages

### Finance Database Operations

**financeDB Service** (`lib/finance-db.ts`) provides:
- Transaction CRUD operations with user isolation
- Monthly spending aggregation
- Category spending analysis
- Budget management and tracking

### Environment Requirements

Additional environment variables for finance features:
- Standard Supabase credentials (existing)
- Optional: AI categorization API keys

### Finance Development Workflow

1. **Database Setup**: Run `finance-tracker-setup.sql` in Supabase dashboard
2. **File Upload Testing**: Use sample CSV/PDF bank statements
3. **Categorization Testing**: Verify AI and rule-based categorization accuracy
4. **Chart Validation**: Ensure Recharts renders properly with transaction data
5. **Multi-user Testing**: Verify RLS policies isolate user data correctly

### Performance Considerations for Finance

- **Client-side CSV parsing** prevents server load for large files
- **Debounced categorization** batches API calls for efficiency
- **Database indexes** on user_id, date, and category_id for fast queries
- **Lazy loading** of chart data and transaction history

### Error Handling in Finance Flow

- **File validation** before processing (file type, size limits)
- **Parse error recovery** with detailed error messages
- **Categorization fallbacks** when AI service unavailable
- **Database transaction rollback** on batch processing failures

The finance tracker demonstrates rapid development by assembling existing solutions (Recharts, csv-parse, react-dropzone) rather than building custom implementations.