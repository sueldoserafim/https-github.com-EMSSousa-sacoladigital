import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, Settings as SettingsIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function Dashboard() {
  const { organization } = useAuth()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to {organization?.name || 'your workspace'}. Here's an overview of your
          store.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link to="/products">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage</div>
              <p className="text-xs text-muted-foreground">Create and manage variations and SKUs</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/team">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Members</div>
              <p className="text-xs text-muted-foreground">Manage your organization team</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Preferences</div>
              <p className="text-xs text-muted-foreground">Configure your account</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
