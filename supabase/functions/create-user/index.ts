import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const { email, password, full_name, role, organization_id } = body

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: full_name },
    })

    if (error) throw error

    // Wait a brief moment to ensure trigger has created the profile
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Update the automatically created profile with role and organization_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role: role || 'member',
        organization_id,
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    return new Response(JSON.stringify({ user: data.user }), {
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
