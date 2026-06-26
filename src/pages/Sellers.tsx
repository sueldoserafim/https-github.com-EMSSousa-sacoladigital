import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Plus, Copy, Check, Loader2 } from 'lucide-react'

const PAGE_SIZE = 20

export default function Sellers() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', commission_rate: 0, email: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean
    email: string
    password: string
  }>({ open: false, email: '', password: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (organization?.id) {
      fetchSellers()
    }
  }, [organization?.id, page])

  const fetchSellers = async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count } = await supabase
      .from('sellers' as any)
      .select('*', { count: 'exact' })
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    setSellers(data || [])
    if (count !== null) setTotalCount(count)
    setLoading(false)
  }

  const generateSlug = (name: string) => {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Math.floor(Math.random() * 1000)
    )
  }

  const generatePassword = () => {
    const u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const l = 'abcdefghijklmnopqrstuvwxyz'
    const n = '0123456789'
    const s = '!@#$%^&*'
    const all = u + l + n + s
    return (
      u[Math.floor(Math.random() * u.length)] +
      l[Math.floor(Math.random() * l.length)] +
      n[Math.floor(Math.random() * n.length)] +
      s[Math.floor(Math.random() * s.length)] +
      Array.from({ length: 8 })
        .map(() => all[Math.floor(Math.random() * all.length)])
        .join('')
    )
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let slug = formData.slug.trim()
      if (!slug) slug = generateSlug(formData.name)

      if (editingId) {
        const payload = {
          name: formData.name,
          slug: slug,
          commission_rate: formData.commission_rate,
        }
        const { error } = await supabase
          .from('sellers' as any)
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Vendedora atualizada.' })
        setModalOpen(false)
        fetchSellers()
      } else {
        if (!formData.email) {
          throw new Error('Email é obrigatório para nova vendedora')
        }

        const password = generatePassword()

        const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: password,
            full_name: formData.name,
            role: 'seller',
            organization_id: organization!.id,
            entity_data: {
              //slug: slug,
              commission_rate: formData.commission_rate,
            },
          },
        })

        if (fnError) {
          let msg = fnError.message || 'Erro ao criar vendedora no servidor.'
          if ('context' in fnError) {
            try {
              const res = (fnError as any).context as Response
              const json = await res.clone().json()
              if (json?.message) msg = json.message
            } catch {
              /* intentionally ignored */
            }
          } else {
            const apiError = (fnError as any).error
            if (apiError?.message) msg = apiError.message
          }
          throw new Error(msg)
        }

        if (fnData?.error) {
          throw new Error(fnData.error)
        }

        toast({ title: 'Sucesso', description: 'Vendedora criada com sucesso.' })

        setModalOpen(false)
        fetchSellers()

        setCredentialsModal({
          open: true,
          email: formData.email,
          password: password,
        })
      }
    } catch (err: any) {
      const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta vendedora?')) return
    const { error } = await supabase
      .from('sellers' as any)
      .delete()
      .eq('id', id)
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Removida', description: 'Vendedora excluída com sucesso.' })
      fetchSellers()
    }
  }

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/vitrine/${organization?.slug}?ref=${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Copiado!', description: 'Link copiado para a área de transferência.' })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendedoras</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie links de indicação para sua equipe de vendas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setFormData({ name: '', slug: '', commission_rate: 0, email: '' })
            setModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Vendedora
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Identificador (Slug)</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Link de Indicação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : sellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Nenhuma vendedora cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>{seller.slug}</TableCell>
                    <TableCell>{seller.commission_rate || 0}%</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => copyLink(seller.slug, seller.id)}
                      >
                        {copiedId === seller.id ? (
                          <Check className="w-3 h-3 mr-2" />
                        ) : (
                          <Copy className="w-3 h-3 mr-2" />
                        )}
                        Copiar Link
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(seller.id)
                          setFormData({
                            name: seller.name,
                            slug: seller.slug,
                            commission_rate: seller.commission_rate || 0,
                            email: '',
                          })
                          setModalOpen(true)
                        }}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(seller.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalCount > 0 && (
            <div className="p-4 border-t flex items-center justify-between bg-white rounded-b-xl">
              <span className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, totalCount)} de{' '}
                {totalCount} registros
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * PAGE_SIZE >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Vendedora' : 'Nova Vendedora'}</DialogTitle>
            <DialogDescription>
              Crie um link exclusivo para atribuir vendas a esta vendedora.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                placeholder="Ex: Maria Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <Label>Email (para login)</Label>
                <Input
                  type="email"
                  required
                  placeholder="maria@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A senha será gerada automaticamente e exibida após a criação.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Taxa de Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={formData.commission_rate}
                onChange={(e) =>
                  setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Identificador na URL (Slug) - Opcional</Label>
              <Input
                placeholder="Ex: maria-silva"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Se vazio, será gerado automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={credentialsModal.open}
        onOpenChange={(open) =>
          !open && setCredentialsModal({ open: false, email: '', password: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuário criado com sucesso!</DialogTitle>
            <DialogDescription>
              Acesso gerado. Copie e envie para a vendedora. A senha não será exibida novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm">
                {credentialsModal.email}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Senha Temporária</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm">
                {credentialsModal.password}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCredentialsModal({ open: false, email: '', password: '' })}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Acesso ao Sistema\nEmail: ${credentialsModal.email}\nSenha: ${credentialsModal.password}`,
                )
                toast({
                  title: 'Copiado',
                  description: 'Credenciais copiadas para área de transferência.',
                })
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Credenciais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
