import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Team() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
        <p className="text-gray-500 mt-1">Gerencie os membros da sua organização.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Membros Ativos</CardTitle>
          <CardDescription>Pessoas com acesso ao seu tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Gestão de equipe em desenvolvimento...</p>
        </CardContent>
      </Card>
    </div>
  )
}
