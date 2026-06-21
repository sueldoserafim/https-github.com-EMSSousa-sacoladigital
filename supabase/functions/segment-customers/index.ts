import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all customers for all organizations
    const { data: customers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id, organization_id, created_at')

    if (customersError) throw customersError

    let processed = 0

    for (const customer of customers || []) {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('total, created_at, status')
        .eq('customer_id', customer.id)

      let totalSpent = 0
      let lastPurchaseDate: Date | null = null

      if (orders && orders.length > 0) {
        for (const order of orders) {
          if (order.status !== 'Cancelado') {
            totalSpent += Number(order.total || 0)
          }

          const orderDate = new Date(order.created_at)
          if (!lastPurchaseDate || orderDate > lastPurchaseDate) {
            lastPurchaseDate = orderDate
          }
        }
      }

      // VIP Logic: Total spent > 500
      if (totalSpent > 500) {
        const { data: existingTags } = await supabaseAdmin
          .from('customer_tags')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('name', 'VIP')

        if (!existingTags || existingTags.length === 0) {
          await supabaseAdmin.from('customer_tags').insert({
            customer_id: customer.id,
            organization_id: customer.organization_id,
            name: 'VIP',
          })
        }
      }

      // Segment Logic
      let segment = 'Novo'
      const now = new Date()
      const createdDate = new Date(customer.created_at)
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24),
      )

      if (lastPurchaseDate) {
        const daysSinceLastPurchase = Math.floor(
          (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 3600 * 24),
        )
        if (daysSinceLastPurchase > 90) {
          segment = 'Inativo'
        } else {
          segment = 'Ativo'
        }
      } else {
        if (daysSinceCreation > 30) {
          segment = 'Inativo'
        } else {
          segment = 'Novo'
        }
      }

      // Update segment on the customer record
      await supabaseAdmin.from('customers').update({ segment }).eq('id', customer.id)

      processed++
    }

    return new Response(JSON.stringify({ success: true, processed }), {
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
