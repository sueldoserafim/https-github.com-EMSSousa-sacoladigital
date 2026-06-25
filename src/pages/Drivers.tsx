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
import { Pencil, Trash2, Plus, Loader2, Copy } from 'lucide-react'

const PAGE_SIZE = 20

export default function Drivers() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle_info: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean
    email: string
    password: string
  }>({ open: false, email: '', password: '' })
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (organization?.id) {
      fetchDrivers()
    }
  }, [organization?.id, page])

  const fetchDrivers = async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await supabase
      .from('drivers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error(error)
    }

    setDrivers(data || [])
    if (count !== null) setTotalCount(count)
    setLoading(false)
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
      if (editingId) {
        const { error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            phone: formData.phone,
            vehicle_info: formData.vehicle_info,
          })
          .eq('id', editingId)

        if (error) throw error
        toast({ title: 'Sucesso', description: 'Entregador atualizado.' })
        setModalOpen(false)
        fetchDrivers()
      } else {
        if (!formData.email) {
          throw new Error('Email é obrigatório para novo entregador')
        }

        const password = generatePassword()

        const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: password,
            full_name: formData.name,
            role: 'driver',
            organization_id: organization!.id,
          },
        })

        if (fnError) throw fnError
        if (fnData?.error) throw new Error(fnData.error)

        const userId = fnData.user.id

        const { error: driverError } = await supabase.from('drivers').insert([
          {
            organization_id: organization!.id,
            user_id: userId,
            name: formData.name,
            phone: formData.phone,
            vehicle_info: formData.vehicle_info,
            status: 'active',
          },
        ])

        if (driverError) throw driverError
        toast({ title: 'Sucesso', description: 'Entregador cadastrado com acesso ao sistema.' })

        setModalOpen(false)
        fetchDrivers()

        setCredentialsModal({
          open: true,
          email: formData.email,
          password: password,
        })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este entregador?')) return
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Removido', description: 'Entregador excluído com sucesso.' })
      fetchDrivers()
    }
  }

  const openNewModal = () => {
    setEditingId(null)
    setFormData({ name: '', email: '', phone: '', vehicle_info: '' })
    setModalOpen(true)
  }

  const openEditModal = (driver: any) => {
    setEditingId(driver.id)
    setFormData({
      name: driver.name,
      email: '',
      phone: driver.phone || '',
      vehicle_info: driver.vehicle_info || '',
    })
    setModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entregadores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua equipe de entregas e os acessos ao aplicativo.
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Entregador
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Status</TableHead>
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
              ) : drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Nenhum entregador cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone || '-'}</TableCell>
                    <TableCell>{driver.vehicle_info || '-'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(driver)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(driver.id)}>
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
            <DialogTitle>{editingId ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os dados do entregador.'
                : 'Cadastre um entregador. Ele receberá acesso ao portal de entregas.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                placeholder="Ex: João Silva"
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
                  placeholder="joao@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A senha será gerada automaticamente e exibida após a criação.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Veículo e Placa</Label>
              <Input
                placeholder="Ex: Moto Honda - ABC-1234"
                value={formData.vehicle_info}
                onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
              />
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
              Acesso gerado. Copie e envie para o entregador. A senha não será exibida novamente.
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
                  `Acesso ao Aplicativo\nEmail: ${credentialsModal.email}\nSenha: ${credentialsModal.password}`,
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
