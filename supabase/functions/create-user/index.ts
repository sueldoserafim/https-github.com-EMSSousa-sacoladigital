import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração de ambiente (Supabase) ausente no servidor.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { email, password, full_name, role, organization_id, entity_data } = body

    if (!email || !password || !organization_id) {
      throw new Error('Email, senha e organization_id são obrigatórios.')
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      throw new Error(
        'Este email já está registrado na plataforma. Por favor, use um email diferente.',
      )
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: full_name },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already') || (error as any).status === 422) {
        throw new Error('Este email já está registrado. Por favor, use um email diferente.')
      }
      throw new Error(`Erro ao criar usuário na autenticação: ${error.message}`)
    }

    const userId = data.user.id
    const createdUser = data.user

    // Wait for trigger to create profile
    let profileExists = false
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const { data: p } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      if (p) {
        profileExists = true
        break
      }
    }

    if (!profileExists) {
      // Fallback: manually create the profile if trigger failed or was slow
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          role: role || 'member',
          organization_id,
        })
        .select()
        .maybeSingle()

      if (insertProfileError && !insertProfileError.message.includes('duplicate')) {
        throw new Error(`Erro ao criar perfil de usuário: ${insertProfileError.message}`)
      }
    } else {
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
        throw new Error(`Erro ao atualizar perfil do usuário: ${profileError.message}`)
      }
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
          throw new Error(`Erro ao criar registro da vendedora: ${sellerError.message}`)
        }
      } else if (role === 'driver') {
        const { error: driverError } = await supabase.from('drivers').insert({
          user_id: userId,
          organization_id,
          name: full_name,
          ...entity_data,
        })
        if (driverError) {
          throw new Error(`Erro ao criar registro do entregador: ${driverError.message}`)
        }
      }
    }

    return new Response(JSON.stringify({ user: createdUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    // Return 200 with error property to prevent opaque non-2xx errors from client invoke
    const errorMessage =
      err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
