import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Activity, Eye, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'

const PAGE_SIZE = 20

export default function MasterAuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    loadLogs()
  }, [page, debouncedSearch])

  async function loadLogs() {
    setLoading(true)
    let query = supabase
      .from('system_audit_logs')
      .select('*, organizations(name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (debouncedSearch) {
      query = query.or(`action.ilike.%${debouncedSearch}%,entity_type.ilike.%${debouncedSearch}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count } = await query

    if (data) {
      const userIds = [...new Set(data.map((l) => l.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.full_name
        return acc
      }, {})

      const enriched = data.map((l) => ({
        ...l,
        user_name: profileMap[l.user_id] || 'Sistema',
      }))
      setLogs(enriched)
      if (count !== null) setTotalCount(count)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Logs de Auditoria</h2>
          <p className="text-slate-500">Acompanhe todas as ações críticas realizadas no sistema.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Activity className="w-5 h-5 text-slate-500" />
            Registro de Eventos
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar ações ou entidades..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6">Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="text-right pr-6">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6 text-slate-600 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{log.user_name}</TableCell>
                    <TableCell className="text-slate-600">
                      {log.organizations?.name || 'Global'}
                    </TableCell>
                    <TableCell className="text-slate-600">{log.entity_type}</TableCell>
                    <TableCell className="text-slate-900 font-semibold text-xs">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalCount > 0 && (
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-slate-500">
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

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Modificação</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold">Antes (old_data)</Label>
                <ScrollArea className="h-[400px] w-full rounded-md border border-slate-200 bg-slate-950 p-4">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.old_data, null, 2) || 'N/A'}
                  </pre>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold">Depois (new_data)</Label>
                <ScrollArea className="h-[400px] w-full rounded-md border border-slate-200 bg-slate-950 p-4">
                  <pre className="text-xs text-blue-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.new_data, null, 2) || 'N/A'}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
