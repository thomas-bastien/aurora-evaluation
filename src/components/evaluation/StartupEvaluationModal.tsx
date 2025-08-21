import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Star, 
  Save, 
  Send, 
  AlertCircle,
  Building2,
  DollarSign,
  Users,
  Calendar,
  Globe,
  FileText,
  Video
} from "lucide-react";

interface StartupEvaluationModalProps {
  startup: {
    id: string;
    name: string;
    description: string;
    industry: string;
    stage: string;
    founded_year: number;
    team_size: number;
    funding_raised: number;
    contact_email: string;
    website: string;
    pitch_deck_url: string;
    demo_url: string;
    location: string;
    evaluation_status: 'not_started' | 'draft' | 'completed';
    evaluation_id?: string;
    overall_score?: number;
  };
  open: boolean;
  onClose: () => void;
  onEvaluationUpdate: () => void;
}

interface EvaluationForm {
  team_score: number;
  product_score: number;
  market_score: number;
  traction_score: number;
  financials_score: number;
  team_feedback: string;
  product_feedback: string;
  market_feedback: string;
  traction_feedback: string;
  financials_feedback: string;
  overall_notes: string;
  recommendation: string;
  investment_amount: number;
}

const evaluationCriteria = [
  { 
    key: 'team_score', 
    label: 'Team Strength', 
    weight: 20,
    description: 'Evaluate the founding team\'s experience, skills, and track record',
    feedback_key: 'team_feedback'
  },
  { 
    key: 'product_score', 
    label: 'Product/Technology', 
    weight: 25,
    description: 'Assess the product innovation, technical feasibility, and differentiation',
    feedback_key: 'product_feedback'
  },
  { 
    key: 'market_score', 
    label: 'Market Opportunity', 
    weight: 25,
    description: 'Analyze market size, growth potential, and competitive landscape',
    feedback_key: 'market_feedback'
  },
  { 
    key: 'traction_score', 
    label: 'Traction & Growth', 
    weight: 15,
    description: 'Review user growth, revenue, partnerships, and key metrics',
    feedback_key: 'traction_feedback'
  },
  { 
    key: 'financials_score', 
    label: 'Financial Model', 
    weight: 15,
    description: 'Evaluate business model, unit economics, and financial projections',
    feedback_key: 'financials_feedback'
  }
];

