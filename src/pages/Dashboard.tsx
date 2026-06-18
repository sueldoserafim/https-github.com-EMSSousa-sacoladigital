import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Building, ShieldCheck } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  created_at: string
}

export default function Dashboard() {
  const { profile, organization } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCustomers(data)
      }
      setLoading(false)
    }

    fetchCustomers()
  }, [])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Bem-vindo, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          Visão geral da sua organização{' '}
          <span className="font-medium text-indigo-600">{organization?.name}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Organização Atual</CardTitle>
            <Building className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{organization?.name}</div>
            <p className="text-xs text-gray-500 mt-1">Tenant ID isolado via RLS</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
            <p className="text-xs text-gray-500 mt-1">Visíveis apenas para sua empresa</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100">
              Status de Segurança
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-indigo-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RLS Ativo</div>
            <p className="text-xs text-indigo-200 mt-1">Dados 100% isolados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Verificação de Isolamento (Tenant Verification)</CardTitle>
          <CardDescription>
            Estes dados são retornados diretamente do banco de dados. Devido às políticas de RLS
            (Row Level Security), você está visualizando exclusivamente os registros pertencentes ao{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-600">organization_id</code>{' '}
            vinculado ao seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Carregando dados...</div>
          ) : customers.length > 0 ? (
            <div className="rounded-md border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-right">Data de Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell className="text-right text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum cliente encontrado</h3>
              <p className="text-gray-500 max-w-sm mt-1">
                Sua organização ainda não possui dados de clientes cadastrados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
