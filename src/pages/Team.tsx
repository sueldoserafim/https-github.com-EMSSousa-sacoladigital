import { useState, useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Pencil, Trash2, Loader2, Search, MailQuestion } from 'lucide-react'

export default function Team() {
  const { profile, organization } = useAuth()
  const { toast } = useToast()

  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState<'none' | 'invite' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'member' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (organization?.id) fetchMembers()
  }, [organization?.id])

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organization!.id)
    setMembers(data || [])
    setLoading(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const nameMatch = (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      const emailMatch = (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      return nameMatch || emailMatch
    })
  }, [members, searchTerm])

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)
  const paginatedMembers = filteredMembers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { data, error } = await supabase.functions.invoke('invite-user', { body: formData })
    setIsSubmitting(false)

    if (error) {
      toast({
        title: 'Erro ao convidar membro',
        description: error?.message || 'Falha ao enviar convite.',
        variant: 'destructive',
      })
      return
    }

    setModalState('none')
    toast({
      title: 'Convite enviado!',
      description: 'O membro receberá um e-mail para acessar a conta.',
    })
    fetchMembers()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: formData.full_name, role: formData.role })
      .eq('id', editingId)
    setIsSubmitting(false)

    if (error) {
      toast({
        title: 'Erro ao atualizar membro',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: 'Membro atualizado', description: 'As alterações foram salvas com sucesso.' })
    setModalState('none')
    fetchMembers()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este membro da equipe?')) return
    const { error } = await supabase.from('profiles').update({ organization_id: null }).eq('id', id)
    if (error) {
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Membro removido', description: 'O usuário não tem mais acesso à loja.' })
      fetchMembers()
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os membros e convites da sua organização.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ email: '', full_name: '', role: 'member' })
            setModalState('invite')
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Membro
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status / Função</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Carregando membros...
                  </TableCell>
                </TableRow>
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {member.full_name || 'Usuário'}
                        {member.id === profile?.id && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                            Você
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.role === 'admin' && (
                          <span className="text-sm font-medium">Administrador</span>
                        )}
                        {member.role === 'seller' && (
                          <span className="text-sm font-medium">Vendedora</span>
                        )}
                        {member.role === 'super_admin' && (
                          <span className="text-sm font-medium">Super Admin</span>
                        )}
                        {member.role === 'member' && (
                          <span className="text-sm font-medium">Membro</span>
                        )}
                        {!member.updated_at && member.id !== profile?.id && (
                          <span className="inline-flex items-center text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-2">
                            <MailQuestion className="w-3 h-3 mr-1" />
                            Pendente
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(member.id)
                          setFormData({
                            email: member.email || '',
                            full_name: member.full_name || '',
                            role: member.role || 'member',
                          })
                          setModalState('edit')
                        }}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {member.id !== profile?.id && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(member.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalState !== 'none'} onOpenChange={(o) => !o && setModalState('none')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalState === 'invite' ? 'Convidar Novo Membro' : 'Editar Membro'}
            </DialogTitle>
            <DialogDescription>
              {modalState === 'invite'
                ? 'Enviaremos um e-mail com instruções para acessar a plataforma.'
                : 'Atualize as informações e permissões de acesso deste membro.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={modalState === 'invite' ? handleInvite : handleEdit}
            className="space-y-4"
          >
            {modalState === 'invite' && (
              <div className="space-y-2">
                <Label>E-mail do Membro</Label>
                <Input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                placeholder="Nome do usuário"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Função no Sistema</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro (Acesso Básico)</SelectItem>
                  <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="seller">Vendedora (Painel Restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalState('none')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {modalState === 'invite' ? 'Enviar Convite' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
