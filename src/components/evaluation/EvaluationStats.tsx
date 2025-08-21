import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  Star
} from "lucide-react";

interface EvaluationStatsProps {
  stats: {
    total: number;
    completed: number;
    draft: number;
    notStarted: number;
    averageScore: number;
  };
}

export const EvaluationStats = ({ stats }: EvaluationStatsProps) => {
  const statCards = [
    {
      title: "Total Assigned",
      value: stats.total.toString(),
      subtitle: "Startups assigned to you",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Completed",
      value: stats.completed.toString(),
      subtitle: "Evaluations submitted",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "In Progress",
      value: stats.draft.toString(),
      subtitle: "Draft evaluations",
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Not Started",
      value: stats.notStarted.toString(),
      subtitle: "Pending evaluations",
      icon: TrendingUp,
      color: "text-gray-600"
    },
    {
      title: "Average Score",
      value: stats.averageScore > 0 ? stats.averageScore.toFixed(1) : "0.0",
      subtitle: "Out of 10.0",
      icon: Star,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};