import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

export default function MasterOrganizations() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingOrg, setEditingOrg] = useState<any>(null)
  const { toast } = useToast()

  const loadOrgs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setOrganizations(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrgs()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg) return

    const { error } = await supabase
      .from('organizations')
      .update({
        name: editingOrg.name,
        slug: editingOrg.slug,
        plan_type: editingOrg.plan_type,
        whatsapp_number: editingOrg.whatsapp_number,
        description: editingOrg.description,
        logo_url: editingOrg.logo_url,
        banner_url: editingOrg.banner_url,
      })
      .eq('id', editingOrg.id)

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Organização atualizada com sucesso!' })
      setEditingOrg(null)
      loadOrgs()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Organizações</h2>
          <p className="text-slate-500">Gerencie os inquilinos e seus planos de assinatura.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Building2 className="w-5 h-5 text-slate-500" />
            Todos os Inquilinos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhuma organização encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium pl-6 text-slate-900">{org.name}</TableCell>
                    <TableCell className="text-slate-600">{org.slug}</TableCell>
                    <TableCell>
                      <Badge variant={org.plan_type === 'enterprise' ? 'default' : 'secondary'}>
                        {org.plan_type || 'basic'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{org.whatsapp_number || '-'}</TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(org.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" onClick={() => setEditingOrg({ ...org })}>
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Organização</DialogTitle>
          </DialogHeader>
          {editingOrg && (
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editingOrg.name}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={editingOrg.slug}
                    onChange={(e) => setEditingOrg({ ...editingOrg, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano de Assinatura</Label>
                  <Select
                    value={editingOrg.plan_type || 'basic'}
                    onValueChange={(val) => setEditingOrg({ ...editingOrg, plan_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={editingOrg.whatsapp_number || ''}
                    onChange={(e) =>
                      setEditingOrg({ ...editingOrg, whatsapp_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingOrg.description || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={editingOrg.logo_url || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, logo_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banner URL</Label>
                  <Input
                    value={editingOrg.banner_url || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, banner_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingOrg(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
