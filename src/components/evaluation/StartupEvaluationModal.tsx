import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
// Utility functions
import { formatScore } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Star, Save, Send, Info, Building2, DollarSign, Users, Calendar, Globe, FileText, Video, MapPin, Linkedin, Plus, X, Edit, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
interface StartupEvaluationModalProps {
  startup: {
    id: string;
    name: string;
    description: string;
    industry: string;
    stage: string;
    contact_email: string;
    website: string;
    pitch_deck_url: string;
    demo_url: string;
    location: string;
    region?: string;
    country?: string;
    linkedin_url?: string;
    evaluation_status: 'not_started' | 'draft' | 'completed';
    evaluation_id?: string;
    overall_score?: number;
  };
  open: boolean;
  onClose: () => void;
  onEvaluationUpdate: () => void;
  mode?: 'view' | 'edit'; // Juror Evaluation: view completed evaluations or edit draft/new evaluations
  currentRound: 'screening' | 'pitching';
}
interface EvaluationCriterion {
  key: string;
  label: string;
  description: string;
}
interface EvaluationSection {
  key: string;
  title: string;
  criteria: EvaluationCriterion[];
  guidance: string;
}
interface EvaluationForm {
  criteria_scores: Record<string, number>; // 0, 1, or 2
  strengths: string[];
  improvement_areas: string;
  pitch_development_aspects: string;
  wants_pitch_session: boolean;
  guided_feedback: number[];
  overall_notes: string;
  recommendation: string;
  investment_amount: number | null;
}

interface TextFieldValidation {
  [key: string]: {
    hasError: boolean;
    message: string;
  };
}

// Validation constants
const MIN_CHARS = 30;
const VALIDATION_MESSAGE = "Please add at least 30 characters so your feedback is specific and useful.";

// TextareaWithValidation component
interface TextareaWithValidationProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  validation?: { hasError: boolean; message: string };
  description?: string;
}

