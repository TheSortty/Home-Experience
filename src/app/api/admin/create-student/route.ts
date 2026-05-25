import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { resolveRole } from '@/src/services/roleService';

export async function POST(request: Request) {
  try {
    // 1. Verify caller is admin using regular server client
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolveRole(supabase, user.id);
    if (role !== 'admin' && role !== 'sysadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json() as { email: string; mode: string; password?: string; firstName?: string; lastName?: string };
    const { email, mode, password, firstName, lastName } = body;

    if (!email || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Create admin client with service role key to bypass RLS and use auth admin API
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminAuthClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let authUserId: string | null = null;

    // 4. Handle creation mode
    if (mode === 'magic_link') {
      // Invite user by email (sends magic link)
      // Redirect to /auth/update-password so they can set it immediately
      const base = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin');
      const redirectTo = `${base}/auth/callback?next=/auth/update-password`;

      const { data, error } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        data: { first_name: firstName, last_name: lastName },
        redirectTo
      });

      if (error) {
        // If user already exists, Supabase auth might return an error or we just need to link it
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      authUserId = data.user.id;

    } else if (mode === 'password') {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const { data, error } = await adminAuthClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName }
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      authUserId = data.user.id;
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: authUserId });

  } catch (error: any) {
    console.error('Error in create-student route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
