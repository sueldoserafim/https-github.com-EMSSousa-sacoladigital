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
import { Loader2 } from 'lucide-react'

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
                <Label htmlFor="logoUrl">Logo da Loja (URL)</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerUrl">Banner da Loja (URL)</Label>
                <Input
                  id="bannerUrl"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://exemplo.com/banner.png"
                />
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
