import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClearAll: () => void;
  children: ReactNode;
  activeFilters: { label: string; value: string; onRemove: () => void }[];
}

export function FilterPanel({ 
  isOpen, 
  onOpenChange, 
  onClearAll, 
  children, 
  activeFilters 
}: FilterPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">Filters</h3>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        {children}
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2 flex-wrap">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {filter.label}: {filter.value}
                <button onClick={filter.onRemove}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}