import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) throw new Error('No organization found')

    const { email, full_name, role, password } = await req.json()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'TemporaryPassword123!',
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) throw createError

    // Wait a moment to ensure trigger handles new user creation
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { data: newProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', newUser.user.id)
      .single()

    await supabaseAdmin
      .from('profiles')
      .update({
        organization_id: profile.organization_id,
        role: role || 'member',
      })
      .eq('id', newUser.user.id)

    if (newProfile?.organization_id && newProfile.organization_id !== profile.organization_id) {
      await supabaseAdmin.from('organizations').delete().eq('id', newProfile.organization_id)
    }

    if (role === 'seller') {
      const slug =
        full_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Math.random().toString(36).substring(2, 7)
      await supabaseAdmin.from('sellers').insert({
        organization_id: profile.organization_id,
        user_id: newUser.user.id,
        name: full_name,
        slug: slug,
      })
    }

    return new Response(JSON.stringify({ user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
