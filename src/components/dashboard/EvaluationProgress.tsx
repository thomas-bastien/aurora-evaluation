import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface EvaluationStage {
  name: string;
  completed: number;
  total: number;
  status: "completed" | "active" | "pending";
}

export const EvaluationProgress = () => {
  const stages: EvaluationStage[] = [
    { name: "Initial Screening", completed: 100, total: 100, status: "completed" },
    { name: "Detailed Evaluation", completed: 67, total: 100, status: "active" },
    { name: "Final Selection", completed: 0, total: 30, status: "pending" },
    { name: "Pitch Sessions", completed: 0, total: 30, status: "pending" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-success-foreground";
      case "active": return "bg-primary text-primary-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">
          Evaluation Pipeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track progress through the evaluation stages
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {stages.map((stage, index) => {
          const progressPercentage = (stage.completed / stage.total) * 100;
          
          return (
            <div key={stage.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-foreground">{stage.name}</h4>
                  </div>
                  <Badge className={getStatusColor(stage.status)}>
                    {stage.status}
                  </Badge>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {stage.completed}/{stage.total}
                </span>
              </div>
              
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage.toFixed(0)}% complete</span>
                {stage.status === "active" && (
                  <span className="text-primary font-medium">In Progress</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};