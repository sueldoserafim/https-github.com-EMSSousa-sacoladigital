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
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingOrg, setEditingOrg] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    const [{ data: orgsData, error: orgsError }, { data: plansData }] = await Promise.all([
      supabase
        .from('organizations')
        .select('*, plans(name)')
        .order('created_at', { ascending: false }),
      supabase.from('plans').select('id, name'),
    ])

    if (orgsData) setOrganizations(orgsData)
    if (plansData) setPlans(plansData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg) return

    const { error } = await supabase
      .from('organizations')
      .update({
        name: editingOrg.name,
        slug: editingOrg.slug,
        whatsapp_number: editingOrg.whatsapp_number,
        description: editingOrg.description,
        logo_url: editingOrg.logo_url,
        banner_url: editingOrg.banner_url,
        plan_id: editingOrg.plan_id || null,
        subscription_status: editingOrg.subscription_status || 'trial',
        trial_ends_at: editingOrg.trial_ends_at || null,
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
      loadData()
    }
  }

  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return null
    const diff = new Date(dateString).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 3600 * 24))
    return days > 0 ? days : 0
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativo</Badge>
      case 'trial':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Atrasado</Badge>
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial Restante</TableHead>
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
                    <TableCell className="text-slate-600">
                      {org.plans?.name || org.plan_type || 'Nenhum'}
                    </TableCell>
                    <TableCell>{getStatusBadge(org.subscription_status || 'trial')}</TableCell>
                    <TableCell className="text-slate-600">
                      {org.subscription_status === 'trial' ? (
                        <span>{getDaysRemaining(org.trial_ends_at)} dias</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
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
            <form
              onSubmit={handleSave}
              className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto px-1"
            >
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
                    value={editingOrg.plan_id || ''}
                    onValueChange={(val) => setEditingOrg({ ...editingOrg, plan_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status da Assinatura</Label>
                  <Select
                    value={editingOrg.subscription_status || 'trial'}
                    onValueChange={(val) =>
                      setEditingOrg({ ...editingOrg, subscription_status: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="past_due">Atrasado</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fim do Período de Teste (Trial)</Label>
                  <Input
                    type="date"
                    value={editingOrg.trial_ends_at ? editingOrg.trial_ends_at.split('T')[0] : ''}
                    onChange={(e) =>
                      setEditingOrg({ ...editingOrg, trial_ends_at: e.target.value })
                    }
                  />
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
