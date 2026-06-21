import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { Plus, Send, Loader2, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  segment: string | null
  status: string
  sent_at: string | null
  total_recipients: number
  created_at: string
}

export default function Campaigns() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const [segments, setSegments] = useState<string[]>([])
  const [formData, setFormData] = useState({ name: '', subject: '', content: '', segment: 'all' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCampaigns = async () => {
    if (!organization?.id) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar campanhas',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSegments = async () => {
    if (!organization?.id) return
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('segment')
        .eq('organization_id', organization.id)
        .not('segment', 'is', null)

      if (error) throw error
      const uniqueSegments = Array.from(new Set(data.map((d) => d.segment))).filter(
        Boolean,
      ) as string[]
      setSegments(uniqueSegments)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchSegments()
  }, [organization?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('marketing_campaigns').insert({
        organization_id: organization.id,
        name: formData.name,
        subject: formData.subject,
        content: formData.content,
        segment: formData.segment === 'all' ? null : formData.segment,
        status: 'draft',
      })

      if (error) throw error
      toast({ title: 'Campanha criada com sucesso' })
      setIsSheetOpen(false)
      setFormData({ name: '', subject: '', content: '', segment: 'all' })
      fetchCampaigns()
    } catch (err: any) {
      toast({ title: 'Erro ao criar campanha', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSend = async (campaignId: string) => {
    if (!confirm('Deseja realmente enviar esta campanha agora? Esta ação não pode ser desfeita.'))
      return

    setSendingId(campaignId)
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-campaign', {
        body: { campaignId },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast({
        title: 'Campanha enviada com sucesso!',
        description: `Foram enviados ${data?.sentCount || 0} e-mails.`,
      })
      fetchCampaigns()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar campanha',
        description: err.message || 'Verifique o limite do seu plano ou tente novamente.',
        variant: 'destructive',
      })
      fetchCampaigns()
    } finally {
      setSendingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <FileText className="w-3 h-3 mr-1" /> Rascunho
          </Badge>
        )
      case 'sending':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Falhou
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas de Marketing</h1>
          <p className="text-gray-500 mt-1">
            Crie e gerencie disparos de e-mail para seus clientes.
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destinatários</TableHead>
              <TableHead>Data de Envio</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Carregando campanhas...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhuma campanha encontrada. Crie sua primeira campanha!
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.subject}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {c.segment || 'Todos os Clientes'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell>{c.status === 'draft' ? '-' : c.total_recipients}</TableCell>
                  <TableCell>
                    {c.sent_at ? (
                      <span className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(c.sent_at).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSend(c.id)}
                        disabled={sendingId === c.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        {sendingId === c.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar Agora
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Nova Campanha</SheetTitle>
            <SheetDescription>
              Configure o e-mail que será disparado para seus clientes.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>Nome Interno da Campanha</Label>
              <Input
                placeholder="Ex: Promoção Dia das Mães"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Assunto do E-mail</Label>
              <Input
                placeholder="Ex: Presentes especiais com 20% OFF!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Segmento Alvo</Label>
              <Select
                value={formData.segment}
                onValueChange={(v) => setFormData({ ...formData, segment: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {segments.map((seg) => (
                    <SelectItem key={seg} value={seg}>
                      {seg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Clientes que solicitaram opt-out (LGPD) serão automaticamente removidos do envio.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do E-mail (Editor Visual / Texto)</Label>
              <Textarea
                placeholder="Olá! Temos novidades para você..."
                className="min-h-[250px] font-sans"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">
                Você pode usar texto simples. O link de cancelamento de inscrição (Unsubscribe) será
                adicionado automaticamente ao final do e-mail.
              </p>
            </div>

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar como Rascunho'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
