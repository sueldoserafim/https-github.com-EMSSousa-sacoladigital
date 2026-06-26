import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

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

    // Ensure we don't pass 'slug' in entity_data to rpc_create_user for sellers,
    // which prevents the duplicate key violation on 'organizations_slug_key'.
    let rpcEntityData = entity_data || null
    if (role === 'seller' && rpcEntityData) {
      const { slug, commission_rate, ...rest } = rpcEntityData
      rpcEntityData = Object.keys(rest).length > 0 ? rest : null
    }

    // Use the RPC to create the user and related entities atomically
    // This strictly adheres to Supabase Auth schema requirements
    const { data: userData, error: rpcError } = await supabase.rpc('rpc_create_user', {
      p_email: email,
      p_password: password,
      p_full_name: full_name,
      p_role: role || 'member',
      p_organization_id: organization_id,
      p_phone: null,
      p_entity_data: rpcEntityData,
    })

    if (rpcError) {
      if (
        rpcError.message.toLowerCase().includes('already') ||
        rpcError.message.toLowerCase().includes('já está registrado')
      ) {
        throw new Error('Este email já está registrado. Por favor, use um email diferente.')
      }
      throw new Error(`Erro ao criar usuário: ${rpcError.message}`)
    }

    // Role-Based Logic Validation: Insert into sellers.slug specifically
    if (role === 'seller' && entity_data) {
      let userId = userData?.id || userData?.user?.id
      if (!userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()
        userId = profile?.id
      }

      if (userId) {
        const { error: sellerError } = await supabase.from('sellers').insert({
          organization_id,
          user_id: userId,
          name: full_name,
          slug: entity_data.slug,
          commission_rate: entity_data.commission_rate || 0,
        })

        if (sellerError) {
          // Idempotent Error Handling for sellers.slug conflict
          if (
            sellerError.message.includes('sellers_slug_key') ||
            sellerError.message.includes('sellers_organization_id_slug_key') ||
            sellerError.code === '23505'
          ) {
            throw new Error(
              'O identificador (slug) já está em uso por outra vendedora. Escolha um diferente.',
            )
          }
          throw new Error(`Erro ao criar vendedora: ${sellerError.message}`)
        }
      } else {
        throw new Error('Erro interno: ID do usuário não encontrado após a criação.')
      }
    }

    return new Response(
      JSON.stringify({ user: userData, message: 'Usuário criado com sucesso.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    )
  } catch (err: any) {
    const errorMessage =
      err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
