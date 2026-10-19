import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Workflow, Plus, Play, Loader2, Edit } from 'lucide-react'

interface Automation {
  id: string
  name: string
  trigger_type: string
  delay_days: number
  subject: string
  content: string
  is_active: boolean
}

export default function Automations() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [runningRetention, setRunningRetention] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'order_completed',
    delay_days: 1,
    subject: '',
    content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchAutomations = async () => {
    if (!organization?.id) return
    try {
      const { data, error } = await (supabase as any)
        .from('marketing_automations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setAutomations(data || [])
    } catch (err: any) {
      toast({ title: 'Erro ao carregar automações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAutomations()
  }, [organization?.id])

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_automations' as any)
        .update({ is_active: !current })
        .eq('id', id)
      if (error) throw error
      setAutomations(automations.map((a) => (a.id === id ? { ...a, is_active: !current } : a)))
      toast({ title: 'Status atualizado' })
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id) return

    setIsSubmitting(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('marketing_automations' as any)
          .update(formData)
          .eq('id', editingId)
        if (error) throw error
        toast({ title: 'Automação atualizada' })
      } else {
        const { error } = await supabase.from('marketing_automations' as any).insert({
          organization_id: organization.id,
          ...formData,
          is_active: false,
        })
        if (error) throw error
        toast({ title: 'Automação criada' })
      }
      setIsDialogOpen(false)
      fetchAutomations()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openNew = () => {
    setEditingId(null)
    setFormData({
      name: '',
      trigger_type: 'order_completed',
      delay_days: 1,
      subject: '',
      content: '',
    })
    setIsDialogOpen(true)
  }

  const openEdit = (auto: Automation) => {
    setEditingId(auto.id)
    setFormData({
      name: auto.name,
      trigger_type: auto.trigger_type,
      delay_days: auto.delay_days,
      subject: auto.subject,
      content: auto.content,
    })
    setIsDialogOpen(true)
  }

  const handleRunRetention = async () => {
    if (!organization?.id) return
    setRunningRetention(true)
    try {
      // 1. Update segments logic from the edge function
      await supabase.functions.invoke('segment-customers')

      // 2. Fetch active inactive automations
      const activeRetention = automations.find(
        (a) => a.trigger_type === 'customer_inactive' && a.is_active,
      )
      if (!activeRetention) {
        toast({ title: 'Nenhuma automação de retenção ativa encontrada.' })
        return
      }

      // 3. Create campaign for "Inativo" segment
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert({
          organization_id: organization.id,
          name: `[Automação] ${activeRetention.name} - ${new Date().toLocaleDateString()}`,
          subject: activeRetention.subject,
          content: activeRetention.content,
          segment: 'Inativo',
          status: 'draft',
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // 4. Send campaign using edge function
      const { error: sendError } = await supabase.functions.invoke('send-marketing-campaign', {
        body: { campaignId: campaign.id },
      })

      if (sendError) throw sendError

      toast({ title: 'Fluxo de Retenção executado com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro ao executar fluxo', description: err.message, variant: 'destructive' })
    } finally {
      setRunningRetention(false)
    }
  }

  const getTriggerLabel = (type: string) => {
    return type === 'order_completed' ? 'Pedido Concluído' : 'Cliente Inativo'
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automação de Marketing</h1>
          <p className="text-gray-500 mt-1">
            Configure e-mails automáticos baseados no comportamento dos clientes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRunRetention} disabled={runningRetention}>
            {runningRetention ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Rodar Retenção
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Automação
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((auto) => (
            <Card key={auto.id} className={!auto.is_active ? 'opacity-75 bg-muted/50' : ''}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{auto.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Gatilho: {getTriggerLabel(auto.trigger_type)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={() => handleToggle(auto.id, auto.is_active)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pb-4 text-sm text-gray-600 line-clamp-3">
                <p>
                  <strong>Assunto:</strong> {auto.subject}
                </p>
                <p className="mt-2 text-xs truncate max-w-full block">{auto.content}</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end border-t border-border/50 mt-4 px-6 py-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(auto)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </CardFooter>
            </Card>
          ))}
          {automations.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma automação configurada.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
            <DialogDescription>
              Configure a regra de disparo e a mensagem a ser enviada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Automação</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Boas-vindas Pós Compra"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_completed">Pedido Concluído (Entregue)</SelectItem>
                  <SelectItem value="customer_inactive">Cliente Inativo (Sem compras)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_type === 'customer_inactive' && (
              <div className="space-y-2">
                <Label>Dias de inatividade</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.delay_days}
                  onChange={(e) =>
                    setFormData({ ...formData, delay_days: parseInt(e.target.value) || 1 })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  O sistema segmenta clientes como inativos após mais de 30-90 dias.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Assunto do E-mail</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Obrigado pela sua compra!"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Conteúdo (Aceita {'{{customer_name}}'} e {'{{order_number}}'})
              </Label>
              <Textarea
                className="h-32"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Olá {{customer_name}}, seu pedido {{order_number}} foi concluído..."
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
