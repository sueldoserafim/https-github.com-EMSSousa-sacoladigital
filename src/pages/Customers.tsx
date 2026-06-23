import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Tag,
  FileText,
  ShoppingBag,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Label } from '@/components/ui/label'

const PAGE_SIZE = 20

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
  segment?: string
  is_unsubscribed?: boolean
  customer_tags?: { id: string; name: string }[]
}

interface TimelineEvent {
  id: string
  type: 'order' | 'note' | 'tag'
  date: Date
  data: any
}

interface CustomerWithOrders extends Customer {
  orders?: { created_at: string }[]
  inactivityStatus?: 'At Risk' | 'Inactive' | null
}

export default function Customers() {
  const { organization, profile } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<CustomerWithOrders[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSegmenting, setIsSegmenting] = useState(false)

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    is_unsubscribed: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  // Loyalty
  const [wallet, setWallet] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])

  // Note form
  const [noteContent, setNoteContent] = useState('')
  const [isNotePrivate, setIsNotePrivate] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Tag form
  const [newTag, setNewTag] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    fetchCustomers()
  }, [organization?.id, page, debouncedSearch])

  const fetchCustomers = async () => {
    if (!organization?.id) return
    try {
      setLoading(true)
      let query = supabase
        .from('customers')
        .select('*, customer_tags(id, name), orders(created_at)', { count: 'exact' })
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      if (count !== null) setTotalCount(count)

      const now = new Date()
      const formattedData = (data || []).map((c: any) => {
        let inactivityStatus = null
        if (c.orders && c.orders.length > 0) {
          const lastOrder = c.orders.reduce((latest: Date, o: any) => {
            const d = new Date(o.created_at)
            return d > latest ? d : latest
          }, new Date(0))

          const daysSinceLastOrder = (now.getTime() - lastOrder.getTime()) / (1000 * 3600 * 24)
          if (daysSinceLastOrder > 60) inactivityStatus = 'At Risk'
          else if (daysSinceLastOrder > 30) inactivityStatus = 'Inactive'
        }

        return { ...c, inactivityStatus }
      })

      setCustomers(formattedData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTimeline = async (customerId: string) => {
    setLoadingTimeline(true)
    try {
      const events: TimelineEvent[] = []

      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total, created_at, status')
        .eq('customer_id', customerId)

      if (orders) {
        orders.forEach((o) => {
          events.push({
            id: o.id,
            type: 'order',
            date: new Date(o.created_at),
            data: o,
          })
        })
      }

      const { data: notes } = await supabase
        .from('customer_notes')
        .select('id, content, is_private, created_at, author_id, profiles(full_name)')
        .eq('customer_id', customerId)

      if (notes) {
        notes.forEach((n) => {
          events.push({
            id: n.id,
            type: 'note',
            date: new Date(n.created_at),
            data: {
              ...n,
              author_name: n.profiles?.full_name || 'Usuário Desconhecido',
            },
          })
        })
      }

      const { data: tags } = await supabase
        .from('customer_tags')
        .select('id, name, created_at')
        .eq('customer_id', customerId)

      if (tags) {
        tags.forEach((t) => {
          events.push({
            id: t.id,
            type: 'tag',
            date: new Date(t.created_at),
            data: t,
          })
        })
      }

      events.sort((a, b) => b.date.getTime() - a.date.getTime())
      setTimeline(events)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTimeline(false)
    }
  }

  const loadLoyalty = async (customerId: string) => {
    if (!organization?.id) return
    const { data: w } = await supabase
      .from('loyalty_wallets')
      .select('*')
      .eq('customer_id', customerId)
      .eq('organization_id', organization.id)
      .maybeSingle()

    if (w) {
      setWallet(w)
      const { data: m } = await supabase
        .from('loyalty_point_movements')
        .select('*, orders(order_number)')
        .eq('wallet_id', w.id)
        .order('created_at', { ascending: false })
      setMovements(m || [])
    } else {
      setWallet(null)
      setMovements([])
    }
  }

  const handleOpenDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDetailsOpen(true)
    loadTimeline(customer.id)
    loadLoyalty(customer.id)
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !organization?.id || !profile?.id || !noteContent.trim()) return

    setIsAddingNote(true)
    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: selectedCustomer.id,
        organization_id: organization.id,
        author_id: profile.id,
        content: noteContent,
        is_private: isNotePrivate,
      })
      if (error) throw error

      toast({ title: 'Nota adicionada com sucesso' })
      setNoteContent('')
      setIsNotePrivate(false)
      loadTimeline(selectedCustomer.id)
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar nota', description: err.message, variant: 'destructive' })
    } finally {
      setIsAddingNote(false)
    }
  }

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !organization?.id || !newTag.trim()) return

    setIsAddingTag(true)
    try {
      const { error } = await supabase.from('customer_tags').insert({
        customer_id: selectedCustomer.id,
        organization_id: organization.id,
        name: newTag.trim(),
      })
      if (error) throw error

      toast({ title: 'Tag adicionada com sucesso' })
      setNewTag('')
      loadTimeline(selectedCustomer.id)
      fetchCustomers()
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar tag', description: err.message, variant: 'destructive' })
    } finally {
      setIsAddingTag(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('customer_tags').delete().eq('id', tagId)
      if (error) throw error
      toast({ title: 'Tag removida' })
      if (selectedCustomer) loadTimeline(selectedCustomer.id)
      fetchCustomers()
    } catch (err: any) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  const triggerSegmentation = async () => {
    setIsSegmenting(true)
    try {
      const { error } = await supabase.functions.invoke('segment-customers')
      if (error) throw error
      toast({ title: 'Segmentação atualizada com sucesso!' })
      fetchCustomers()
    } catch (err: any) {
      toast({ title: 'Erro na segmentação', description: err.message, variant: 'destructive' })
    } finally {
      setIsSegmenting(false)
    }
  }

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        is_unsubscribed: customer.is_unsubscribed || false,
      })
    } else {
      setEditingCustomer(null)
      setFormData({ name: '', email: '', phone: '', is_unsubscribed: false })
    }
    setIsCustomerModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id || !formData.name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            is_unsubscribed: formData.is_unsubscribed,
          })
          .eq('id', editingCustomer.id)
          .eq('organization_id', organization.id)

        if (error) throw error
        toast({ title: 'Cliente atualizado com sucesso' })
      } else {
        const { error } = await supabase.from('customers').insert({
          organization_id: organization.id,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
        })

        if (error) throw error
        toast({ title: 'Cliente adicionado com sucesso' })
      }
      setIsCustomerModalOpen(false)
      fetchCustomers()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar cliente', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId || !organization?.id) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteId)
        .eq('organization_id', organization.id)

      if (error) throw error
      toast({ title: 'Cliente removido com sucesso' })
      setDeleteId(null)
      fetchCustomers()
    } catch (err: any) {
      toast({ title: 'Erro ao remover cliente', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const getSegmentColor = (segment?: string) => {
    switch (segment) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Ativo':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Inativo':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Novo':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM & Clientes</h1>
          <p className="text-gray-500 mt-1">Gerencie clientes, notas e histórico de interações.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="outline" onClick={triggerSegmentation} disabled={isSegmenting}>
            {isSegmenting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar Segmentos
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64">
                  <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      No customers found
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Your customer base is currently empty. Add your first customer to get started.
                    </p>
                    <Button onClick={() => handleOpenModal()}>
                      <Plus className="w-4 h-4 mr-2" /> Add Customer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-2">
                      {customer.email || '-'}
                      {customer.is_unsubscribed && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Opt-out
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{customer.phone || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getSegmentColor(customer.segment)}>
                      {customer.segment || 'Novo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.inactivityStatus === 'At Risk' && (
                      <Badge
                        variant="destructive"
                        className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                      >
                        Em Risco
                      </Badge>
                    )}
                    {customer.inactivityStatus === 'Inactive' && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"
                      >
                        Inativo
                      </Badge>
                    )}
                    {!customer.inactivityStatus &&
                      customer.orders &&
                      customer.orders.length > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Ativo
                        </Badge>
                      )}
                    {(!customer.orders || customer.orders.length === 0) && (
                      <span className="text-xs text-gray-400">Sem pedidos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customer.customer_tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                      {(customer.customer_tags?.length || 0) > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{customer.customer_tags!.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDetails(customer)}
                        title="Ver CRM"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(customer)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(customer.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalCount > 0 && (
          <div className="p-4 border-t flex items-center justify-between">
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
      </div>

      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Altere as informações do cliente abaixo.'
                  : 'Preencha os dados do novo cliente.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              {editingCustomer && (
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="unsubscribed"
                    checked={formData.is_unsubscribed}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_unsubscribed: checked })
                    }
                  />
                  <Label htmlFor="unsubscribed" className="text-sm cursor-pointer flex flex-col">
                    <span>Cancelar Inscrição (LGPD)</span>
                    <span className="font-normal text-xs text-gray-500">
                      Cliente não receberá campanhas.
                    </span>
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente e todo seu
              histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader className="mb-6 border-b pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <SheetTitle className="text-2xl">{selectedCustomer.name}</SheetTitle>
                  <Badge variant="outline" className={getSegmentColor(selectedCustomer.segment)}>
                    {selectedCustomer.segment || 'Novo'}
                  </Badge>
                </div>
                <SheetDescription className="space-y-1">
                  <div className="flex flex-col gap-1 text-gray-600">
                    <span>Email: {selectedCustomer.email || 'Não informado'}</span>
                    <span>Telefone: {selectedCustomer.phone || 'Não informado'}</span>
                    <span>
                      Cliente desde:{' '}
                      {new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-6">
                  <TabsTrigger value="timeline">Histórico</TabsTrigger>
                  <TabsTrigger value="crm">CRM & Notas</TabsTrigger>
                  <TabsTrigger value="loyalty">Fidelidade</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                  {loadingTimeline ? (
                    <div className="py-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando histórico...
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">Nenhum evento registrado.</div>
                  ) : (
                    <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6">
                      {timeline.map((event) => (
                        <div key={`${event.type}-${event.id}`} className="relative">
                          <span className="absolute -left-10 bg-white p-1 rounded-full border border-gray-200">
                            {event.type === 'order' && (
                              <ShoppingBag className="w-4 h-4 text-blue-500" />
                            )}
                            {event.type === 'note' && (
                              <FileText className="w-4 h-4 text-amber-500" />
                            )}
                            {event.type === 'tag' && <Tag className="w-4 h-4 text-green-500" />}
                          </span>
                          <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                              <span className="font-medium flex items-center gap-1">
                                {event.type === 'order' && 'Novo Pedido'}
                                {event.type === 'note' && 'Nota Adicionada'}
                                {event.type === 'tag' && 'Tag Atribuída'}
                                {event.type === 'note' && event.data.is_private && (
                                  <Badge variant="secondary" className="ml-2 text-[10px]">
                                    Privada
                                  </Badge>
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {event.date.toLocaleDateString('pt-BR')} às{' '}
                                {event.date.toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-gray-800">
                              {event.type === 'order' && (
                                <div>
                                  <p>
                                    Pedido{' '}
                                    <span className="font-semibold">{event.data.order_number}</span>{' '}
                                    criado.
                                  </p>
                                  <p className="mt-1">
                                    Valor: R$ {Number(event.data.total).toFixed(2)} | Status:{' '}
                                    {event.data.status}
                                  </p>
                                </div>
                              )}
                              {event.type === 'note' && (
                                <div>
                                  <p className="whitespace-pre-wrap">{event.data.content}</p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Por: {event.data.author_name}
                                  </p>
                                </div>
                              )}
                              {event.type === 'tag' && (
                                <p>
                                  A tag{' '}
                                  <Badge variant="secondary" className="mx-1">
                                    {event.data.name}
                                  </Badge>{' '}
                                  foi adicionada.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="crm" className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Adicionar Nota</h3>
                    <form
                      onSubmit={handleAddNote}
                      className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100"
                    >
                      <div className="space-y-2">
                        <Label>Nota</Label>
                        <Textarea
                          placeholder="Digite os detalhes da interação..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="bg-white min-h-[100px]"
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="private-note"
                            checked={isNotePrivate}
                            onCheckedChange={setIsNotePrivate}
                          />
                          <Label
                            htmlFor="private-note"
                            className="text-sm cursor-pointer flex flex-col"
                          >
                            <span>Nota Privada</span>
                            <span className="font-normal text-xs text-gray-500">
                              Visível apenas para administradores.
                            </span>
                          </Label>
                        </div>
                        <Button type="submit" disabled={isAddingNote || !noteContent.trim()}>
                          {isAddingNote ? 'Salvando...' : 'Salvar Nota'}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Gerenciar Tags</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {timeline.filter((t) => t.type === 'tag').length === 0 && (
                        <span className="text-sm text-gray-500">Nenhuma tag atribuída.</span>
                      )}
                      {timeline
                        .filter((t) => t.type === 'tag')
                        .map((tagEvent) => (
                          <Badge
                            key={tagEvent.id}
                            variant="secondary"
                            className="pl-2 pr-1 py-1 flex items-center gap-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            {tagEvent.data.name}
                            <button
                              onClick={() => handleRemoveTag(tagEvent.id)}
                              className="text-blue-400 hover:text-blue-900 rounded-full p-0.5"
                              title="Remover tag"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                    <form onSubmit={handleAddTag} className="flex gap-2">
                      <Input
                        placeholder="Nova tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="max-w-[200px]"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={isAddingTag || !newTag.trim()}
                      >
                        Adicionar
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                    <h3 className="text-sm font-medium text-primary mb-1">Saldo de Pontos</h3>
                    <div className="text-4xl font-extrabold text-primary">
                      {wallet?.balance || 0}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Histórico de Pontos</h3>
                    {movements.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4">
                        Nenhuma movimentação registrada.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {movements.map((m) => (
                          <div
                            key={m.id}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {m.type === 'earn' ? 'Acúmulo' : 'Resgate'}
                                {m.orders?.order_number && ` (Pedido ${m.orders.order_number})`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(m.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <div
                              className={`font-bold ${m.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {m.type === 'earn' ? '+' : '-'}
                              {m.amount} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
