import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Trash, Plus } from 'lucide-react'

export function ProductAttributesForm({
  attributes,
  onUpdateAttr,
  onRemoveAttr,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onAddAttr,
}: any) {
  return (
    <Card className="mt-8 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Attributes</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onAddAttr}>
          <Plus className="h-4 w-4 mr-2" /> Add Attribute
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {attributes.map((attr: any, i: number) => (
          <div key={i} className="border p-4 rounded-md space-y-4 bg-muted/20">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Attribute (e.g., Color)"
                value={attr.name}
                onChange={(e) => onUpdateAttr(i, e.target.value)}
                className="max-w-xs font-semibold"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRemoveAttr(i)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <div className="pl-4 space-y-3 border-l-2 border-primary/20">
              {attr.options.map((opt: any, j: number) => (
                <div key={j} className="flex items-center gap-2">
                  <Input
                    placeholder="Option Value (e.g., Red)"
                    value={opt.value}
                    onChange={(e) => onUpdateOption(i, j, e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveOption(i, j)}
                  >
                    <Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => onAddOption(i)}>
                <Plus className="h-4 w-4 mr-2" /> Add Option
              </Button>
            </div>
          </div>
        ))}
        {attributes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
            No attributes defined. Add one to generate variations.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
