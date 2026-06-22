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
import { Users, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function MasterUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          role,
          updated_at,
          organizations (
            id,
            name
          )
        `,
        )
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setUsers(data)
        setFilteredUsers(data)
      }
      setLoading(false)
    }

    loadUsers()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
      return
    }

    const lower = searchTerm.toLowerCase()
    const filtered = users.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(lower)) ||
        (u.organizations?.name && u.organizations.name.toLowerCase().includes(lower)) ||
        (u.role && u.role.toLowerCase().includes(lower)),
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Diretório de Usuários
          </h2>
          <p className="text-slate-500">
            Lista global de todos os usuários registrados na plataforma.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-slate-500" />
            Todos os Usuários
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar usuário ou org..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Papel (Role)</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium pl-6 text-slate-900">
                      {user.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.organizations?.name ? (
                        user.organizations.name
                      ) : (
                        <span className="text-slate-400 italic">Sem organização</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'destructive' : 'outline'}>
                        {user.role || 'member'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {user.id.substring(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
