import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Users, DollarSign, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function MasterDashboard() {
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalProducts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [orgsRes, usersRes, revRes, prodRes] = await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('financial_transactions').select('amount, type'),
          supabase
            .from('vw_product_performance' as any)
            .select('product_id', { count: 'exact', head: true }),
        ])

        const totalRev =
          revRes.data
            ?.filter((t) => !['expense', 'Saída', 'debit'].includes(t.type || ''))
            .reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0

        setStats({
          totalOrgs: orgsRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalRevenue: totalRev,
          totalProducts: prodRes.count || 0,
        })
      } catch (error) {
        console.error('Error loading master stats', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral do Sistema</h2>
        <p className="text-slate-500">Métricas globais de toda a infraestrutura SaaS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total de Organizações
            </CardTitle>
            <Building className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalOrgs}</div>
            <p className="text-xs text-slate-500">Inquilinos registrados</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
            <p className="text-xs text-slate-500">Perfis em toda a plataforma</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Volume Transacionado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.totalRevenue)}
            </div>
            <p className="text-xs text-slate-500">Receita bruta global do SaaS</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Produtos Cadastrados
            </CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalProducts}</div>
            <p className="text-xs text-slate-500">Total no catálogo global</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
