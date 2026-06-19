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
import { Loader2, X, ImageIcon } from 'lucide-react'

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
      </div>
    </div>
  )
}
