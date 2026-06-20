import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY. Configure it in Supabase Secrets.')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { preorderId, customerEmail, customerName, productName, skuCode } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>',
        to: customerEmail,
        subject: `Sua encomenda de ${productName} chegou!`,
        html: `<p>Olá ${customerName},</p><p>Sua encomenda do item <strong>${productName} (${skuCode})</strong> chegou e já está disponível em nosso estoque!</p><p>Entre em contato conosco para finalizar sua compra.</p>`,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const { error: updateError } = await supabaseClient
      .from('pre_orders')
      .update({ status: 'notified' })
      .eq('id', preorderId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
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
