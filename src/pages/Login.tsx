import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { ShoppingBag, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Erro ao entrar', { description: error.message })
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md mx-auto px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary text-white p-2 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Sacola Digital</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bem-vinda de volta!</h1>
        <p className="text-muted-foreground text-center">
          Entre na sua conta para gerenciar sua loja.
        </p>
      </div>

      <Card className="w-full border shadow-sm rounded-2xl overflow-hidden bg-white/70 backdrop-blur-sm">
        <form onSubmit={handleLogin}>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-sm">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-accent/30 border-accent h-12 px-4 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-accent/30 border-accent h-12 pl-4 pr-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-2">
                <Link to="#" className="text-primary text-sm font-medium hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-8">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground text-center">
        Não tem conta?{' '}
        <Link to="/signup" className="text-primary font-semibold hover:underline">
          Cadastre-se
        </Link>
      </div>
    </div>
  )
}
