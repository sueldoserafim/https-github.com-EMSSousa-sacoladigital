import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { CampaignsList } from '@/components/group-buying/CampaignsList'
import { NewCampaignModal } from '@/components/group-buying/NewCampaignModal'
import { ReserveModal } from '@/components/group-buying/ReserveModal'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function GroupBuying() {
  const { organization, user } = useAuth()
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isSeller, setIsSeller] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [reserveCampaign, setReserveCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = async () => {
    if (!organization?.id) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('group_buying_campaigns')
        .select(`
          *,
          product_skus ( sku_code, products ( name ) ),
          suppliers ( name ),
          group_buying_reservations ( seller_id, quantity )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const checkSeller = async () => {
    if (!organization?.id || !user?.id) return
    try {
      const { data } = await supabase
        .from('sellers')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setIsSeller(true)
        setSellerId(data.id)
      }
    } catch (e) {
      // Not a seller or error
    }
  }

  useEffect(() => {
    fetchCampaigns()
    checkSeller()
  }, [organization?.id, user?.id])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" /> Compras Coletivas
          </h1>
          <p className="text-muted-foreground mt-1">
            Agrupe demandas para alcançar metas de pedidos mínimos com fornecedores.
          </p>
        </div>
        {!isSeller && (
          <Button onClick={() => setIsNewModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Campanha
          </Button>
        )}
      </div>

      <CampaignsList
        campaigns={campaigns}
        loading={loading}
        isSeller={isSeller}
        sellerId={sellerId}
        onReserve={(c: any) => setReserveCampaign(c)}
        onRefresh={fetchCampaigns}
      />

      <NewCampaignModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        onSuccess={fetchCampaigns}
      />

      <ReserveModal
        campaign={reserveCampaign}
        sellerId={sellerId}
        onClose={() => setReserveCampaign(null)}
        onSuccess={fetchCampaigns}
      />
    </div>
  )
}
