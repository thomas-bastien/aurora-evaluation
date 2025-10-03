import { useState, useEffect } from "react";
import { Settings, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MatchmakingConfig {
  vertical_weight: number;
  stage_weight: number;
  region_weight: number;
  thesis_weight: number;
  load_penalty_weight: number;
  target_jurors_per_startup: number;
  top_k_per_juror: number;
  use_ai_enhancement: boolean;
  deterministic_seed: number | null;
  updated_at?: string;
}

const DEFAULT_CONFIG: MatchmakingConfig = {
  vertical_weight: 40,
  stage_weight: 20,
  region_weight: 20,
  thesis_weight: 10,
  load_penalty_weight: 10,
  target_jurors_per_startup: 3,
  top_k_per_juror: 3,
  use_ai_enhancement: true,
  deterministic_seed: null,
};

export function MatchmakingConfigCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeRound, setActiveRound] = useState<'screening' | 'pitching'>('screening');
  
  const [screeningConfig, setScreeningConfig] = useState<MatchmakingConfig>(DEFAULT_CONFIG);
  const [pitchingConfig, setPitchingConfig] = useState<MatchmakingConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    
    // Fetch screening config
    const { data: screeningData, error: screeningError } = await supabase
      .from('matchmaking_config')
      .select('*')
      .eq('round_name', 'screening')
      .single();

    if (screeningError) {
      console.error('Error fetching screening config:', screeningError);
    } else if (screeningData) {
      setScreeningConfig({
        vertical_weight: Number(screeningData.vertical_weight),
        stage_weight: Number(screeningData.stage_weight),
        region_weight: Number(screeningData.region_weight),
        thesis_weight: Number(screeningData.thesis_weight),
        load_penalty_weight: Number(screeningData.load_penalty_weight),
        target_jurors_per_startup: screeningData.target_jurors_per_startup,
        top_k_per_juror: screeningData.top_k_per_juror,
        use_ai_enhancement: screeningData.use_ai_enhancement,
        deterministic_seed: screeningData.deterministic_seed,
        updated_at: screeningData.updated_at,
      });
    }

    // Fetch pitching config
    const { data: pitchingData, error: pitchingError } = await supabase
      .from('matchmaking_config')
      .select('*')
      .eq('round_name', 'pitching')
      .single();

    if (pitchingError) {
      console.error('Error fetching pitching config:', pitchingError);
    } else if (pitchingData) {
      setPitchingConfig({
        vertical_weight: Number(pitchingData.vertical_weight),
        stage_weight: Number(pitchingData.stage_weight),
        region_weight: Number(pitchingData.region_weight),
        thesis_weight: Number(pitchingData.thesis_weight),
        load_penalty_weight: Number(pitchingData.load_penalty_weight),
        target_jurors_per_startup: pitchingData.target_jurors_per_startup,
        top_k_per_juror: pitchingData.top_k_per_juror,
        use_ai_enhancement: pitchingData.use_ai_enhancement,
        deterministic_seed: pitchingData.deterministic_seed,
        updated_at: pitchingData.updated_at,
      });
    }
    
    setLoading(false);
  };

  const handleSave = async (roundName: 'screening' | 'pitching') => {
    const config = roundName === 'screening' ? screeningConfig : pitchingConfig;
    
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
        description: `Failed to save ${roundName} configuration`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${roundName.charAt(0).toUpperCase() + roundName.slice(1)} configuration updated`,
      });
      fetchConfigs(); // Refresh to get updated timestamp
    }
    setLoading(false);
  };

  const handleReset = (roundName: 'screening' | 'pitching') => {
    if (roundName === 'screening') {
      setScreeningConfig(DEFAULT_CONFIG);
    } else {
      setPitchingConfig(DEFAULT_CONFIG);
    }
    toast({
      title: "Reset to Defaults",
      description: `${roundName.charAt(0).toUpperCase() + roundName.slice(1)} configuration reset to default values`,
    });
  };

  const renderConfigForm = (
    config: MatchmakingConfig, 
    setConfig: React.Dispatch<React.SetStateAction<MatchmakingConfig>>,
    roundName: 'screening' | 'pitching'
  ) => {
    const totalWeight = 
      config.vertical_weight +
      config.stage_weight +
      config.region_weight +
      config.thesis_weight +
      config.load_penalty_weight;

    return (
      <div className="space-y-6">
        {/* Scoring Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              🎯 Scoring Weights
            </CardTitle>
            <CardDescription>
              Adjust how each factor contributes to match scoring (must sum to 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-vertical`}>Vertical Match (%)</Label>
                <Input
                  id={`${roundName}-vertical`}
                  type="number"
                  value={config.vertical_weight}
                  onChange={(e) => setConfig({ ...config, vertical_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-stage`}>Stage Match (%)</Label>
                <Input
                  id={`${roundName}-stage`}
                  type="number"
                  value={config.stage_weight}
                  onChange={(e) => setConfig({ ...config, stage_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-region`}>Region Match (%)</Label>
                <Input
                  id={`${roundName}-region`}
                  type="number"
                  value={config.region_weight}
                  onChange={(e) => setConfig({ ...config, region_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-thesis`}>Thesis/Keywords (%)</Label>
                <Input
                  id={`${roundName}-thesis`}
                  type="number"
                  value={config.thesis_weight}
                  onChange={(e) => setConfig({ ...config, thesis_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-load`}>Load Penalty (%)</Label>
                <Input
                  id={`${roundName}-load`}
                  type="number"
                  value={config.load_penalty_weight}
                  onChange={(e) => setConfig({ ...config, load_penalty_weight: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div className={`text-sm font-semibold ${Math.abs(totalWeight - 100) > 0.01 ? 'text-destructive' : 'text-primary'}`}>
              Total: {totalWeight}% {Math.abs(totalWeight - 100) > 0.01 ? '❌ (must be 100%)' : '✓'}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              ⚙️ Assignment Parameters
            </CardTitle>
            <CardDescription>
              Configure how many jurors are assigned per startup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-target`}>Target Jurors per Startup</Label>
                <Input
                  id={`${roundName}-target`}
                  type="number"
                  value={config.target_jurors_per_startup}
                  onChange={(e) => setConfig({ ...config, target_jurors_per_startup: Number(e.target.value) })}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  How many jurors should evaluate each startup
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${roundName}-topk`}>Top K Suggestions per Juror</Label>
                <Input
                  id={`${roundName}-topk`}
                  type="number"
                  value={config.top_k_per_juror}
                  onChange={(e) => setConfig({ ...config, top_k_per_juror: Number(e.target.value) })}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  Top matches shown for each juror
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              🧪 Advanced Options
            </CardTitle>
            <CardDescription>
              AI enhancement and reproducibility settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`${roundName}-ai`}>Use AI Enhancement</Label>
                <p className="text-xs text-muted-foreground">
                  Enable AI-powered contextual matching
                </p>
              </div>
              <Switch
                id={`${roundName}-ai`}
                checked={config.use_ai_enhancement}
                onCheckedChange={(checked) => setConfig({ ...config, use_ai_enhancement: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${roundName}-seed`}>Deterministic Seed (optional)</Label>
              <Input
                id={`${roundName}-seed`}
                type="number"
                placeholder="Leave empty for random"
                value={config.deterministic_seed || ''}
                onChange={(e) => setConfig({ 
                  ...config, 
                  deterministic_seed: e.target.value ? Number(e.target.value) : null 
                })}
              />
              <p className="text-xs text-muted-foreground">
                Set a seed for reproducible results across runs
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            {config.updated_at && `Last updated: ${new Date(config.updated_at).toLocaleString()}`}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleReset(roundName)}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button 
              onClick={() => handleSave(roundName)}
              disabled={loading || Math.abs(totalWeight - 100) > 0.01}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Matchmaking Scoring Configuration
        </CardTitle>
        <CardDescription>
          Configure scoring weights and parameters for the matchmaking algorithm.
          These settings control how jurors are matched with startups based on vertical, stage, region, and other factors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRound} onValueChange={(v) => setActiveRound(v as 'screening' | 'pitching')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="screening">Screening Round</TabsTrigger>
            <TabsTrigger value="pitching">Pitching Round</TabsTrigger>
          </TabsList>
          
          <TabsContent value="screening" className="mt-6">
            {renderConfigForm(screeningConfig, setScreeningConfig, 'screening')}
          </TabsContent>
          
          <TabsContent value="pitching" className="mt-6">
            {renderConfigForm(pitchingConfig, setPitchingConfig, 'pitching')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
