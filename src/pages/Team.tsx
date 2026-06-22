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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Pencil, Trash2, Loader2 } from 'lucide-react'

export default function Team() {
  const { profile, organization } = useAuth()
  const { toast } = useToast()

  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState<'none' | 'invite' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'member' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<{
    email: string
    password: string
    name: string
  } | null>(null)

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const password = generatePassword()
    const payload = { ...formData, password }

    const { data, error } = await supabase.functions.invoke('invite-user', { body: payload })
    setIsSubmitting(false)

    if (error || !data?.user) {
      toast({
        title: 'Erro ao convidar membro',
        description: error?.message || 'Falha ao enviar convite.',
        variant: 'destructive',
      })
      return
    }

    setModalState('none')
    setSuccessData({ email: formData.email, password, name: formData.full_name })
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
    <div className="space-y-6 max-w-4xl mx-auto py-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da sua organização.</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ email: '', full_name: '', role: 'member' })
            setModalState('invite')
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name || 'Usuário'}
                      {member.id === profile?.id && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Você
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.role === 'admin'
                        ? 'Administrador'
                        : member.role === 'seller'
                          ? 'Vendedora'
                          : 'Membro'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(member.id)
                          setFormData({
                            email: '',
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
        </CardContent>
      </Card>

      <Dialog open={modalState !== 'none'} onOpenChange={(o) => !o && setModalState('none')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalState === 'invite' ? 'Adicionar Membro' : 'Editar Membro'}
            </DialogTitle>
            <DialogDescription>
              {modalState === 'invite'
                ? 'Convide um novo membro para sua equipe.'
                : 'Atualize os dados e acesso do membro.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={modalState === 'invite' ? handleInvite : handleEdit}
            className="space-y-4"
          >
            {modalState === 'invite' && (
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="seller">Vendedora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalState('none')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!successData} onOpenChange={(o) => !o && setSuccessData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Membro Adicionado com Sucesso</DialogTitle>
            <DialogDescription>
              As credenciais de acesso para {successData?.name} foram geradas. Guarde a senha
              temporária, ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-mail:</Label>
              <Input readOnly value={successData?.email || ''} />
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária:</Label>
              <div className="flex gap-2">
                <Input readOnly value={successData?.password || ''} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(successData?.password || '')
                    toast({
                      title: 'Senha copiada!',
                      description: 'A senha foi copiada para a área de transferência.',
                    })
                  }}
                >
                  Copiar Senha
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessData(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
