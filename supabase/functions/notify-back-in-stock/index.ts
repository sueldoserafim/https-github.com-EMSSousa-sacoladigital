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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    const skuId = payload.sku_id

    if (!skuId) {
      throw new Error('Missing sku_id')
    }

    // Get pending wishlists for this sku
    const { data: wishlists, error: wishError } = await supabase
      .from('wishlists')
      .select('id, customer_id')
      .eq('sku_id', skuId)
      .eq('status', 'pending')

    if (wishError) throw wishError
    if (!wishlists || wishlists.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No wishlists to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get sku and product info
    const { data: sku, error: skuError } = await supabase
      .from('product_skus')
      .select('sku_code, product_id, products(name)')
      .eq('id', skuId)
      .single()

    if (skuError) throw skuError
    const productName = (sku as any).products?.name || 'Produto'
    const skuCode = sku.sku_code

    // Get customers
    const customerIds = wishlists.map((w: any) => w.customer_id)
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id, name, email')
      .in('id', customerIds)

    if (custError) throw custError

    const customersMap = new Map(customers.map((c: any) => [c.id, c]))

    // Send emails
    const emailsToSend = []
    const notifiedWishlistIds = []

    for (const w of wishlists) {
      const customer = customersMap.get(w.customer_id)
      if (customer && customer.email) {
        emailsToSend.push({
          from: 'Acme <onboarding@resend.dev>',
          to: customer.email,
          subject: `${productName} está de volta ao estoque!`,
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #333;">O item que você queria chegou! 🎉</h2>
              <p>Olá <strong>${customer.name}</strong>,</p>
              <p>Você pediu para ser avisado quando <strong>${productName} (Ref: ${skuCode})</strong> voltasse ao estoque.</p>
              <p>Ótimas notícias: o produto já está disponível novamente!</p>
              <div style="margin: 30px 0;">
                <a href="${req.headers.get('origin') || 'https://sua-loja.com'}/vitrine/loja" style="background-color: #e53e3e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Comprar Agora
                </a>
              </div>
              <p>Corra antes que acabe novamente!</p>
            </div>
          `,
        })
        notifiedWishlistIds.push(w.id)
      }
    }

    if (emailsToSend.length > 0) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(emailsToSend),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to send batch emails', errorText)
        throw new Error(`Failed to send emails: ${errorText}`)
      }
    }

    // Update wishlists to notified
    if (notifiedWishlistIds.length > 0) {
      const { error: updateError } = await supabase
        .from('wishlists')
        .update({ status: 'notified' })
        .in('id', notifiedWishlistIds)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, notifiedCount: notifiedWishlistIds.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
