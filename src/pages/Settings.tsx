import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-gray-500 mt-1">Gerencie as preferências da sua conta e organização.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Configurações de perfil em desenvolvimento...</p>
        </CardContent>
      </Card>
    </div>
  )
}
