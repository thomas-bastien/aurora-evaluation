import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MatchmakingConfigPanelProps {
  roundName: string;
}

export function MatchmakingConfigPanel({ roundName }: MatchmakingConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState({
    vertical_weight: 40,
    stage_weight: 20,
    region_weight: 20,
    thesis_weight: 10,
    load_penalty_weight: 10,
    target_jurors_per_startup: 3,
    top_k_per_juror: 3,
    use_ai_enhancement: true,
    deterministic_seed: null as number | null,
  });

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open, roundName]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matchmaking_config')
      .select('*')
      .eq('round_name', roundName)
      .single();

    if (error) {
      console.error('Error fetching config:', error);
    } else if (data) {
      setConfig({
        vertical_weight: Number(data.vertical_weight),
        stage_weight: Number(data.stage_weight),
        region_weight: Number(data.region_weight),
        thesis_weight: Number(data.thesis_weight),
        load_penalty_weight: Number(data.load_penalty_weight),
        target_jurors_per_startup: data.target_jurors_per_startup,
        top_k_per_juror: data.top_k_per_juror,
        use_ai_enhancement: data.use_ai_enhancement,
        deterministic_seed: data.deterministic_seed,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Validate weights sum to 100
    const totalWeight = 
      config.vertical_weight +
      config.stage_weight +
      config.region_weight +
      config.thesis_weight +
      config.load_penalty_weight;

    if (Math.abs(totalWeight - 100) > 0.01) {
      toast({
        title: "Invalid Weights",
        description: "Weights must sum to 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('matchmaking_config')
      .update(config)
      .eq('round_name', roundName);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Matchmaking configuration updated",
      });
      setOpen(false);
    }
    setLoading(false);
  };

  const totalWeight = 
    config.vertical_weight +
    config.stage_weight +
    config.region_weight +
    config.thesis_weight +
    config.load_penalty_weight;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configure Scoring
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matchmaking Configuration</DialogTitle>
          <DialogDescription>
            Adjust scoring weights and parameters for {roundName} round
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Scoring Weights (must sum to 100%)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vertical Match</Label>
                <Input
                  type="number"
                  value={config.vertical_weight}
                  onChange={(e) => setConfig({ ...config, vertical_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Stage Match</Label>
                <Input
                  type="number"
                  value={config.stage_weight}
                  onChange={(e) => setConfig({ ...config, stage_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Region Match</Label>
                <Input
                  type="number"
                  value={config.region_weight}
                  onChange={(e) => setConfig({ ...config, region_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Thesis/Keywords</Label>
                <Input
                  type="number"
                  value={config.thesis_weight}
                  onChange={(e) => setConfig({ ...config, thesis_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Load Penalty</Label>
                <Input
                  type="number"
                  value={config.load_penalty_weight}
                  onChange={(e) => setConfig({ ...config, load_penalty_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <p className={`text-sm mt-2 ${Math.abs(totalWeight - 100) > 0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>
              Total: {totalWeight}% {Math.abs(totalWeight - 100) > 0.01 && '(must be 100%)'}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Assignment Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Jurors per Startup</Label>
                <Input
                  type="number"
                  value={config.target_jurors_per_startup}
                  onChange={(e) => setConfig({ ...config, target_jurors_per_startup: Number(e.target.value) })}
                  min={1}
                  max={10}
                />
              </div>
              <div>
                <Label>Top K Suggestions per Juror</Label>
                <Input
                  type="number"
                  value={config.top_k_per_juror}
                  onChange={(e) => setConfig({ ...config, top_k_per_juror: Number(e.target.value) })}
                  min={1}
                  max={10}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Advanced Options</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Use AI Enhancement</Label>
                <Switch
                  checked={config.use_ai_enhancement}
                  onCheckedChange={(checked) => setConfig({ ...config, use_ai_enhancement: checked })}
                />
              </div>
              <div>
                <Label>Deterministic Seed (optional)</Label>
                <Input
                  type="number"
                  placeholder="Leave empty for random"
                  value={config.deterministic_seed || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    deterministic_seed: e.target.value ? Number(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set a seed for reproducible results across runs
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || Math.abs(totalWeight - 100) > 0.01}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
