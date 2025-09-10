import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend = "neutral", 
  trendValue 
}: StatsCardProps) => {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-success";
      case "down": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card className="shadow-soft hover:shadow-brand transition-smooth transform hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground font-body">{title}</p>
            <p className="text-3xl font-bold text-foreground font-headline">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-body">{subtitle}</p>
            )}
            {trendValue && (
              <p className={`text-sm font-medium font-body ${getTrendColor()}`}>
                {trend === "up" && "↗"} {trend === "down" && "↘"} {trendValue}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center shadow-brand">
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};