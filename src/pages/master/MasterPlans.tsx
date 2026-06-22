import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, CreditCard } from 'lucide-react'

export default function MasterPlans() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const loadPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true })
    if (data) setPlans(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return

    try {
      const payload = {
        name: editingPlan.name,
        description: editingPlan.description,
        price: Number(editingPlan.price),
        max_products: Number(editingPlan.max_products),
        max_users: Number(editingPlan.max_users),
      }

      if (isCreating) {
        const { error } = await supabase.from('plans').insert([payload])
        if (error) throw error
      } else {
        const { error } = await supabase.from('plans').update(payload).eq('id', editingPlan.id)
        if (error) throw error
      }

      toast({ title: isCreating ? 'Plano criado com sucesso!' : 'Plano atualizado com sucesso!' })
      setEditingPlan(null)
      setIsCreating(false)
      loadPlans()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Gerenciamento de Planos
          </h2>
          <p className="text-slate-500">Crie e edite as opções de assinatura do SaaS.</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true)
            setEditingPlan({ name: '', price: 0, max_products: 0, max_users: 0 })
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <CreditCard className="w-5 h-5 text-slate-500" />
            Planos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Preço (R$)</TableHead>
                <TableHead>Lmt. Produtos</TableHead>
                <TableHead>Lmt. Usuários</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum plano encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium pl-6 text-slate-900">{plan.name}</TableCell>
                    <TableCell className="text-slate-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(plan.price)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {plan.max_products === -1 ? 'Ilimitado' : plan.max_products}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {plan.max_users === -1 ? 'Ilimitado' : plan.max_users}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsCreating(false)
                          setEditingPlan({ ...plan })
                        }}
                      >
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

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Novo Plano' : 'Editar Plano'}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lmt. Produtos (-1 ilimitado)</Label>
                  <Input
                    type="number"
                    value={editingPlan.max_products}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, max_products: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lmt. Usuários (-1 ilimitado)</Label>
                  <Input
                    type="number"
                    value={editingPlan.max_users}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_users: e.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