const TextareaWithValidation = ({ 
  id, 
  label, 
  placeholder, 
  value, 
  onChange, 
  disabled = false, 
  className = "",
  validation,
  description
}: TextareaWithValidationProps) => {
  const charCount = value.length;
  const isValid = charCount >= MIN_CHARS;
  const showError = validation?.hasError && charCount > 0 && !isValid;

  return (
    <div>
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 mb-2">{description}</p>
      )}
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 min-h-[80px]",
          showError && "border-destructive focus-visible:ring-destructive",
          className
        )}
        disabled={disabled}
        aria-invalid={showError}
        aria-describedby={showError ? `${id}-error` : `${id}-counter`}
      />
      <div className="flex justify-between items-center mt-1">
        <div 
          id={`${id}-counter`}
          className={cn(
            "text-xs",
            charCount < MIN_CHARS ? "text-muted-foreground" : "text-primary"
          )}
        >
          {charCount}/{MIN_CHARS}+ characters
        </div>
        {showError && (
          <div 
            id={`${id}-error`}
            className="text-xs text-destructive flex items-center gap-1"
            role="alert"
          >
            <AlertTriangle className="w-3 h-3" />
            {validation?.message}
          </div>
        )}
      </div>
    </div>
  );
};
// Screening Round Evaluation Sections (38 detailed criteria)
const screeningEvaluationSections: EvaluationSection[] = [{
  key: 'problem_statement',
  title: 'Problem Statement',
  guidance: 'Does the startup show a clear, evidence-based problem that is significant to the target customer segment?',
  criteria: [{
    key: 'problem_logical',
    label: 'The problem is presented logically and compellingly',
    description: 'Clear problem articulation'
  }, {
    key: 'pain_point_clear',
    label: 'The pain point is clearly articulated',
    description: 'Pain point definition'
  }, {
    key: 'issue_size_explained',
    label: 'The size/significance of the issue is explained',
    description: 'Problem magnitude'
  }, {
    key: 'sources_cited',
    label: 'Sources for claims are cited',
    description: 'Evidence backing'
  }, {
    key: 'sources_accurate',
    label: 'Sources are accurate and verifiable',
    description: 'Source reliability'
  }, {
    key: 'target_segment_defined',
    label: 'Target client segment is clearly defined',
    description: 'Customer definition'
  }, {
    key: 'current_solutions_limitations',
    label: 'Limitations of current/alternative solutions are included',
    description: 'Gap analysis'
  }]
}, {
  key: 'solution',
  title: 'Solution',
  guidance: 'Does the solution directly address the identified problem with measurable impact?',
  criteria: [{
    key: 'solution_addresses_problem',
    label: 'The solution directly addresses the problem',
    description: 'Problem-solution fit'
  }, {
    key: 'impact_measurable',
    label: 'Impact on clients is measurable with results',
    description: 'Quantified benefits'
  }, {
    key: 'solution_clearly_described',
    label: 'The solution is clearly described',
    description: 'Solution clarity'
  }, {
    key: 'use_case_provided',
    label: 'A use case or product visualization is provided',
    description: 'Practical examples'
  }, {
    key: 'website_app_aligns',
    label: 'A website or app is available and aligns with the description',
    description: 'Product consistency'
  }]
}, {
  key: 'market',
  title: 'Market',
  guidance: 'Is the market size substantial and well-researched with realistic assumptions?',
  criteria: [{
    key: 'market_size_presented',
    label: 'Market size is presented',
    description: 'Market sizing'
  }, {
    key: 'market_large_enough',
    label: 'Market is large enough to show venture potential',
    description: 'Venture scalability'
  }, {
    key: 'figures_realistic',
    label: 'Figures and logic are realistic (no exaggeration)',
    description: 'Data credibility'
  }, {
    key: 'market_aligns_problem',
    label: 'Market aligns with the defined problem and client segments',
    description: 'Market-problem fit'
  }, {
    key: 'reliable_sources_market',
    label: 'Reliable sources are cited for market trends',
    description: 'Market research quality'
  }, {
    key: 'competitors_listed',
    label: 'Competitors are listed',
    description: 'Competitive awareness'
  }]
}, {
  key: 'competitive_advantage',
  title: 'Competitive Advantage',
  guidance: 'Is there a clear and defensible competitive advantage over existing solutions?',
  criteria: [{
    key: 'comparative_analysis',
    label: 'A comparative analysis of competitors is conducted',
    description: 'Competition analysis'
  }, {
    key: 'advantage_clearly_defined',
    label: 'Competitive advantage is clearly defined',
    description: 'Differentiation clarity'
  }]
}, {
  key: 'business_model',
  title: 'Business Model',
  guidance: 'Is the monetization model clear, coherent, and supported by positive unit economics?',
  criteria: [{
    key: 'monetization_described',
    label: 'Monetisation model is clearly described',
    description: 'Revenue model'
  }, {
    key: 'unit_economics_positive',
    label: 'Unit economics are provided and positive',
    description: 'Economic viability'
  }, {
    key: 'business_model_coherent',
    label: 'Business model is coherent and data-backed',
    description: 'Model consistency'
  }]
}, {
  key: 'traction_scalability',
  title: 'Traction & Scalability',
  guidance: 'Does the company demonstrate meaningful traction with a realistic growth plan?',
  criteria: [{
    key: 'positive_traction',
    label: 'Company shows positive traction',
    description: 'Growth evidence'
  }, {
    key: 'key_metrics_presented',
    label: 'Key metrics are presented',
    description: 'Performance indicators'
  }, {
    key: 'growth_plan_3_5_years',
    label: '3–5 year growth plan is included',
    description: 'Strategic planning'
  }, {
    key: 'key_milestones_provided',
    label: 'Key milestones are provided for 3–5 years',
    description: 'Milestone planning'
  }, {
    key: 'revenue_targets_align',
    label: 'Revenue targets align with SOM',
    description: 'Market alignment'
  }]
}, {
  key: 'team',
  title: 'Team',
  guidance: 'Does the team have relevant experience and expertise to execute the business plan?',
  criteria: [{
    key: 'team_members_introduced',
    label: 'Core team members are introduced with roles',
    description: 'Team transparency'
  }, {
    key: 'achievements_highlighted',
    label: 'Achievements and relevant experience are highlighted',
    description: 'Track record'
  }, {
    key: 'relevant_business_experience',
    label: 'Team has relevant business experience',
    description: 'Business expertise'
  }, {
    key: 'relevant_technical_expertise',
    label: 'Team has relevant technical expertise',
    description: 'Technical capability'
  }]
}, {
  key: 'impact',
  title: 'Impact',
  guidance: 'Is there a clear connection to broader societal challenges with factual backing?',
  criteria: [{
    key: 'social_problem_described',
    label: 'A clear description of the social or sustainability problem is provided',
    description: 'Impact definition'
  }, {
    key: 'links_societal_challenge',
    label: 'The problem links to a broader societal challenge (inequality, sustainability, etc.)',
    description: 'Societal relevance'
  }, {
    key: 'factual_information_included',
    label: 'Problem description includes factual information',
    description: 'Evidence-based impact'
  }, {
    key: 'impact_sources_accurate',
    label: 'Sources are cited and accurate',
    description: 'Impact credibility'
  }]
}, {
  key: 'investment',
  title: 'Investment',
  guidance: 'Is the investment request clear with well-defined use of funds?',
  criteria: [{
    key: 'investment_clearly_stated',
    label: 'The investment request is clearly stated',
    description: 'Funding clarity'
  }, {
    key: 'use_of_funds_outlined',
    label: 'Intended use of funds is outlined with defined goals',
    description: 'Fund allocation'
  }]
}];

