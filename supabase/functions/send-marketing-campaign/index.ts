import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const reqAuthHeader = req.headers.get('Authorization')
    if (!reqAuthHeader) throw new Error('Missing Auth Header')

    // Client for auth RLS checks
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: reqAuthHeader } },
    })

    const { campaignId } = await req.json()
    if (!campaignId) throw new Error('Missing campaignId')

    // Verify campaign exists and belongs to the user
    const { data: campaign, error: campaignError } = await supabaseUser
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) throw new Error('Campaign not found or unauthorized')
    if (campaign.status !== 'draft') throw new Error('Campaign already sent or processing')

    // Mark as sending (using user client ensures RLS check passed)
    await supabaseUser
      .from('marketing_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId)

    // Admin client to bypass RLS for background sending operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check Plan Limits (RN14)
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('plan_type')
      .eq('id', campaign.organization_id)
      .single()

    const planType = org?.plan_type || 'basic'
    const monthlyLimit = planType === 'pro' ? 10000 : 500

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: pastCampaigns } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('total_recipients')
      .eq('organization_id', campaign.organization_id)
      .eq('status', 'completed')
      .gte('sent_at', startOfMonth.toISOString())

    const usedEmails = (pastCampaigns || []).reduce((acc, c) => acc + (c.total_recipients || 0), 0)

    // Fetch target customers
    let customersQuery = supabaseAdmin
      .from('customers')
      .select('id, email, name')
      .eq('organization_id', campaign.organization_id)
      .eq('is_unsubscribed', false)
      .not('email', 'is', null)
      .neq('email', '')

    if (campaign.segment) {
      customersQuery = customersQuery.eq('segment', campaign.segment)
    }

    const { data: customers } = await customersQuery

    if (!customers || customers.length === 0) {
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({
          status: 'completed',
          total_recipients: 0,
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      return new Response(
        JSON.stringify({
          success: true,
          sentCount: 0,
          message: 'Nenhum cliente elegível encontrado',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (usedEmails + customers.length > monthlyLimit) {
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId)
      throw new Error(
        `Limite do plano excedido. Plano: ${planType.toUpperCase()} (${monthlyLimit} envios/mês). Já enviados: ${usedEmails}. Necessários: ${customers.length}.`,
      )
    }

    const origin = req.headers.get('origin') || 'https://saas-multi-tenant-auth-9509d.goskip.app'
    let sentCount = 0

    // In a real implementation, we would batch this to Resend.
    // For the test context, we mock the success.
    for (const customer of customers) {
      const unsubscribeUrl = `${origin}/unsubscribe/${customer.id}`
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          ${campaign.content.replace(/\n/g, '<br>')}
          <hr style="margin-top: 40px; border: none; border-top: 1px solid #eaeaea;" />
          <p style="font-size: 12px; color: #888; text-align: center;">
            Você está recebendo este e-mail porque é cliente da nossa loja.<br/>
            Para parar de receber nossos e-mails promocionais, <a href="${unsubscribeUrl}" style="color: #666;">clique aqui para cancelar a inscrição</a>.
          </p>
        </div>
      `

      // MOCK SEND:
      console.log(
        `[Resend Mock] To: ${customer.email} | Subject: ${campaign.subject} | Opt-out: ${unsubscribeUrl}`,
      )
      sentCount++
    }

    // Complete campaign
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({
        status: 'completed',
        total_recipients: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return new Response(JSON.stringify({ success: true, sentCount }), {
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
