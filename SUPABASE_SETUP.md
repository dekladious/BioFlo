# Supabase Client Setup

## ✅ Files Created

1. **`utils/supabase/server.ts`** - Server-side Supabase client for use in Server Components and API routes
2. **`utils/supabase/client.ts`** - Browser-side Supabase client for use in Client Components
3. **`utils/supabase/middleware.ts`** - Middleware helper (optional, since you're using Clerk for auth)

## 📋 Required Environment Variables

Add these to your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://swxqkblbrtgweamehvef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Existing Database Connection (still needed for direct Postgres queries)
DATABASE_URL=postgresql://postgres:password@db.swxqkblbrtgweamehvef.supabase.co:5432/postgres
```

### Where to Find Supabase Keys

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🔧 Usage Examples

### Server Component (Server-Side)

```typescript
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .limit(10)
  
  if (error) {
    console.error('Error:', error)
    return <div>Error loading data</div>
  }
  
  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  )
}
```

### Client Component (Browser-Side)

```typescript
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function ClientPage() {
  const [data, setData] = useState<any[]>([])
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .limit(10)
      
      if (error) {
        console.error('Error:', error)
      } else {
        setData(data || [])
      }
    }
    
    fetchData()
  }, [])
  
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  )
}
```

### API Route

```typescript
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .limit(10)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

## ⚠️ Important Notes

### Dual Database Approach

Your codebase currently uses **two database connection methods**:

1. **Direct PostgreSQL** (`lib/db/client.ts`) - For existing queries, migrations, and scripts
2. **Supabase Client** (`utils/supabase/*`) - For new features, RLS, real-time, and Supabase-specific features

Both can coexist:
- Use **direct Postgres** for: Scripts, migrations, existing API routes, bulk operations
- Use **Supabase client** for: RLS-protected queries, real-time subscriptions, new features

### Authentication

- **Clerk** is still your primary auth provider (handled in `middleware.ts`)
- **Supabase Auth** is NOT being used (you're using Clerk)
- Supabase client uses the **anon key** for database queries
- For RLS, you'll need to pass Clerk user IDs to Supabase queries

### Middleware

The `utils/supabase/middleware.ts` file is created but **not currently used** because:
- You're using Clerk middleware for authentication
- Supabase middleware would be needed if you were using Supabase Auth

If you want to use Supabase middleware in the future, you can integrate it with Clerk middleware.

## 🚀 Next Steps

1. ✅ Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
2. ✅ Test the connection with a simple query
3. 🔄 Gradually migrate queries to use Supabase client where beneficial (RLS, real-time)
4. 🔄 Keep direct Postgres for scripts and migrations

## 📚 Resources

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