// Pitching Round Evaluation Sections (5 focused criteria)
const pitchingEvaluationSections: EvaluationSection[] = [{
  key: 'founder_team',
  title: 'Founder & Team',
  guidance: 'Evaluate the founding team\'s capabilities and track record',
  criteria: [{
    key: 'founder_team_score',
    label: 'Founder & Team Assessment',
    description: '2: Strong, experienced, proven track record, complementary skills | 1: Relevant experience, limited past successes, some gaps | 0: Limited expertise, no track record, critical skill gaps'
  }]
}, {
  key: 'profitability_market',
  title: 'Profitability / Market Potential',
  guidance: 'Assess the market opportunity and growth potential with data-backed projections',
  criteria: [{
    key: 'profitability_market_score',
    label: 'Market Potential & Profitability',
    description: '2: Clear growth in large/high-demand market; credible projections backed by data | 1: Realistic targets; market sizable; execution unproven | 0: Funding dependent; weak ROI alignment'
  }]
}, {
  key: 'prize_money_usage',
  title: 'Usage of Prize Money',
  guidance: 'Evaluate how well the funding request aligns with business goals and stage',
  criteria: [{
    key: 'prize_money_usage_score',
    label: 'Prize Money Allocation',
    description: '2: Specific allocation; aligned with goals; expected outcomes stated | 1: General allocation; lacks detail | 0: Misaligned or vague; disconnected from stage/goals'
  }]
}, {
  key: 'information_delivery',
  title: 'Information Delivery (Pitch Quality)',
  guidance: 'Assess the clarity, structure, and effectiveness of the pitch presentation',
  criteria: [{
    key: 'information_delivery_score',
    label: 'Pitch Quality & Delivery',
    description: '2: Clear, logical, structured, smooth flow, strong storytelling | 1: Mostly complete, minor flow issues | 0: Disorganized, unclear, missing elements'
  }]
}, {
  key: 'qa_performance',
  title: 'Q&A Performance',
  guidance: 'Evaluate the founder\'s ability to handle questions and provide clear answers',
  criteria: [{
    key: 'qa_performance_score',
    label: 'Q&A Session Performance',
    description: '2: Precise, evidence-based answers | 1: Confident but shallow | 0: Vague, unsupported, off-topic'
  }]
}];
const guidedFeedbackOptions = [{
  id: 1,
  label: 'Overall storytelling in the pitch deck'
}, {
  id: 2,
  label: 'Level of detail and factual evidence is insufficient'
}, {
  id: 3,
  label: 'Problem does not seem real/significant enough'
}, {
  id: 4,
  label: 'Clarity of the problem–solution fit is weak'
}, {
  id: 5,
  label: 'Market estimates are unclear/incorrect'
}, {
  id: 6,
  label: 'Business model unclear or not scalable'
}, {
  id: 7,
  label: 'Competitive analysis needs more attention'
}, {
  id: 8,
  label: 'Competitive advantage not strong enough'
}, {
  id: 9,
  label: 'Missing relevant team experience'
}, {
  id: 10,
  label: 'Insufficient information on team roles/functions'
}, {
  id: 11,
  label: 'No track record to support forecasts'
}, {
  id: 12,
  label: 'Company stage unclear'
}, {
  id: 13,
  label: '3–5 year plan lacks milestones/evidence'
}, {
  id: 14,
  label: 'Plan appears over-optimistic'
}, {
  id: 15,
  label: 'Plan not ambitious enough given track record'
}, {
  id: 16,
  label: 'Investment thesis unclear'
}, {
  id: 17,
  label: 'Investment ask does not align with company stage'
}, {
  id: 18,
  label: 'Business does not appear VC-investable'
}];
export const StartupEvaluationModal = ({
  startup,
  open,
  onClose,
  onEvaluationUpdate,
  mode = 'edit', // Default to edit mode for backward compatibility
  currentRound
}: StartupEvaluationModalProps) => {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<'not_started' | 'draft' | 'submitted'>('not_started');
  const [formData, setFormData] = useState<EvaluationForm>({
    criteria_scores: {},
    strengths: [],
    improvement_areas: '',
    pitch_development_aspects: '',
    wants_pitch_session: false,
    guided_feedback: [],
    overall_notes: '',
    recommendation: '',
    investment_amount: null
  });
  const [validationErrors, setValidationErrors] = useState<TextFieldValidation>({});
  useEffect(() => {
    if (open && startup.evaluation_id) {
      fetchExistingEvaluation();
    } else if (open) {
      // Reset state for new evaluation
      setEvaluationStatus('not_started');
      
      // Set editing mode based on the mode prop
      if (mode === 'view') {
        setIsEditing(false); // Read-only view
      } else {
        setIsEditing(true); // Edit mode for new evaluations
      }
      
      setFormData({
        criteria_scores: {},
        strengths: [],
        improvement_areas: '',
        pitch_development_aspects: '',
        wants_pitch_session: false,
        guided_feedback: [],
        overall_notes: '',
        recommendation: '',
        investment_amount: null
      });
    } else {
      // Reset states when modal closes
      setIsEditing(false);
      setEvaluationStatus('not_started');
    }
  }, [open, startup.evaluation_id, mode]); // Add mode to dependencies
  const fetchExistingEvaluation = async () => {
    try {
      setLoading(true);
      // Use round-aware table selection
      const evaluationsTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      const { data, error } = await supabase
        .from(evaluationsTable)
        .select('*')
        .eq('id', startup.evaluation_id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // Set evaluation status based on database
        setEvaluationStatus(data.status === 'submitted' ? 'submitted' : 'draft');
        
        // Set editing mode based on the mode prop, not database status
        if (mode === 'view') {
          setIsEditing(false); // Always start in view mode if explicitly requested
        } else if (mode === 'edit') {
          setIsEditing(true); // Always start in edit mode if explicitly requested
        }
        
        setFormData({
          criteria_scores: data.criteria_scores as Record<string, number> || {},
          strengths: (data.strengths as string[] && Array.isArray(data.strengths)) ? data.strengths.filter(s => s && s.trim()) : [],
          improvement_areas: data.improvement_areas || '',
          pitch_development_aspects: data.pitch_development_aspects || '',
          wants_pitch_session: data.wants_pitch_session || false,
          guided_feedback: Array.isArray(data.guided_feedback) 
            ? data.guided_feedback.map((item: any) => typeof item === 'string' ? parseInt(item) : item).filter(item => !isNaN(item))
            : [],
          overall_notes: data.overall_notes || '',
          recommendation: data.recommendation || '',
          investment_amount: data.investment_amount
        });
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      toast.error('Failed to load existing evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvaluation = () => {
    setIsEditing(true);
  };
  const calculateOverallScore = () => {
    // Use appropriate evaluation sections based on current round
    const currentEvaluationSections = currentRound === 'screening' ? screeningEvaluationSections : pitchingEvaluationSections;
    const totalCriteria = currentEvaluationSections.reduce((sum, section) => sum + section.criteria.length, 0);
    const totalScore = Object.values(formData.criteria_scores).reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = totalCriteria * 2; // Max 2 points per criterion
    return maxPossibleScore > 0 ? totalScore / maxPossibleScore * 10 : 0;
  };
  const validateOpenEndedFields = () => {
    const errors: TextFieldValidation = {};
    let hasErrors = false;

    // Validate strengths (each non-empty strength must have at least 30 chars)
    formData.strengths.forEach((strength, index) => {
      if (strength.trim().length > 0 && strength.trim().length < MIN_CHARS) {
        errors[`strength-${index}`] = {
          hasError: true,
          message: VALIDATION_MESSAGE
        };
        hasErrors = true;
      }
    });

    // Validate improvement areas
    if (formData.improvement_areas.trim().length > 0 && formData.improvement_areas.trim().length < MIN_CHARS) {
      errors['improvement_areas'] = {
        hasError: true,
        message: VALIDATION_MESSAGE
      };
      hasErrors = true;
    }

    // Validate pitch development aspects
    if (formData.pitch_development_aspects.trim().length > 0 && formData.pitch_development_aspects.trim().length < MIN_CHARS) {
      errors['pitch_development_aspects'] = {
        hasError: true,
        message: VALIDATION_MESSAGE
      };
      hasErrors = true;
    }

    // Validate overall notes
    if (formData.overall_notes.trim().length > 0 && formData.overall_notes.trim().length < MIN_CHARS) {
      errors['overall_notes'] = {
        hasError: true,
        message: VALIDATION_MESSAGE
      };
      hasErrors = true;
    }

    setValidationErrors(errors);
    return !hasErrors;
  };

  const validateForm = () => {
    // Use appropriate evaluation sections based on current round
    const currentEvaluationSections = currentRound === 'screening' ? screeningEvaluationSections : pitchingEvaluationSections;
    const allCriteriaCovered = currentEvaluationSections.every(section => section.criteria.every(criterion => formData.criteria_scores[criterion.key] !== undefined));
    if (!allCriteriaCovered) {
      toast.error('Please score all evaluation criteria');
      return false;
    }
    
    // Debug logging for strengths validation
    console.log('Validating strengths:', formData.strengths);
    console.log('Strengths after filtering:', formData.strengths.filter(s => s && s.trim().length > 0));
    
    const hasValidStrengths = formData.strengths && 
      Array.isArray(formData.strengths) && 
      formData.strengths.some(strength => strength && typeof strength === 'string' && strength.trim().length > 0);
    
    if (!hasValidStrengths) {
      console.error('Strength validation failed. Current strengths:', formData.strengths);
      toast.error('Please provide at least one strength');
      return false;
    }
    
    if (!formData.improvement_areas.trim()) {
      toast.error('Please identify main areas that need improvement');
      return false;
    }
    if (!formData.pitch_development_aspects.trim()) {
      toast.error('Please specify aspects of the pitch that need further development');
      return false;
    }

    // Validate open-ended fields for character count
    if (!validateOpenEndedFields()) {
      toast.error('Some feedback fields need at least 30 characters before submission');
      return false;
    }

    return true;
  };
  const handleSave = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted' && !validateForm()) {
      return;
    }

    // For drafts, check if there are short fields and show reminder
    if (status === 'draft') {
      const hasShortFields = !validateOpenEndedFields();
      if (hasShortFields) {
        toast.info('Draft saved. Some answers need at least 30 characters before submission.');
      }
    }
    if (!user?.id) {
      toast.error('Authentication required. Please sign in again.');
      return;
    }
    try {
      setSaving(true);

      // Verify current session
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please sign in again.');
        return;
      }
      const overallScore = calculateOverallScore();

      // Prepare evaluation data
      const evaluationData: any = {
        startup_id: startup.id,
        evaluator_id: user?.id,
        status,
        criteria_scores: formData.criteria_scores,
        strengths: formData.strengths.filter(s => s.trim().length > 0),
        improvement_areas: formData.improvement_areas || null,
        pitch_development_aspects: formData.pitch_development_aspects || null,
        wants_pitch_session: formData.wants_pitch_session,
        guided_feedback: formData.guided_feedback,
        overall_notes: formData.overall_notes || null,
        overall_score: overallScore
      };

      if (startup.evaluation_id) {
        // Update existing evaluation - use round-aware table
        const evaluationsTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        const { error } = await supabase
          .from(evaluationsTable)
          .update(evaluationData)
          .eq('id', startup.evaluation_id);
          
        if (error) throw error;
      } else {
        // Create new evaluation - use round-aware table
        const evaluationsTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        const {
          error
        } = await supabase.from(evaluationsTable).insert([evaluationData]);
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
  const updateCriteriaScore = (criterionKey: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criterionKey]: score
      }
    }));
  };
  const updateStrength = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      strengths: prev.strengths.map((strength, i) => i === index ? value : strength)
    }));
  };

  const addStrength = () => {
    if (formData.strengths.length < 3) {
      setFormData(prev => ({
        ...prev,
        strengths: [...prev.strengths, '']
      }));
    }
  };

  const removeStrength = (index: number) => {
    setFormData(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== index)
    }));
  };
  const toggleGuidedFeedback = (optionId: number) => {
    setFormData(prev => {
      const isSelected = prev.guided_feedback.includes(optionId);
      if (isSelected) {
        return {
          ...prev,
          guided_feedback: prev.guided_feedback.filter(id => id !== optionId)
        };
      } else if (prev.guided_feedback.length < 3) {
        return {
          ...prev,
          guided_feedback: [...prev.guided_feedback, optionId]
        };
      } else {
        toast.error('You can select maximum 3 options');
        return prev;
      }
    });
  };
  return <TooltipProvider>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Star className="w-5 h-5" />
                {currentRound === 'screening' ? 'Screening' : 'Pitching'} Evaluation - {startup.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {mode === 'view' && (
                  <Badge variant="outline" className="text-xs">
                    Read Only
                  </Badge>
                )}
                {evaluationStatus === 'not_started' && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Not Completed Yet
                  </Badge>
                )}
                {evaluationStatus === 'submitted' && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Submitted
                  </Badge>
                )}
                {evaluationStatus === 'draft' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Edit className="w-3 h-3" />
                    Draft
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-6">
              {/* Enhanced Startup Overview */}
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
                      <h4 className="font-semibold text-xl">{startup.name}</h4>
                      <p className="text-muted-foreground mt-1">{startup.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{startup.industry}</Badge>
                        
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{startup.stage} Stage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{startup.region || 'N/A'} Region</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span>{startup.country || startup.location}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {startup.linkedin_url && <Button variant="outline" size="sm" onClick={() => window.open(startup.linkedin_url, '_blank')}>
                          <Linkedin className="w-4 h-4 mr-1" />
                          LinkedIn
                        </Button>}
                      {startup.website && <Button variant="outline" size="sm" onClick={() => window.open(startup.website, '_blank')}>
                          <Globe className="w-4 h-4 mr-1" />
                          Website
                        </Button>}
                      {startup.pitch_deck_url && <Button variant="outline" size="sm" onClick={() => window.open(startup.pitch_deck_url, '_blank')}>
                          <FileText className="w-4 h-4 mr-1" />
                          Pitch Deck
                        </Button>}
                      <Button variant="outline" size="sm" onClick={() => window.open(`/startup-application/${startup.id}`, '_blank')}>
                        <FileText className="w-4 h-4 mr-1" />
                        Full Application
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation Criteria Sections */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Evaluation Criteria</CardTitle>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Star className="w-5 h-5 text-primary" />
                      Overall Score: {formatScore(calculateOverallScore())}/10
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {(() => {
                    // Use appropriate evaluation sections based on current round
                    const currentEvaluationSections = currentRound === 'screening' ? screeningEvaluationSections : pitchingEvaluationSections;
                    return currentEvaluationSections.map((section, sectionIndex) => <div key={section.key} className="space-y-4">
                       <div className="flex items-center gap-2">
                         <h3 className="text-lg font-semibold">{sectionIndex + 1}. {section.title}</h3>
                         <Tooltip>
                           <TooltipTrigger>
                             <Info className="w-4 h-4 text-muted-foreground" />
                           </TooltipTrigger>
                           <TooltipContent>
                             <p className="max-w-xs">{section.guidance}</p>
                           </TooltipContent>
                         </Tooltip>
                       </div>
                       
                       <div className="space-y-3 ml-4">
                         {section.criteria.map((criterion, criterionIndex) => <div key={criterion.key} className="space-y-2">
                             <div className="flex items-center justify-between">
                               <Label className="text-sm flex-1">{criterion.label}</Label>
                               <div className="flex items-center gap-2">
                                  <Select 
                                    value={formData.criteria_scores[criterion.key]?.toString() || ''} 
                                    onValueChange={value => updateCriteriaScore(criterion.key, parseInt(value))}
                                    disabled={!isEditing}
                                  >
                                   <SelectTrigger className="w-32">
                                     <SelectValue placeholder="Score" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="2">Strong (2 pts)</SelectItem>
                                     <SelectItem value="1">Moderate (1 pt)</SelectItem>
                                     <SelectItem value="0">Weak (0 pts)</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                             </div>
                             <p className="text-xs text-muted-foreground ml-2">{criterion.description}</p>
                           </div>)}
                       </div>
                       
                       {sectionIndex < currentEvaluationSections.length - 1 && <Separator />}
                     </div>);
                  })()}
                </CardContent>
              </Card>

              {/* Open Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Open Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">Highlight strengths of the startup</Label>
                    <div className="space-y-2 mt-2">
                      {formData.strengths.length === 0 && (
                        <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">
                          Click the + button below to add startup strengths (maximum 3)
                        </div>
                      )}
                      {formData.strengths.map((strength, index) => {
                        const charCount = strength.length;
                        const isValid = charCount >= MIN_CHARS;
                        const showError = validationErrors[`strength-${index}`]?.hasError && charCount > 0 && !isValid;
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Textarea 
                                  placeholder={`Strength ${index + 1}`} 
                                  value={strength} 
                                  onChange={e => updateStrength(index, e.target.value)} 
                                  className={cn(
                                    "min-h-[60px]",
                                    showError && "border-destructive focus-visible:ring-destructive"
                                  )}
                                  disabled={!isEditing}
                                  aria-invalid={showError}
                                  aria-describedby={showError ? `strength-${index}-error` : `strength-${index}-counter`}
                                />
                                <div className="flex justify-between items-center mt-1">
                                  <div 
                                    id={`strength-${index}-counter`}
                                    className={cn(
                                      "text-xs",
                                      charCount < MIN_CHARS ? "text-muted-foreground" : "text-primary"
                                    )}
                                  >
                                    {charCount}/{MIN_CHARS}+ characters
                                  </div>
                                  {showError && (
                                    <div 
                                      id={`strength-${index}-error`}
                                      className="text-xs text-destructive flex items-center gap-1"
                                      role="alert"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      {VALIDATION_MESSAGE}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeStrength(index)}
                                className="px-2 h-auto self-start mt-1"
                                disabled={!isEditing}
                              >
                               <X className="w-4 h-4" />
                             </Button>
                            </div>
                          </div>
                        );
                      })}
                      {formData.strengths.length < 3 && (
                        <div className="flex justify-center pt-2">
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            onClick={addStrength}
                            className="w-8 h-8 rounded-full p-0"
                            disabled={!isEditing}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <TextareaWithValidation
                    id="improvement-areas"
                    label="Identify the main areas that need improvement"
                    placeholder="Describe the key areas where the startup needs to improve..."
                    value={formData.improvement_areas}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      improvement_areas: value
                    }))}
                    disabled={!isEditing}
                    validation={validationErrors['improvement_areas']}
                  />

                  <TextareaWithValidation
                    id="pitch-development"
                    label="What aspects of the pitch need further development?"
                    placeholder="Specify which aspects of the pitch require more work or clarity..."
                    value={formData.pitch_development_aspects}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      pitch_development_aspects: value
                    }))}
                    disabled={!isEditing}
                    validation={validationErrors['pitch_development_aspects']}
                  />

                  <div className="flex items-center space-x-3">
                    <Switch id="pitch-session" checked={formData.wants_pitch_session} onCheckedChange={checked => setFormData(prev => ({
                      ...prev,
                      wants_pitch_session: checked
                    }))} disabled={!isEditing} />
                    <Label htmlFor="pitch-session" className="text-base font-semibold">
                      Would you like to see this project in a pitching session?
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Multiple Choice Guided Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Guided Feedback</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Based on the information you have, what are the main areas the team should focus on? (Select maximum 3 options)
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {guidedFeedbackOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`guided-${option.id}`} 
                          checked={formData.guided_feedback.includes(option.id)} 
                          onCheckedChange={() => toggleGuidedFeedback(option.id)}
                          disabled={!isEditing || (!formData.guided_feedback.includes(option.id) && formData.guided_feedback.length >= 3)}
                        />
                        <Label htmlFor={`guided-${option.id}`} className="text-sm">
                          {option.label}
                        </Label>
                      </div>)}
                  </div>

                  <TextareaWithValidation
                    id="overall-notes"
                    label="Overall Notes"
                    description="Additional comments and observations"
                    placeholder="Provide your overall assessment, key observations, and any additional comments..."
                    value={formData.overall_notes}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      overall_notes: value
                    }))}
                    className="min-h-[100px]"
                    disabled={!isEditing}
                    validation={validationErrors['overall_notes']}
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            
            {mode !== 'view' && (
              <div className="flex gap-2">
                {/* Show different buttons based on status and editing mode */}
                {evaluationStatus === 'not_started' && (
                  <>
                    <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Draft
                    </Button>
                    <Button onClick={() => handleSave('submitted')} disabled={saving} className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Evaluation
                    </Button>
                  </>
                )}
                
                {evaluationStatus === 'draft' && isEditing && (
                  <>
                    <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Draft
                    </Button>
                    <Button onClick={() => handleSave('submitted')} disabled={saving} className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Evaluation
                    </Button>
                  </>
                )}
                
                {evaluationStatus === 'submitted' && !isEditing && (
                  <Button variant="outline" onClick={handleEditEvaluation} className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Evaluation
                  </Button>
                )}
                
                {evaluationStatus === 'submitted' && isEditing && (
                  <>
                    <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Revert to Draft
                    </Button>
                    <Button onClick={() => handleSave('submitted')} disabled={saving} className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Update Evaluation
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>;
};