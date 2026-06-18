import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      },
    )

    const { productId } = await req.json()
    if (!productId) throw new Error('productId is required')

    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) throw new Error('Product not found')

    const { data: attributes, error: attrsError } = await supabaseClient
      .from('attributes')
      .select('id, name, attribute_options(id, value)')
      .eq('product_id', productId)

    if (attrsError) throw attrsError
    if (!attributes || attributes.length === 0) {
      return new Response(JSON.stringify({ message: 'No attributes found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let combinations: any[][] = [[]]
    for (const attr of attributes) {
      if (!attr.attribute_options || attr.attribute_options.length === 0) continue
      const nextCombinations: any[][] = []
      for (const current of combinations) {
        for (const option of attr.attribute_options) {
          nextCombinations.push([
            ...current,
            { attributeId: attr.id, optionId: option.id, value: option.value },
          ])
        }
      }
      combinations = nextCombinations
    }

    if (combinations.length === 0 || combinations[0].length === 0) {
      return new Response(JSON.stringify({ message: 'No options found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let count = 0
    for (const combo of combinations) {
      const safeProductName = product.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const safeValues = combo
        .map((c) => c.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
        .join('-')
      const skuCodeStr = `${safeProductName}-${safeValues}`

      const { data: existingSku } = await supabaseClient
        .from('product_skus')
        .select('id')
        .eq('product_id', productId)
        .eq('sku_code', skuCodeStr)
        .single()

      if (!existingSku) {
        const { data: newSku, error: insertError } = await supabaseClient
          .from('product_skus')
          .insert({
            product_id: productId,
            sku_code: skuCodeStr,
            organization_id: product.organization_id,
            stock: 0,
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting SKU', insertError)
          continue
        }

        const relations = combo.map((c) => ({
          sku_id: newSku.id,
          attribute_option_id: c.optionId,
          organization_id: product.organization_id,
        }))
        await supabaseClient.from('sku_attribute_values').insert(relations)
        count++
      }
    }

    return new Response(JSON.stringify({ message: 'SKUs generated', newSkus: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