export const StartupEvaluationModal = ({ startup, open, onClose, onEvaluationUpdate }: StartupEvaluationModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EvaluationForm>({
    team_score: 0,
    product_score: 0,
    market_score: 0,
    traction_score: 0,
    financials_score: 0,
    team_feedback: '',
    product_feedback: '',
    market_feedback: '',
    traction_feedback: '',
    financials_feedback: '',
    overall_notes: '',
    recommendation: '',
    investment_amount: 0
  });

  useEffect(() => {
    if (open && startup.evaluation_id) {
      fetchExistingEvaluation();
    } else if (open) {
      // Reset form for new evaluation
      setFormData({
        team_score: 0,
        product_score: 0,
        market_score: 0,
        traction_score: 0,
        financials_score: 0,
        team_feedback: '',
        product_feedback: '',
        market_feedback: '',
        traction_feedback: '',
        financials_feedback: '',
        overall_notes: '',
        recommendation: '',
        investment_amount: 0
      });
    }
  }, [open, startup.evaluation_id]);

  const fetchExistingEvaluation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', startup.evaluation_id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          team_score: data.team_score || 0,
          product_score: data.product_score || 0,
          market_score: data.market_score || 0,
          traction_score: data.traction_score || 0,
          financials_score: data.financials_score || 0,
          team_feedback: data.team_feedback || '',
          product_feedback: data.product_feedback || '',
          market_feedback: data.market_feedback || '',
          traction_feedback: data.traction_feedback || '',
          financials_feedback: data.financials_feedback || '',
          overall_notes: data.overall_notes || '',
          recommendation: data.recommendation || '',
          investment_amount: data.investment_amount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      toast.error('Failed to load existing evaluation');
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = () => {
    let totalScore = 0;
    evaluationCriteria.forEach(criterion => {
      const score = formData[criterion.key as keyof EvaluationForm] as number;
      totalScore += score * (criterion.weight / 100);
    });
    return totalScore;
  };

  const validateForm = () => {
    const requiredScores = evaluationCriteria.every(criterion => {
      const score = formData[criterion.key as keyof EvaluationForm] as number;
      return score > 0;
    });

    const requiredFeedback = evaluationCriteria.every(criterion => {
      const feedback = formData[criterion.feedback_key as keyof EvaluationForm] as string;
      return feedback.trim().length > 0;
    });

    if (!requiredScores) {
      toast.error('Please provide scores for all evaluation criteria');
      return false;
    }

    if (!requiredFeedback) {
      toast.error('Please provide feedback for all evaluation criteria');
      return false;
    }

    if (!formData.recommendation) {
      toast.error('Please select a recommendation');
      return false;
    }

    return true;
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted' && !validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const overallScore = calculateOverallScore();

      const evaluationData = {
        startup_id: startup.id,
        evaluator_id: user?.id,
        ...formData,
        overall_score: overallScore,
        status
      };

      if (startup.evaluation_id) {
        // Update existing evaluation
        const { error } = await supabase
          .from('evaluations')
          .update(evaluationData)
          .eq('id', startup.evaluation_id);

        if (error) throw error;
      } else {
        // Create new evaluation
        const { error } = await supabase
          .from('evaluations')
          .insert([evaluationData]);

        if (error) throw error;
      }

      toast.success(status === 'submitted' ? 'Evaluation submitted successfully!' : 'Evaluation saved as draft');
      onEvaluationUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast.error('Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Star className="w-5 h-5" />
            Evaluate {startup.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-6">
            {/* Startup Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Startup Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg">{startup.name}</h4>
                    <p className="text-muted-foreground">{startup.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{startup.industry}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {startup.stage}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Founded {startup.founded_year}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {startup.team_size} team
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>{formatCurrency(startup.funding_raised)} raised</span>
                  </div>

                  <div className="flex gap-2">
                    {startup.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.website, '_blank')}
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Website
                      </Button>
                    )}
                    {startup.pitch_deck_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.pitch_deck_url, '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Pitch Deck
                      </Button>
                    )}
                    {startup.demo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.demo_url, '_blank')}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Demo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluation Criteria */}
            <Card>
              <CardHeader>  
                <CardTitle>Evaluation Criteria</CardTitle>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Star className="w-5 h-5 text-primary" />
                  Overall Score: {calculateOverallScore().toFixed(1)}/10
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {evaluationCriteria.map((criterion, index) => (
                  <div key={criterion.key} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">
                          {criterion.label} ({criterion.weight}%)
                        </Label>
                        <span className="text-sm font-medium text-primary">
                          {formData[criterion.key as keyof EvaluationForm]}/10
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {criterion.description}
                      </p>
                      <Slider
                        value={[formData[criterion.key as keyof EvaluationForm] as number]}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          [criterion.key]: value[0]
                        }))}
                        max={10}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`${criterion.key}-feedback`} className="text-sm font-medium">
                        Feedback & Comments
                      </Label>
                      <Textarea
                        id={`${criterion.key}-feedback`}
                        placeholder={`Provide detailed feedback on ${criterion.label.toLowerCase()}...`}
                        value={formData[criterion.feedback_key as keyof EvaluationForm] as string}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          [criterion.feedback_key]: e.target.value
                        }))}
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                    
                    {index < evaluationCriteria.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="overall-notes">Overall Notes & Comments</Label>
                  <Textarea
                    id="overall-notes"
                    placeholder="Provide your overall assessment, key strengths, concerns, and final thoughts..."
                    value={formData.overall_notes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      overall_notes: e.target.value
                    }))}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Investment Recommendation</Label>
                    <Select
                      value={formData.recommendation}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        recommendation: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recommendation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strong_yes">Strong Yes - Highly Recommend</SelectItem>
                        <SelectItem value="yes">Yes - Recommend</SelectItem>
                        <SelectItem value="maybe">Maybe - Consider</SelectItem>
                        <SelectItem value="no">No - Do Not Recommend</SelectItem>
                        <SelectItem value="strong_no">Strong No - Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="investment-amount">Potential Investment Amount</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">$</span>
                      <Slider
                        value={[formData.investment_amount]}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          investment_amount: value[0]
                        }))}
                        max={10000000}
                        step={50000}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium">
                        {formatCurrency(formData.investment_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            
            <Button
              onClick={() => handleSave('submitted')}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Evaluation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};