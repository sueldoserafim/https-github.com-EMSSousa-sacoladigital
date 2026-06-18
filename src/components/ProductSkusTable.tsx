import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Loader2, Save } from 'lucide-react'

export function ProductSkusTable({ skus, loading, onSkuChange, onSave }: any) {
  if (skus.length === 0) return null

  return (
    <Card className="mt-8 animate-fade-in">
      <CardHeader>
        <CardTitle>Generated SKUs</CardTitle>
        <CardDescription>
          Manage price overrides and individual stock for each variation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Code</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>Price Override</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku: any) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono text-xs">{sku.sku_code}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {sku.sku_attribute_values.map((v: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                        >
                          {v.attribute_options?.value}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Base Price"
                      value={sku.price_override === null ? '' : sku.price_override}
                      onChange={(e) => onSkuChange(sku.id, 'price_override', e.target.value)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={sku.stock}
                      onChange={(e) => onSkuChange(sku.id, 'stock', e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onSave} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save SKUs
        </Button>
      </CardFooter>
    </Card>
  )
}
