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
    const { email, password, full_name, role, organization_id, entity_data } = body

    let userId = ''
    let createdUser = null

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: full_name },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already') || (error as any).status === 422) {
        const { data: profiles, error: profileQueryError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (profileQueryError || !profiles) {
          throw new Error('Email já está registrado, mas não foi possível recuperar o perfil.')
        }
        userId = profiles.id
        createdUser = { id: userId, email }
      } else {
        throw error
      }
    } else {
      userId = data.user.id
      createdUser = data.user
      // Wait a brief moment to ensure trigger has created the profile
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Update the automatically created profile with role and organization_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role: role || 'member',
        organization_id,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    if (entity_data) {
      if (role === 'seller') {
        const { error: sellerError } = await supabase.from('sellers').insert({
          user_id: userId,
          organization_id,
          name: full_name,
          ...entity_data,
        })
        if (sellerError) {
          console.error('Seller insert error:', sellerError)
          throw new Error(`Erro ao criar vendedor: ${sellerError.message}`)
        }
      } else if (role === 'driver') {
        const { error: driverError } = await supabase.from('drivers').insert({
          user_id: userId,
          organization_id,
          name: full_name,
          ...entity_data,
        })
        if (driverError) {
          console.error('Driver insert error:', driverError)
          throw new Error(`Erro ao criar entregador: ${driverError.message}`)
        }
      }
    }

    return new Response(JSON.stringify({ user: createdUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    // Return 200 to prevent opaque "non-2xx status code" error from supabase-js edge function invoke
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
