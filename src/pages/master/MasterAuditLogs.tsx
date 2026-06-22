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
import { Activity, Eye, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function MasterAuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadLogs() {
      const { data } = await supabase
        .from('system_audit_logs')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(200)

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
      }
      setLoading(false)
    }
    loadLogs()
  }, [])

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.organizations?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
              placeholder="Buscar logs..."
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
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
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
                  <pre className="text-xs text-green-400 font-mono">
                    {JSON.stringify(selectedLog.old_data, null, 2) || 'N/A'}
                  </pre>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 font-semibold">Depois (new_data)</Label>
                <ScrollArea className="h-[400px] w-full rounded-md border border-slate-200 bg-slate-950 p-4">
                  <pre className="text-xs text-blue-400 font-mono">
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
