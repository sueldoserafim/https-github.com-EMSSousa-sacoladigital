import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, X, ImageIcon, Search } from 'lucide-react'

export default function Settings() {
  const { user, profile, organization } = useAuth()
  const { toast } = useToast()

  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [fullName, setFullName] = useState('')
  const [loadingOrg, setLoadingOrg] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const [pointsPerCurrency, setPointsPerCurrency] = useState(1)
  const [discountValuePerPoint, setDiscountValuePerPoint] = useState(0.01)
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(50)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(0)
  const [monthlyProLabore, setMonthlyProLabore] = useState(0)
  const [expectedMonthlyOrders, setExpectedMonthlyOrders] = useState(1)
  const [loadingFinancial, setLoadingFinancial] = useState(false)

  const [fixedCosts, setFixedCosts] = useState(0)
  const [proLabore, setProLabore] = useState(0)
  const [expectedOrders, setExpectedOrders] = useState(100)
  const [loadingFin, setLoadingFin] = useState(false)

  const [baseShippingFee, setBaseShippingFee] = useState(0)
  const [costPerKm, setCostPerKm] = useState(0)
  const [storeAddress, setStoreAddress] = useState('')
  const [storeLat, setStoreLat] = useState<number | ''>('')
  const [storeLng, setStoreLng] = useState<number | ''>('')
  const [loadingLogistics, setLoadingLogistics] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)

  const handleFileUpload = async (
    file: File,
    folder: 'logos' | 'banners',
    setLoading: (loading: boolean) => void,
    setUrl: (url: string) => void,
  ) => {
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Formato de imagem inválido. Use JPG, PNG ou WEBP.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${organization?.id || 'org'}-${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('organization-assets').getPublicUrl(filePath)

      setUrl(data.publicUrl)
      toast({
        title: 'Upload concluído',
        description: 'Imagem enviada. Salve as alterações da loja.',
      })
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name)
      setOrgSlug(organization.slug || '')
      setLogoUrl((organization as any).logo_url || '')
      setBannerUrl((organization as any).banner_url || '')
    }
    if (profile) {
      setFullName(profile.full_name || '')
    }

    if (organization) {
      const loadLoyalty = async () => {
        const { data } = await supabase
          .from('loyalty_configs')
          .select('*')
          .eq('organization_id', organization.id)
          .maybeSingle()
        if (data) {
          setPointsPerCurrency(data.points_per_currency)
          setDiscountValuePerPoint(data.discount_value_per_point)
          setMaxDiscountPercentage(data.max_discount_percentage)
        }
      }
      const loadFin = async () => {
        const { data } = await supabase
          .from('organization_financial_settings')
          .select('*')
          .eq('organization_id', organization.id)
          .maybeSingle()
        if (data) {
          setFixedCosts(data.monthly_fixed_costs)
          setProLabore(data.monthly_pro_labore)
          setExpectedOrders(data.expected_monthly_orders)
        }
      }
      const loadLogistics = async () => {
        const { data } = await supabase
          .from('organization_logistics_settings')
          .select('*')
          .eq('organization_id', organization.id)
          .maybeSingle()
        if (data) {
          setBaseShippingFee(data.base_shipping_fee || 0)
          setCostPerKm(data.cost_per_km || 0)
          setStoreAddress(data.store_address || '')
          setStoreLat(data.store_lat || '')
          setStoreLng(data.store_lng || '')
        }
      }
      loadLoyalty()
      loadFin()
      loadLogistics()
    }
  }, [organization, profile])
  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setLoadingOrg(true)

    const safeSlug = orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const { error } = await supabase
      .from('organizations')
      .update({
        name: orgName,
        slug: safeSlug,
        logo_url: logoUrl,
        banner_url: bannerUrl,
      } as any)
      .eq('id', organization.id)

    setLoadingOrg(false)

    if (error) {
      toast({
        title: 'Erro ao atualizar loja',
        description: error.message.includes('unique constraint')
          ? 'Este slug já está em uso por outra loja.'
          : error.message,
        variant: 'destructive',
      })
    } else {
      setOrgSlug(safeSlug)
      toast({ title: 'Sucesso', description: 'Dados da loja atualizados.' })
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setLoadingProfile(true)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)

    setLoadingProfile(false)

    if (error) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso.' })
    }
  }

  const handleUpdateFinancial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setLoadingFinancial(true)

    const { data: existing } = await supabase
      .from('organization_financial_settings')
      .select('id')
      .eq('organization_id', organization.id)
      .maybeSingle()

    let error
    if (existing) {
      const res = await supabase
        .from('organization_financial_settings')
        .update({
          monthly_fixed_costs: monthlyFixedCosts,
          monthly_pro_labore: monthlyProLabore,
          expected_monthly_orders: expectedMonthlyOrders,
        })
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('organization_financial_settings').insert({
        organization_id: organization.id,
        monthly_fixed_costs: monthlyFixedCosts,
        monthly_pro_labore: monthlyProLabore,
        expected_monthly_orders: expectedMonthlyOrders,
      })
      error = res.error
    }

    setLoadingFinancial(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações financeiras salvas.' })
    }
  }

  const handleSearchAddress = async () => {
    if (!storeAddress) return
    setIsSearchingAddress(true)
    try {
      console.log(storeAddress)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(storeAddress)}`,
      )
      const data = await res.json()
      if (data && data.length > 0) {
        setStoreLat(parseFloat(data[0].lat))
        setStoreLng(parseFloat(data[0].lon))
        toast({
          title: 'Coordenadas encontradas',
          description: 'Latitude e Longitude atualizadas.',
        })
      } else {
        toast({
          title: 'Endereço não encontrado',
          description: 'Tente ser mais específico.',
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar o endereço.',
        variant: 'destructive',
      })
    } finally {
      setIsSearchingAddress(false)
    }
  }

  const handleUpdateLogistics = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setLoadingLogistics(true)

    const { data: existing } = await supabase
      .from('organization_logistics_settings')
      .select('id')
      .eq('organization_id', organization.id)
      .maybeSingle()

    const payload = {
      base_shipping_fee: baseShippingFee,
      cost_per_km: costPerKm,
      store_address: storeAddress,
      store_lat: storeLat === '' ? null : storeLat,
      store_lng: storeLng === '' ? null : storeLng,
    }

    let error
    if (existing) {
      const res = await supabase
        .from('organization_logistics_settings')
        .update(payload)
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('organization_logistics_settings').insert({
        organization_id: organization.id,
        ...payload,
      })
      error = res.error
    }
    setLoadingLogistics(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de logística salvas.' })
    }
  }

  const handleUpdateLoyalty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setLoadingLoyalty(true)

    const { data: existing } = await supabase
      .from('loyalty_configs')
      .select('id')
      .eq('organization_id', organization.id)
      .maybeSingle()

    let error
    if (existing) {
      const res = await supabase
        .from('loyalty_configs')
        .update({
          points_per_currency: pointsPerCurrency,
          discount_value_per_point: discountValuePerPoint,
          max_discount_percentage: maxDiscountPercentage,
        })
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('loyalty_configs').insert({
        organization_id: organization.id,
        points_per_currency: pointsPerCurrency,
        discount_value_per_point: discountValuePerPoint,
        max_discount_percentage: maxDiscountPercentage,
      })
      error = res.error
    }

    setLoadingLoyalty(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de fidelidade salvas.' })
    }
  }

  const handleUpdateFin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    setLoadingFin(true)

    const { data: existing } = await supabase
      .from('organization_financial_settings')
      .select('id')
      .eq('organization_id', organization.id)
      .maybeSingle()

    let error
    if (existing) {
      const res = await supabase
        .from('organization_financial_settings')
        .update({
          monthly_fixed_costs: fixedCosts,
          monthly_pro_labore: proLabore,
          expected_monthly_orders: expectedOrders,
        })
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('organization_financial_settings').insert({
        organization_id: organization.id,
        monthly_fixed_costs: fixedCosts,
        monthly_pro_labore: proLabore,
        expected_monthly_orders: expectedOrders,
      })
      error = res.error
    }

    setLoadingFin(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações financeiras salvas.' })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as preferências da sua conta e loja.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleUpdateOrg}>
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Loja</CardTitle>
              <CardDescription>Informações públicas da sua vitrine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nome da Loja</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgSlug">Slug (URL da Vitrine)</Label>
                <Input
                  id="orgSlug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Sua vitrine será acessível em: /vitrine/{orgSlug || '...'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Logo da Loja</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative h-20 w-20 rounded-xl border overflow-hidden bg-slate-50 shrink-0">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-xl border border-dashed flex items-center justify-center bg-slate-50 text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      key={`logo-input-${logoUrl}`}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="cursor-pointer"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'logos', setUploadingLogo, setLogoUrl)
                      }}
                    />
                    {uploadingLogo && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fazendo upload...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner da Loja</Label>
                <div className="space-y-4">
                  {bannerUrl ? (
                    <div className="relative h-32 w-full rounded-xl border overflow-hidden bg-slate-50">
                      <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-full rounded-xl border border-dashed flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs opacity-50">Sem banner</span>
                    </div>
                  )}
                  <div>
                    <Input
                      key={`banner-input-${bannerUrl}`}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="cursor-pointer"
                      disabled={uploadingBanner}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file)
                          handleFileUpload(file, 'banners', setUploadingBanner, setBannerUrl)
                      }}
                    />
                    {uploadingBanner && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fazendo upload...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingOrg}>
                {loadingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Loja
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleUpdateProfile}>
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Suas informações pessoais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Acesso</Label>
                <Input id="email" value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Perfil
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleUpdateLoyalty}>
          <Card>
            <CardHeader>
              <CardTitle>Fidelidade e Cashback</CardTitle>
              <CardDescription>Configure o programa de pontos da loja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ptsPerCurrency">Pontos ganhos por R$ 1 gasto</Label>
                <Input
                  id="ptsPerCurrency"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pointsPerCurrency}
                  onChange={(e) => setPointsPerCurrency(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discValue">Valor de desconto por ponto (R$)</Label>
                <Input
                  id="discValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValuePerPoint}
                  onChange={(e) => setDiscountValuePerPoint(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDisc">Limite máximo de desconto por pedido (%)</Label>
                <Input
                  id="maxDisc"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={maxDiscountPercentage}
                  onChange={(e) => setMaxDiscountPercentage(Number(e.target.value))}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingLoyalty}>
                {loadingLoyalty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Regras
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleUpdateFin}>
          <Card>
            <CardHeader>
              <CardTitle>Financeiro Avançado</CardTitle>
              <CardDescription>
                Configure seus custos fixos para visualizar a margem real dos seus produtos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fixedCosts">Custos Fixos Mensais (R$)</Label>
                <Input
                  id="fixedCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fixedCosts}
                  onChange={(e) => setFixedCosts(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">Ex: Aluguel, internet, sistemas.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proLabore">Pró-labore Desejado (R$)</Label>
                <Input
                  id="proLabore"
                  type="number"
                  step="0.01"
                  min="0"
                  value={proLabore}
                  onChange={(e) => setProLabore(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">O salário mensal do proprietário.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedOrders">Volume de Vendas Estimado (unidades/mês)</Label>
                <Input
                  id="expectedOrders"
                  type="number"
                  step="1"
                  min="1"
                  value={expectedOrders}
                  onChange={(e) => setExpectedOrders(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Usado para ratear os custos fixos por unidade vendida (overhead).
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingFin}>
                {loadingFin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Financeiro
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleUpdateLogistics}>
          <Card>
            <CardHeader>
              <CardTitle>Logística e Entregas</CardTitle>
              <CardDescription>
                Configure taxas e endereço base para cálculo de entregas por KM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseShippingFee">Taxa Base de Entrega (R$)</Label>
                <Input
                  id="baseShippingFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseShippingFee}
                  onChange={(e) => setBaseShippingFee(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPerKm">Custo Adicional por KM (R$)</Label>
                <Input
                  id="costPerKm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerKm}
                  onChange={(e) => setCostPerKm(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeAddress">Endereço Base da Loja (Ponto de Partida)</Label>
                <div className="flex gap-2">
                  <Input
                    id="storeAddress"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000, São Paulo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchAddress}
                    disabled={isSearchingAddress}
                  >
                    {isSearchingAddress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {storeLat !== '' && storeLng !== '' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordenadas salvas: {storeLat}, {storeLng}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingLogistics}>
                {loadingLogistics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                Logística
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
