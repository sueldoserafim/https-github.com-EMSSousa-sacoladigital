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
import { Pencil, Trash2, Plus, Copy, Check } from 'lucide-react'

export default function Sellers() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (organization?.id) fetchSellers()
  }, [organization?.id])

  const fetchSellers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sellers' as any)
      .select('*')
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })

    setSellers(data || [])
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    let slug = formData.slug.trim()
    if (!slug) slug = generateSlug(formData.name)

    const payload = {
      name: formData.name,
      slug: slug,
      organization_id: organization!.id,
    }

    let error
    if (editingId) {
      const res = await supabase
        .from('sellers' as any)
        .update(payload)
        .eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('sellers' as any).insert([payload])
      error = res.error
    }

    setIsSubmitting(false)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      return
    }

    toast({
      title: 'Sucesso',
      description: editingId ? 'Vendedora atualizada.' : 'Vendedora cadastrada.',
    })
    setModalOpen(false)
    fetchSellers()
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
            setFormData({ name: '', slug: '' })
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
                <TableHead>Link de Indicação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : sellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhuma vendedora cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>{seller.slug}</TableCell>
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
                          setFormData({ name: seller.name, slug: seller.slug })
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
              <Label>Nome</Label>
              <Input
                required
                placeholder="Ex: Maria Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
