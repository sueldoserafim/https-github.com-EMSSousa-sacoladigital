import {
  Store,
  Star,
  Instagram,
  Facebook,
  MapPin,
  Phone,
  Mail,
  Award,
  CheckCircle2,
} from 'lucide-react'

export interface CatalogProductItem {
  id: string
  name: string
  price: number
  stock?: number
  product_skus?: Array<{
    id: string
    sku_code?: string
    image_url?: string
    price_override?: number | null
    stock?: number
  }>
}

interface CatalogPrintViewProps {
  organization: any
  products: CatalogProductItem[]
  format?: 'grid' | 'list'
  showPrice?: boolean
  showLogo?: boolean
  showWhatsApp?: boolean
}

export function CatalogPrintView({
  organization,
  products,
  format = 'grid',
  showPrice = true,
  showLogo = true,
  showWhatsApp = true,
}: CatalogPrintViewProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div
      className="catalog-printable-root w-full bg-white text-slate-800 font-sans"
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        boxSizing: 'border-box',
      }}
    >
      {/* ========================================================
          CABEÇALHO DA LOJA COM GRADIENTE ROSA & LOGO CIRCULAR
          ======================================================== */}
      <header
        className="catalog-page-header relative w-full overflow-hidden rounded-2xl shadow-sm text-white mb-6"
        style={{
          background: 'linear-gradient(135deg, #be185d 0%, #db2777 50%, #f472b6 100%)',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Soft background pattern decoration */}
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-black/10 blur-2xl pointer-events-none"
        />

        <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col items-center text-center">
          {/* Circular Store Logo */}
          {showLogo && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center mb-3 shrink-0">
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name || 'Loja'}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <Store className="w-10 h-10 text-pink-600" />
              )}
            </div>
          )}

          {/* Store Name in Highlight */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm max-w-xl">
            {organization?.name || 'Catálogo Digital'}
          </h1>

          {/* Description */}
          {organization?.description ? (
            <p className="mt-1 text-xs sm:text-sm text-pink-100 font-medium max-w-lg leading-snug">
              {organization.description}
            </p>
          ) : (
            <p className="mt-1 text-xs sm:text-sm text-pink-100 font-medium max-w-lg leading-snug">
              Os melhores produtos de beleza e cosméticos com a qualidade e cuidado que você merece.
            </p>
          )}

          {/* Badges / Rating Seals & Item Count */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            {/* Rating Seal */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm">
              <div className="flex items-center text-amber-300">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <span>4.9</span>
              <span className="text-pink-100 font-normal">(1.2k+ avaliações)</span>
            </div>

            {/* Quality Seal */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm">
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              <span>Garantia de Qualidade</span>
            </div>

            {/* Total Items Count */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-white border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{products.length} itens no catálogo</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          GRADE DE PRODUTOS (3 COLUNAS EM A4) OU LISTA
          ======================================================== */}
      {format === 'grid' ? (
        <div
          className="catalog-products-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            width: '100%',
          }}
        >
          {products.map((product, index) => {
            const refNumber = `Ref. #${String(index + 1).padStart(2, '0')}`

            // Stock calculation
            const hasExplicitStock = typeof product.stock === 'number'
            const skusStock =
              product.product_skus && product.product_skus.length > 0
                ? product.product_skus.reduce((acc, s) => acc + (s.stock || 0), 0)
                : null

            const effectiveStock =
              skusStock !== null ? skusStock : hasExplicitStock ? (product.stock as number) : 1
            const isOutOfStock = effectiveStock <= 0

            // Price & discount calculation
            const minPrice =
              product.product_skus && product.product_skus.length > 0
                ? product.product_skus.reduce((min: number, sku: any) => {
                    const price = sku.price_override || product.price
                    return price < min ? price : min
                  }, product.price || 0)
                : product.price || 0

            const originalPrice = product.price || minPrice
            const hasDiscount = !isOutOfStock && originalPrice > minPrice
            const discountPercent = hasDiscount
              ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
              : 0

            // Product image
            const skuWithImage = product.product_skus?.find((s) => s.image_url)
            const imageUrl = skuWithImage?.image_url

            return (
              <div
                key={product.id || index}
                className="catalog-card-item"
                style={{
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  className="relative flex flex-col h-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  {/* Photo area with Reference pill and Out-of-stock badge */}
                  <div
                    className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center border-b border-slate-100"
                    style={{ position: 'relative' }}
                  >
                    {/* Reference pill on top-left (e.g. "Ref. #01") */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/95 text-slate-700 shadow-sm border border-slate-200/80">
                        {refNumber}
                      </span>
                    </div>

                    {/* Discrete "Esgotado" badge on top-right (does NOT cover photo or price) */}
                    {isOutOfStock && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-white shadow-sm">
                          Esgotado
                        </span>
                      </div>
                    )}

                    {/* Discount badge if applicable */}
                    {hasDiscount && !isOutOfStock && showPrice && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#be185d] text-white shadow-sm">
                          -{discountPercent}%
                        </span>
                      </div>
                    )}

                    {/* Product Photo: attenuated with opacity + slight grayscale when out of stock */}
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-opacity ${
                          isOutOfStock ? 'opacity-40 grayscale-[70%]' : 'opacity-100'
                        }`}
                        crossOrigin="anonymous"
                        loading="eager"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-1 p-4">
                        <Store className="w-10 h-10 stroke-[1.2]" />
                        <span className="text-[10px] font-medium text-slate-400">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                    <div>
                      {/* Review stars rating */}
                      <div className="flex items-center gap-1 mb-1">
                        <div className="flex items-center text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">5.0</span>
                      </div>

                      {/* Product Name */}
                      <h3
                        className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 min-h-[2rem]"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                    </div>

                    {/* Price section */}
                    {showPrice && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        {isOutOfStock ? (
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-slate-400 line-through">
                              {formatCurrency(minPrice)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 italic">
                              Indisponível
                            </span>
                          </div>
                        ) : hasDiscount ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 line-through font-normal">
                              De: {formatCurrency(originalPrice)}
                            </span>
                            <span className="text-sm font-extrabold text-[#be185d] tracking-tight">
                              Por: {formatCurrency(minPrice)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-extrabold text-[#be185d] tracking-tight">
                              {formatCurrency(minPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List mode (1 column) */
        <div className="catalog-products-list flex flex-col gap-3" style={{ width: '100%' }}>
          {products.map((product, index) => {
            const refNumber = `Ref. #${String(index + 1).padStart(2, '0')}`

            const hasExplicitStock = typeof product.stock === 'number'
            const skusStock =
              product.product_skus && product.product_skus.length > 0
                ? product.product_skus.reduce((acc, s) => acc + (s.stock || 0), 0)
                : null

            const effectiveStock =
              skusStock !== null ? skusStock : hasExplicitStock ? (product.stock as number) : 1
            const isOutOfStock = effectiveStock <= 0

            const minPrice =
              product.product_skus && product.product_skus.length > 0
                ? product.product_skus.reduce((min: number, sku: any) => {
                    const price = sku.price_override || product.price
                    return price < min ? price : min
                  }, product.price || 0)
                : product.price || 0

            const originalPrice = product.price || minPrice
            const hasDiscount = !isOutOfStock && originalPrice > minPrice
            const discountPercent = hasDiscount
              ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
              : 0

            const skuWithImage = product.product_skus?.find((s) => s.image_url)
            const imageUrl = skuWithImage?.image_url

            return (
              <div
                key={product.id || index}
                className="catalog-card-item"
                style={{
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden p-3 gap-4 shadow-sm">
                  {/* Photo with reference */}
                  <div className="relative w-24 h-24 rounded-lg bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                    <span className="absolute top-1 left-1 z-10 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/95 text-slate-700 shadow-sm border border-slate-200">
                      {refNumber}
                    </span>

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className={`w-full h-full object-cover ${
                          isOutOfStock ? 'opacity-40 grayscale-[70%]' : 'opacity-100'
                        }`}
                        crossOrigin="anonymous"
                        loading="eager"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">5.0</span>
                      {isOutOfStock && (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-white">
                          Esgotado
                        </span>
                      )}
                      {hasDiscount && showPrice && !isOutOfStock && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#be185d] text-white">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                      {product.name}
                    </h3>
                    {product.product_skus && product.product_skus.length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {product.product_skus.length} variação(ões) disponível(is)
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  {showPrice && (
                    <div className="text-right shrink-0 pl-2">
                      {hasDiscount && !isOutOfStock ? (
                        <>
                          <div className="text-[11px] text-slate-400 line-through">
                            {formatCurrency(originalPrice)}
                          </div>
                          <div className="text-base font-extrabold text-[#be185d]">
                            {formatCurrency(minPrice)}
                          </div>
                        </>
                      ) : (
                        <div className="text-base font-extrabold text-[#be185d]">
                          {formatCurrency(minPrice)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================
          RODAPÉ ESCURO COM REDES SOCIAIS E ENDEREÇO DA LOJA
          ======================================================== */}
      <footer
        className="catalog-page-footer mt-8 rounded-2xl bg-slate-900 text-slate-200 p-6 shadow-md"
        style={{
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          {/* Coluna 1: Endereço & Localização */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-pink-400" />
              <span>Localização da Loja</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {organization?.store_address ||
                organization?.address ||
                'Av. Paulista, 1000 - Bela Vista, São Paulo - SP'}
            </p>
            <p className="text-slate-400 text-[10px] mt-1">Atendimento presencial & online</p>
          </div>

          {/* Coluna 2: Redes Sociais */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>Redes Sociais</span>
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">@{organization?.slug || 'loja.oficial'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Facebook className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">fb.com/{organization?.slug || 'loja.oficial'}</span>
              </div>
            </div>
          </div>

          {/* Coluna 3: Atendimento & WhatsApp */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fale Conosco</span>
            </h4>
            <div className="space-y-1.5 text-[11px]">
              {showWhatsApp && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{organization?.whatsapp_number || '+55 (11) 99999-9999'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-300 truncate">
                <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">contato@{organization?.slug || 'empresa'}.com.br</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separator & Copyright bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
          <p>
            Catálogo gerado em {new Date().toLocaleDateString('pt-BR')} • Válido enquanto durarem os
            estoques
          </p>
          <p className="font-semibold text-slate-300">
            © {new Date().getFullYear()} {organization?.name || 'Sacola Digital'} • Todos os
            direitos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}
