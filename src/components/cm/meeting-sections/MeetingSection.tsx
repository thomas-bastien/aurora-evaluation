import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode } from "react";

interface MeetingSectionProps {
  title: string;
  description: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

const VARIANT_STYLES = {
  default: 'border-border',
  warning: 'border-yellow-200',
  danger: 'border-red-200',
  success: 'border-green-200'
};

const VARIANT_TITLE_STYLES = {
  default: 'text-foreground',
  warning: 'text-yellow-700',
  danger: 'text-red-700',
  success: 'text-green-700'
};

export const MeetingSection = ({
  title,
  description,
  count,
  isOpen,
  onToggle,
  children,
  variant = 'default'
}: MeetingSectionProps) => {
  if (count === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={VARIANT_STYLES[variant]}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`${VARIANT_TITLE_STYLES[variant]} flex items-center gap-2`}>
                  {title} ({count} items)
                  {isOpen ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CardTitle>
                <CardDescription>
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};