import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Activity, Trophy, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MasterDashboard() {
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalProducts: 0,
    activeSubs: 0,
    trials: 0,
    revMTD: 0,
  })
  const [topOrgs, setTopOrgs] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [orgsRes, usersRes, revRes, prodRes, logsRes] = await Promise.all([
          supabase.from('organizations').select('id, name, subscription_status'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase
            .from('financial_transactions')
            .select('amount, type, organization_id, created_at, organizations(name)'),
          supabase
            .from('vw_product_performance' as any)
            .select('product_id', { count: 'exact', head: true }),
          supabase
            .from('system_audit_logs')
            .select('*, organizations(name)')
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        let totalRev = 0
        let revMTD = 0
        const orgRevenue: Record<string, { name: string; rev: number }> = {}

        revRes.data
          ?.filter((t) => !['expense', 'Saída', 'debit'].includes(t.type || ''))
          .forEach((t) => {
            const amt = Number(t.amount || 0)
            totalRev += amt

            const tDate = new Date(t.created_at)
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
              revMTD += amt
            }

            if (t.organization_id) {
              if (!orgRevenue[t.organization_id]) {
                const orgName = (t.organizations as any)?.name || 'Desconhecido'
                orgRevenue[t.organization_id] = { name: orgName, rev: 0 }
              }
              orgRevenue[t.organization_id].rev += amt
            }
          })

        const top = Object.values(orgRevenue)
          .sort((a, b) => b.rev - a.rev)
          .slice(0, 5)

        const activeSubs =
          orgsRes.data?.filter((o) => o.subscription_status === 'active').length || 0
        const trials = orgsRes.data?.filter((o) => o.subscription_status === 'trial').length || 0

        setStats({
          totalOrgs: orgsRes.data?.length || 0,
          totalUsers: usersRes.count || 0,
          totalRevenue: totalRev,
          totalProducts: prodRes.count || 0,
          activeSubs,
          trials,
          revMTD,
        })
        setTopOrgs(top)
        setRecentLogs(logsRes.data || [])
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Assinaturas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.activeSubs}</div>
            <p className="text-xs text-slate-500">De {stats.totalOrgs} inquilinos</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Em Período de Teste
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.trials}</div>
            <p className="text-xs text-slate-500">Trials em andamento</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Receita MTD</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                stats.revMTD,
              )}
            </div>
            <p className="text-xs text-slate-500">Volume transacionado este mês</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
            <p className="text-xs text-slate-500">Perfis na plataforma</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top 5 Inquilinos (Volume)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topOrgs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhum dado transacional encontrado.
                </p>
              ) : (
                topOrgs.map((org, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-900">{org.name}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(org.rev)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Atividade Recente Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma atividade registrada.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-slate-900">
                        {log.action} - {log.entity_type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Org: {(log.organizations as any)?.name || 'N/A'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
