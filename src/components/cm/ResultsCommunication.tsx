import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, 
  CheckCircle, 
  Edit, 
  Send, 
  Users, 
  Building,
  FileText,
  Eye,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { StartupCommunicationConfirmationModal } from './StartupCommunicationConfirmationModal';
import { validateStartupCommunications, type CommunicationValidationResult } from '@/utils/startupCommunicationValidation';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AggregatedTemplateSection } from './AggregatedTemplateSection';
import { EmailPreviewModal } from './EmailPreviewModal';
import { VCFeedbackDetailsModal } from './VCFeedbackDetailsModal';
import { useQuery } from '@tanstack/react-query';

interface StartupResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  averageScore: number;
  isSelected: boolean;
  roundStatus?: string;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
  communicationSent: boolean;
}

interface CommunicationTemplate {
  id: string;
  type: 'selected' | 'not-selected' | 'under-review' | 'rejected' | 'juror-report' | 'top-100-feedback';
  subject: string;
  content: string;
}

interface ResultsCommunicationProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const ResultsCommunication = ({ currentRound }: ResultsCommunicationProps) => {
  const [startupResults, setStartupResults] = useState<StartupResult[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<StartupResult | null>(null);
  const [editingFeedback, setEditingFeedback] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingCommunicationType, setPendingCommunicationType] = useState<'selected' | 'rejected' | 'under-review' | 'top-100-feedback' | null>(null);
  const [validationResult, setValidationResult] = useState<CommunicationValidationResult | null>(null);
  const [validatingEmails, setValidatingEmails] = useState(false);
  const [generatingFeedback, setGeneratingFeedback] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [showBatchApprovalDialog, setShowBatchApprovalDialog] = useState(false);
  const [pendingBatchApproval, setPendingBatchApproval] = useState<{
    type: 'top-100-feedback';
    count: number;
    startupIds: string[];
  } | null>(null);
  const [enhancingFeedback, setEnhancingFeedback] = useState<string | null>(null);
  const [enhancedFeedbackPreview, setEnhancedFeedbackPreview] = useState<{
    startupId: string;
    startupName: string;
    original: string;
    enhanced: string;
    improvements: string[];
  } | null>(null);
  const [showEnhancementPreview, setShowEnhancementPreview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedStartupForEmail, setSelectedStartupForEmail] = useState<{ id: string; name: string } | null>(null);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, 'not-generated' | 'draft' | 'approved'>>({});
  const [vcFeedbackOpen, setVcFeedbackOpen] = useState(false);
  const [selectedStartupForVCFeedback, setSelectedStartupForVCFeedback] = useState<{ id: string; name: string } | null>(null);
  

  // Fetch VC feedback details status
  const { data: vcFeedbackStatus, refetch: refetchVCFeedback } = useQuery({
    queryKey: ['vc-feedback-status', currentRound],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_vc_feedback_details')
        .select('startup_id, is_approved, evaluation_count')
        .eq('round_name', currentRound === 'screeningRound' ? 'screening' : 'pitching');

      if (error) throw error;

      const statusMap: Record<string, { is_approved: boolean; evaluation_count: number }> = {};
      data?.forEach(item => {
        statusMap[item.startup_id] = {
          is_approved: item.is_approved,
          evaluation_count: item.evaluation_count
        };
      });
      return statusMap;
    },
  });

  useEffect(() => {
    fetchResultsData();
    loadTemplates();
    loadEmailStatuses();
  }, [currentRound]);

  const loadEmailStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('startup_custom_emails')
        .select('startup_id, is_approved')
        .eq('round_name', currentRound === 'screeningRound' ? 'screening' : 'pitching')
        .eq('communication_type', 'top-100-feedback');

      if (error) throw error;

      const statuses: Record<string, 'not-generated' | 'draft' | 'approved'> = {};
      data?.forEach(item => {
        statuses[item.startup_id] = item.is_approved ? 'approved' : 'draft';
      });
      setEmailStatuses(statuses);
    } catch (error) {
      console.error('Error loading email statuses:', error);
    }
  };

  const handlePreviewEmail = (startupId: string, startupName: string) => {
    setSelectedStartupForEmail({ id: startupId, name: startupName });
    setShowEmailPreview(true);
  };

  const handleEmailStatusChange = () => {
    loadEmailStatuses();
    fetchResultsData();
  };

  const handleViewVCFeedback = (startupId: string, startupName: string) => {
    setSelectedStartupForVCFeedback({ id: startupId, name: startupName });
    setVcFeedbackOpen(true);
  };

  const handleVCFeedbackStatusChange = () => {
    refetchVCFeedback();
  };

  const fetchResultsData = async () => {
    try {
      // Determine which evaluation table to use based on current round
      const evaluationTable = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
      
      let startupsData;
      
      if (currentRound === 'pitchingRound') {
        console.log('Pitching round: filtering for startups selected in screening round');
        
        // For pitching round, only fetch startups that were selected in screening
        const { data, error } = await supabase
          .from('startups')
          .select(`
            *,
            ${evaluationTable}(
              overall_score,
              status,
              strengths,
              improvement_areas,
              overall_notes
            ),
            startup_round_statuses!inner(
              status,
              rounds!inner(name)
            )
          `)
          .eq('startup_round_statuses.rounds.name', 'screening')
          .eq('startup_round_statuses.status', 'selected');
        
        if (error) throw error;
        startupsData = data;
      } else {
        console.log('Screening round: showing all startups');
        
        // For screening round, fetch all startups
        const { data, error } = await supabase
          .from('startups')
          .select(`
            *,
            ${evaluationTable}(
              overall_score,
              status,
              strengths,
              improvement_areas,
              overall_notes
            )
          `);
        
        if (error) throw error;
        startupsData = data;
      }

      // Get round-specific statuses from startup_round_statuses table
      const { data: roundStatusesData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRound === 'screeningRound' ? 'screening' : 'pitching');

      if (roundStatusError) throw roundStatusError;

      // Create a map of startup IDs to their round-specific statuses
      const roundStatusMap = new Map();
      roundStatusesData?.forEach(rs => {
        roundStatusMap.set(rs.startup_id, rs.status);
      });

      console.log(`Loaded ${startupsData?.length || 0} startups for ${currentRound} communication`);
      console.log(`Found ${roundStatusesData?.length || 0} round statuses`);

      const resultsData: StartupResult[] = startupsData?.map(startup => {
        const evaluationKey = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter(e => e.status === 'submitted');
        const scores = submittedEvaluations
          .map(e => e.overall_score)
          .filter(score => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;

        // Use round-specific status from startup_round_statuses table
        const roundStatus = roundStatusMap.get(startup.id) || 'pending';

        // Generate AI feedback summary (placeholder - would use actual AI)
        const strengths = submittedEvaluations.flatMap(e => e.strengths || []);
        const improvements = submittedEvaluations.map(e => e.improvement_areas).filter(Boolean);
        const notes = submittedEvaluations.map(e => e.overall_notes).filter(Boolean);

        const feedbackSummary = generateFeedbackSummary(startup.name, strengths, improvements, notes, averageScore);

        return {
          id: startup.id,
          name: startup.name,
          email: startup.contact_email || 'no-email@example.com',
          verticals: startup.verticals?.join(', ') || 'N/A',
          averageScore,
          isSelected: roundStatus === 'selected',
          roundStatus,
          feedbackSummary,
          feedbackStatus: 'draft' as const,
          communicationSent: false
        };
      }) || [];

      setStartupResults(resultsData);
    } catch (error) {
      console.error('Error fetching results data:', error);
      toast.error('Failed to load results data');
    } finally {
      setLoading(false);
    }
  };

  const generateFeedbackSummary = (
    name: string, 
    strengths: string[], 
    improvements: string[], 
    notes: string[], 
    score: number
  ): string => {
    // Placeholder for manual review - will be replaced by AI
    return `[AI Feedback not yet generated for ${name}]

Click "Generate AI Feedback" to create personalized feedback based on juror evaluations.`;
  };

  const formatAIFeedbackForEmail = (aiData: any, startupName: string): string => {
    return `Dear ${startupName} team,

${aiData.overall_summary}

**What Impressed Our Panel:**
${aiData.strengths.map((s: string) => `• ${s}`).join('\n')}

**Opportunities for Growth:**
${aiData.challenges.map((c: string) => `• ${c}`).join('\n')}

**Recommended Next Steps:**
${aiData.next_steps.map((n: string) => `• ${n}`).join('\n')}

We appreciate your participation and wish you continued success in your journey.

Best regards,
The Aurora Evaluation Team`;
  };

  const generateAIFeedback = async (startupId: string, startupName: string) => {
    setGeneratingFeedback(startupId);
    setGenerationError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-founder-feedback', {
        body: {
          startupId,
          roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching'
        }
      });
      
      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.success || !data.feedback) {
        throw new Error('Invalid response from AI service');
      }
      
      const formattedFeedback = formatAIFeedbackForEmail(data.feedback, startupName);
      
      setStartupResults(prev => prev.map(result =>
        result.id === startupId
          ? { ...result, feedbackSummary: formattedFeedback, feedbackStatus: 'draft' }
          : result
      ));
      
      toast.success(`AI feedback generated for ${startupName}`);
    } catch (error: any) {
      console.error('Error generating feedback:', error);
      const errorMessage = error.message || 'Failed to generate feedback';
      setGenerationError(errorMessage);
      
      if (error.message?.includes('rate limit')) {
        toast.error('AI rate limit reached. Please wait a moment and try again.');
      } else if (error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please contact support.');
      } else if (error.message?.includes('No submitted evaluations')) {
        toast.error(`${startupName} has no submitted evaluations yet.`);
      } else {
        toast.error(`Failed to generate feedback for ${startupName}`);
      }
    } finally {
      setGeneratingFeedback(null);
    }
  };

  const loadTemplates = () => {
    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: '1',
        type: 'selected',
        subject: currentRound === 'screeningRound' 
          ? '🎉 Congratulations! You\'ve been selected for the Pitching Round'
          : '🎉 Congratulations! You\'ve been selected as a Finalist',
        content: currentRound === 'screeningRound'
          ? `Congratulations! Your startup has been selected to advance to the Pitching Round of our evaluation process.

**Your Feedback:**
[FEEDBACK_SUMMARY]

**Next Steps:**
• You will receive a calendar invite for your pitch session
• Prepare a 10-minute presentation followed by Q&A
• Review the attached pitch guidelines

We look forward to seeing your presentation!

Best regards,
The Aurora Team`
          : `Congratulations! Your startup has been selected as a Finalist in our evaluation process.

**Your Feedback:**
[FEEDBACK_SUMMARY]

**What this means:**
• You are among our top selected startups
• Further partnership opportunities may be available
• You will receive detailed feedback from our evaluation panel

We are excited to continue our relationship with your startup!

Best regards,
The Aurora Team`
      },
      {
        id: '2',
        type: 'under-review',
        subject: 'Your Application Status - Under Review',
        content: `Thank you for participating in our startup evaluation process. Your application is currently under review by our evaluation panel.

**Current Status:**
• Your startup is being evaluated by our expert panel
• We expect to have results within [TIMEFRAME]
• No action is required from your side at this time

We appreciate your patience as we complete our thorough evaluation process.

Best regards,
The Aurora Team`
      },
      {
        id: '3',
        type: 'rejected',
        subject: 'Thank you for your participation',
        content: `Thank you for participating in our startup evaluation process. After careful consideration by our evaluation panel, we have decided not to move forward with your startup at this time.

**Your Feedback:**
[FEEDBACK_SUMMARY]

While we cannot proceed with your startup in this round, we were impressed by your dedication and innovation. We encourage you to:
• Continue developing your business based on the feedback provided
• Consider applying to future programs
• Stay connected with our community

Best regards,
The Aurora Team`
      },
      {
        id: '4',
        type: 'not-selected',
        subject: 'Thank you for participating in our evaluation process',
        content: `Thank you for participating in our startup evaluation process. While your startup was not selected for the next phase, we were impressed by your dedication and innovation.

**Your Feedback:**
[FEEDBACK_SUMMARY]

We encourage you to continue developing your business and consider applying to future programs.

Best regards,
The Aurora Team`
      },
      {
        id: '5',
        type: 'juror-report',
        subject: `${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} Round Evaluation Results - Summary Report`,
        content: `Thank you for your participation as an evaluator in the ${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} Round of our startup evaluation process.

         **Summary:**
         • Total startups evaluated: [TOTAL_STARTUPS]
         • Selected startups for ${currentRound === 'screeningRound' ? 'Pitching Round' : 'Final Selection'}
         • Average evaluation score: [AVERAGE_SCORE]

Please find the detailed results and your contribution report attached.

Best regards,
The Aurora Team`
      },
      {
        id: '6',
        type: 'top-100-feedback',
        subject: '🎉 Your Aurora Tech Awards Top 100 VC Feedback',
        content: `Congratulations once again on being selected for the Aurora Tech Awards Top 100! You've already proven yourself as one of the most promising founders in emerging markets.

Below, you'll find detailed feedback from each VC fund that evaluated your startup.

**VC FEEDBACK SECTIONS**
[Dynamically generated from evaluations]

These insights are designed to help you refine your strategy and accelerate your growth.

Best regards,
The Aurora Tech Awards Team`
      }
    ];
    setTemplates(defaultTemplates);
  };


  const handleEditFeedback = (result: StartupResult) => {
    setSelectedResult(result);
    setEditingFeedback(result.feedbackSummary);
    setShowFeedbackDialog(true);
  };

  const handleSaveFeedback = async () => {
    if (!selectedResult) return;

    // Update the feedback in state (in a real app, you'd save to database)
    setStartupResults(prev => prev.map(result =>
      result.id === selectedResult.id
        ? { ...result, feedbackSummary: editingFeedback, feedbackStatus: 'reviewed' }
        : result
    ));

    setShowFeedbackDialog(false);
    toast.success('Feedback updated successfully');
  };

  const handleApproveFeedback = async (resultId: string) => {
    setStartupResults(prev => prev.map(result =>
      result.id === resultId
        ? { ...result, feedbackStatus: 'approved' }
        : result
    ));
    toast.success('Feedback approved');
  };

  const generateAllFeedback = async (type: 'top-100-feedback') => {
    const startupsNeedingFeedback = selectedStartups.filter(s =>
      s.feedbackSummary.includes('[AI Feedback not yet generated')
    );
    
    if (startupsNeedingFeedback.length === 0) {
      toast.info('All startups already have feedback generated');
      return;
    }
    
    setBatchGenerating(true);
    let successCount = 0;
    
    for (const startup of startupsNeedingFeedback) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-founder-feedback', {
          body: {
            startupId: startup.id,
            roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching'
          }
        });
        
        if (!error && data.success && data.feedback) {
          const formattedFeedback = formatAIFeedbackForEmail(data.feedback, startup.name);
          
          setStartupResults(prev => prev.map(r =>
            r.id === startup.id
              ? { ...r, feedbackSummary: formattedFeedback, feedbackStatus: 'draft' }
              : r
          ));
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to generate feedback for ${startup.name}:`, err);
      }
    }
    
    setBatchGenerating(false);
    toast.success(`Generated feedback for ${successCount}/${startupsNeedingFeedback.length} startups`);
  };

  const batchApproveFeedback = (type: 'top-100-feedback') => {
    const startupsReadyForApproval = selectedStartups.filter(s =>
      !s.feedbackSummary.includes('[AI Feedback not yet generated') &&
      (s.feedbackStatus === 'draft' || s.feedbackStatus === 'reviewed')
    );
    
    if (startupsReadyForApproval.length === 0) {
      toast.info('No feedback summaries ready for approval');
      return;
    }
    
    setPendingBatchApproval({
      type,
      count: startupsReadyForApproval.length,
      startupIds: startupsReadyForApproval.map(s => s.id)
    });
    setShowBatchApprovalDialog(true);
  };

  const confirmBatchApproval = () => {
    if (!pendingBatchApproval) return;
    
    setBatchApproving(true);
    
    setStartupResults(prev => prev.map(result =>
      pendingBatchApproval.startupIds.includes(result.id)
        ? { ...result, feedbackStatus: 'approved' }
        : result
    ));
    
    toast.success(`Approved ${pendingBatchApproval.count} feedback summaries`);
    
    setBatchApproving(false);
    setShowBatchApprovalDialog(false);
    setPendingBatchApproval(null);
  };

  const enhanceSingleFeedback = async (startupId: string, startupName: string) => {
    setEnhancingFeedback(startupId);
    
    try {
      const startup = startupResults.find(s => s.id === startupId);
      if (!startup) {
        toast.error('Startup not found');
        return;
      }

      if (startup.feedbackSummary.includes('[AI Feedback not yet generated')) {
        toast.error('Please generate feedback first before enhancing');
        return;
      }

      const { data, error } = await supabase.functions.invoke('enhance-feedback-summary', {
        body: {
          feedbackSummary: startup.feedbackSummary,
          startupName: startup.name,
          roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
          communicationType: startup.roundStatus === 'selected' ? 'selected' : 'rejected'
        }
      });
      
      if (error) throw error;

      if (!data.success || !data.enhancedFeedback) {
        throw new Error(data.error || 'Failed to enhance feedback');
      }

      setEnhancedFeedbackPreview({
        startupId,
        startupName: startup.name,
        original: startup.feedbackSummary,
        enhanced: data.enhancedFeedback,
        improvements: data.improvements || []
      });
      setShowEnhancementPreview(true);
      
    } catch (error: any) {
      console.error('Error enhancing feedback:', error);
      
      if (error.message?.includes('rate limit')) {
        toast.error('AI rate limit reached. Please wait a moment and try again.');
      } else if (error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please contact support.');
      } else {
        toast.error(`Failed to enhance feedback: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setEnhancingFeedback(null);
    }
  };

  const enhanceAllFeedback = async (type: 'top-100-feedback') => {
    const startupsToEnhance = selectedStartups.filter(s =>
      !s.feedbackSummary.includes('[AI Feedback not yet generated') &&
      s.feedbackStatus !== 'sent'
    );
    
    if (startupsToEnhance.length === 0) {
      toast.info('No feedback summaries available to enhance');
      return;
    }
    
    setEnhancingFeedback(`batch-${type}`);
    let successCount = 0;
    
    for (const startup of startupsToEnhance) {
      try {
        const { data, error } = await supabase.functions.invoke('enhance-feedback-summary', {
          body: {
            feedbackSummary: startup.feedbackSummary,
            startupName: startup.name,
            roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
            communicationType: type
          }
        });
        
        if (!error && data.success && data.enhancedFeedback) {
          setStartupResults(prev => prev.map(r =>
            r.id === startup.id
              ? { ...r, feedbackSummary: data.enhancedFeedback, feedbackStatus: 'reviewed' }
              : r
          ));
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to enhance feedback for ${startup.name}:`, err);
      }
    }
    
    setEnhancingFeedback(null);
    toast.success(`Enhanced feedback for ${successCount}/${startupsToEnhance.length} startups`);
  };

  const applyEnhancement = () => {
    if (!enhancedFeedbackPreview) return;
    
    setStartupResults(prev => prev.map(result =>
      result.id === enhancedFeedbackPreview.startupId
        ? { ...result, feedbackSummary: enhancedFeedbackPreview.enhanced, feedbackStatus: 'reviewed' }
        : result
    ));
    
    toast.success(`Enhanced feedback applied for ${enhancedFeedbackPreview.startupName}`);
    setShowEnhancementPreview(false);
    setEnhancedFeedbackPreview(null);
  };

  // Enhanced communication sending with validation
  const initiateCommunications = async (type: 'selected' | 'rejected' | 'under-review' | 'top-100-feedback') => {
    setValidatingEmails(true);
    try {
      // Filter startups based on type
      let targetResults = startupResults;
      
      if (type === 'selected') {
        targetResults = startupResults.filter(r => r.roundStatus === 'selected');
      } else if (type === 'rejected') {
        targetResults = startupResults.filter(r => r.roundStatus === 'rejected');
      } else if (type === 'under-review') {
        targetResults = startupResults.filter(r => r.roundStatus === 'under-review' || r.roundStatus === 'pending');
      } else if (type === 'top-100-feedback') {
        // Only include selected startups with submitted evaluations
        targetResults = startupResults.filter(r => r.roundStatus === 'selected');
        
        // Check if each startup has at least 1 submitted evaluation
        const startupsWithEvals = await Promise.all(
          targetResults.map(async (startup) => {
            const { count } = await supabase
              .from('screening_evaluations')
              .select('*', { count: 'exact', head: true })
              .eq('startup_id', startup.id)
              .eq('status', 'submitted');
            
            return { startup, hasEvaluations: (count || 0) > 0 };
          })
        );
        
        targetResults = startupsWithEvals
          .filter(s => s.hasEvaluations)
          .map(s => s.startup);
          
        if (targetResults.length === 0) {
          toast.error('No selected startups with submitted evaluations found');
          setValidatingEmails(false);
          return;
        }
      }

      // NEW: Check for unapproved feedback
      const missingCount = targetResults.filter(s => 
        s.feedbackSummary.includes('[AI Feedback not yet generated')
      ).length;
      
      const unapprovedCount = targetResults.filter(s => 
        !s.feedbackSummary.includes('[AI Feedback not yet generated') &&
        s.feedbackStatus !== 'approved'
      ).length;
      
      if (missingCount > 0 || unapprovedCount > 0) {
        toast.error(
          `Cannot send emails: ${missingCount} missing feedback, ${unapprovedCount} unapproved`,
          { 
            description: 'Please generate and approve all feedback before sending.',
            duration: 6000 
          }
        );
        setValidatingEmails(false);
        return;
      }

      // Run validation
      const validation = await validateStartupCommunications(targetResults, type, currentRound);
      
      setValidationResult(validation);
      setPendingCommunicationType(type);
      setShowSendDialog(false);
      setShowConfirmationModal(true);
      
    } catch (error) {
      console.error('Error validating communications:', error);
      toast.error('Failed to validate communications');
    } finally {
      setValidatingEmails(false);
    }
  };

  const sendCommunications = async () => {
    if (!validationResult || !pendingCommunicationType) return;
    
    setSendingEmails(true);
    try {
      // Only send to validated startups
      const validStartups = validationResult.validationResults.filter(r => r.isValid);
      
      let successCount = 0;
      for (const validatedStartup of validStartups) {
        // Find the original startup data
        const startup = startupResults.find(s => s.id === validatedStartup.id);
        if (!startup) continue;
        
        try {
          const { data, error } = await supabase.functions.invoke('send-individual-result', {
            body: {
              startupId: startup.id,
              startupName: startup.name,
              recipientEmail: startup.email,
              communicationType: pendingCommunicationType,
              roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
              feedbackSummary: startup.feedbackSummary
            }
          });

          if (error) {
            console.error(`Failed to send email to ${startup.name}:`, error);
            toast.error(`Failed to send email to ${startup.name}`);
            continue;
          }

          console.log(`Email sent successfully to ${startup.name}:`, data);
          successCount++;
          
          // Show gentle reminder if this was a duplicate in test mode
          if (data?.isDuplicate && data?.duplicateInfo) {
            toast.info(`${startup.name}: ${data.duplicateInfo.message} (Test mode: duplicate allowed)`, {
              duration: 6000
            });
          }
          
          // Update status
          setStartupResults(prev => prev.map(r =>
            r.id === startup.id
              ? { ...r, feedbackStatus: 'sent', communicationSent: true }
              : r
          ));
        } catch (emailError) {
          console.error(`Error sending email to ${startup.name}:`, emailError);
          toast.error(`Error sending email to ${startup.name}`);
        }
      }

      const skippedCount = validationResult.validationSummary.willSkip;
      
      if (successCount > 0) {
        toast.success(
          `Successfully sent ${successCount} emails` + 
          (skippedCount > 0 ? `. ${skippedCount} startups were skipped due to validation issues.` : '')
        );
      }
      
      // Reset states
      setShowConfirmationModal(false);
      setPendingCommunicationType(null);
      setValidationResult(null);
      
    } catch (error) {
      console.error('Error sending communications:', error);
      toast.error('Failed to send communications');
    } finally {
      setSendingEmails(false);
    }
  };

  // Enhanced function for individual email sending with better error handling
  const sendIndividualEmail = async (result: StartupResult, communicationType: 'selected' | 'rejected' | 'under-review' | 'top-100-feedback') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-individual-result', {
        body: {
          startupId: result.id,
          startupName: result.name,
          recipientEmail: result.email,
          communicationType,
          roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
          feedbackSummary: result.feedbackSummary
        }
      });

      if (error) {
        console.error(`Failed to invoke send-individual-result function for ${result.name}:`, error);
        toast.error(`Failed to send email to ${result.name}: ${error.message || 'Function invocation failed'}`);
        return false;
      }

      // Check if the function returned an error in the data
      if (data?.error) {
        console.error(`Edge function returned error for ${result.name}:`, data.error);
        toast.error(`Failed to send email to ${result.name}: ${data.error}`);
        return false;
      }

      // Check if the function was successful
      if (!data?.success) {
        console.error(`Edge function did not indicate success for ${result.name}:`, data);
        toast.error(`Failed to send email to ${result.name}: ${data?.message || 'Unknown error'}`);
        return false;
      }

      // Show gentle reminder if this was a duplicate in test mode
      if (data?.isDuplicate && data?.duplicateInfo) {
        toast.info(`${result.name}: ${data.duplicateInfo.message} (Test mode: duplicate allowed)`, {
          duration: 6000
        });
      }

      console.log(`Individual email sent successfully to ${result.name}:`, data);
      
      // Update status in local state
      setStartupResults(prev => prev.map(r =>
        r.id === result.id
          ? { ...r, feedbackStatus: 'sent', communicationSent: true }
          : r
      ));
      
      
      toast.success(`${communicationType.charAt(0).toUpperCase() + communicationType.slice(1)} email sent to ${result.name}`);
      return true;
    } catch (error) {
      console.error(`Error sending individual email to ${result.name}:`, error);
      toast.error(`Error sending email to ${result.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // New function to handle round transition workflow
  const initiateRoundTransition = async () => {
    try {
      // Notify all jurors about screening completion
      const { data: jurors, error: jurorError } = await supabase
        .from('jurors')
        .select('*')
        .not('user_id', 'is', null);

      if (jurorError) {
        console.error('Error fetching jurors for transition:', jurorError);
        return;
      }

      // Get evaluation count per juror
      const jurorNotifications = await Promise.allSettled(
        jurors.map(async (juror) => {
          const { count } = await supabase
            .from('screening_evaluations')
            .select('*', { count: 'exact', head: true })
            .eq('evaluator_id', juror.user_id)
            .eq('status', 'submitted');

          return supabase.functions.invoke('send-juror-phase-transition', {
            body: {
              jurorId: juror.id,
              name: juror.name,
              email: juror.email,
              fromRound: 'screening',
              toRound: 'pitching',
              evaluationCount: count || 0
            }
          });
        })
      );

      const successfulNotifications = jurorNotifications.filter(result => result.status === 'fulfilled').length;
      toast.success(`Sent transition notifications to ${successfulNotifications} jurors`);

       // Show transition success message
       toast.success(
          "Screening round completed! You can now switch to Pitching round to assign jurors to the selected startups.",
          { duration: 10000 }
        );

    } catch (error) {
      console.error('Error in round transition:', error);
      toast.error('Round transition notifications failed');
    }
  };

  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'reviewed':
        return <Badge className="bg-primary text-primary-foreground">Reviewed</Badge>;
      case 'sent':
        return <Badge className="bg-accent text-accent-foreground">Sent</Badge>;
      case 'draft':
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStartups = startupResults.filter(r => r.roundStatus === 'selected');
  const notSelectedStartups = startupResults.filter(r => r.roundStatus === 'rejected');
  const underReviewStartups = startupResults.filter(r => r.roundStatus === 'under-review' || r.roundStatus === 'pending');
  const approvedFeedback = startupResults.filter(r => r.feedbackStatus === 'approved');
  const sentCommunications = startupResults.filter(r => r.communicationSent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Results Communication - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
              </CardTitle>
            </div>
            <CardDescription>
              Review feedback summaries and send {currentRound === 'screeningRound' ? 'evaluation' : 'pitch'} results to startups and jurors
            </CardDescription>
          </div>
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Send Communications
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send Communications</DialogTitle>
                <DialogDescription>
                  Choose which group to send communications to
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => initiateCommunications('selected')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Selected Startups (${selectedStartups.length})`}
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => initiateCommunications('rejected')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Rejected Startups (${notSelectedStartups.length})`}
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => initiateCommunications('under-review')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Under Review Startups (${underReviewStartups.length})`}
                </Button>

                <div className="pt-4 mt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-3 px-2">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Detailed VC feedback with dynamic evaluation sections
                  </div>
                  <Button 
                    className="w-full" 
                    variant="default"
                    onClick={() => initiateCommunications('top-100-feedback')}
                    disabled={sendingEmails || validatingEmails}
                  >
                    {validatingEmails ? 'Validating...' : `Send Top 100 VC Feedback (${selectedStartups.length})`}
                  </Button>
                </div>
                
                {currentRound === 'screeningRound' && (
                  <div className="pt-4 mt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Sending results will notify jurors that screening is complete and initiate the transition to Pitching round.
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
        <CardContent>
          {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{selectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </div>
          <div className="text-center p-4 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{notSelectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{underReviewStartups.length}</div>
            <div className="text-sm text-muted-foreground">Under Review</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{approvedFeedback.length}</div>
            <div className="text-sm text-muted-foreground">Approved Feedback</div>
          </div>
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <div className="text-2xl font-bold text-accent">{sentCommunications.length}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </div>
        </div>

        {/* Top 100 VC Feedback Section */}
        <AggregatedTemplateSection
          top100FeedbackStartups={selectedStartups}
          currentRound={currentRound}
          onBatchGenerateFeedback={generateAllFeedback}
          onBatchApproveFeedback={batchApproveFeedback}
          onBatchEnhanceFeedback={enhanceAllFeedback}
          batchGenerating={batchGenerating}
          batchApproving={batchApproving}
          batchEnhancing={enhancingFeedback?.startsWith('batch-') || false}
        />

        <Tabs defaultValue="feedback" className="space-y-6">
          <TabsList>
            <TabsTrigger value="feedback">Feedback Review</TabsTrigger>
            <TabsTrigger value="selected">Selected ({selectedStartups.length})</TabsTrigger>
            <TabsTrigger value="under-review">Under Review ({underReviewStartups.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({notSelectedStartups.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4">
            {startupResults.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{result.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {result.email} • Score: {formatScore(result.averageScore)}
                      </p>
                    </div>
                    <StatusBadge 
                      status={result.roundStatus || 'pending'} 
                      roundName={currentRound === 'screeningRound' ? 'screening' : 'pitching'} 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        result.feedbackStatus === 'draft' && result.feedbackSummary.includes('[AI Feedback not yet generated') ? 'outline' :
                        result.feedbackStatus === 'draft' ? 'secondary' : 
                        result.feedbackStatus === 'approved' ? 'default' : 
                        'outline'
                      }
                    >
                      {result.feedbackStatus === 'draft' && result.feedbackSummary.includes('[AI Feedback not yet generated') ? (
                        'Not Generated'
                      ) : result.feedbackStatus === 'draft' ? (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Generated
                        </>
                      ) : result.feedbackStatus === 'reviewed' ? (
                        <>
                          <Edit className="h-3 w-3 mr-1" />
                          Edited
                        </>
                      ) : result.feedbackStatus === 'approved' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        result.feedbackStatus
                      )}
                    </Badge>
                    {result.feedbackSummary.includes('[AI Feedback not yet generated') ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => generateAIFeedback(result.id, result.name)}
                        disabled={generatingFeedback === result.id}
                      >
                        {generatingFeedback === result.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEditFeedback(result)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => enhanceSingleFeedback(result.id, result.name)}
                          disabled={enhancingFeedback === result.id || result.feedbackStatus === 'sent'}
                        >
                          {enhancingFeedback === result.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enhancing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Enhance
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateAIFeedback(result.id, result.name)}
                          disabled={generatingFeedback === result.id}
                        >
                          {generatingFeedback === result.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        {result.feedbackStatus !== 'approved' && (
                          <Button size="sm" onClick={() => handleApproveFeedback(result.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-sm">
                  <div className="line-clamp-3 whitespace-pre-wrap">{result.feedbackSummary}</div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            {selectedStartups.map(result => {
              const emailStatus = emailStatuses[result.id] || 'not-generated';
              const vcStatus = vcFeedbackStatus?.[result.id];
              const vcFeedbackStatusText = vcStatus 
                ? (vcStatus.is_approved ? 'Approved' : 'Draft')
                : 'Not Generated';
              
              return (
                <div key={result.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{result.name}</h4>
                      <p className="text-sm text-muted-foreground">
                         {result.email} • Score: {formatScore(result.averageScore)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 items-end">
                          <Badge 
                            variant={
                              emailStatus === 'approved' ? 'default' :
                              emailStatus === 'draft' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            Email: {emailStatus === 'approved' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : emailStatus === 'draft' ? (
                              'Draft'
                            ) : (
                              'Not Generated'
                            )}
                          </Badge>
                          <Badge 
                            variant={vcStatus?.is_approved ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            VC: {vcFeedbackStatusText}
                          </Badge>
                        </div>
                        {result.communicationSent && (
                          <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewVCFeedback(result.id, result.name)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          VC Feedback
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePreviewEmail(result.id, result.name)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="under-review" className="space-y-4">
            {underReviewStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                       {result.email} • Score: {formatScore(result.averageScore)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.communicationSent ? (
                      <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {notSelectedStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.email} • Score: {formatScore(result.averageScore)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.communicationSent ? (
                      <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.subject}</CardTitle>
                  <CardDescription>
                    Template for {template.type.replace('-', ' ')} communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-line">
                    {template.content}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Email Preview Modal */}
        {selectedStartupForEmail && (
          <EmailPreviewModal
            open={showEmailPreview}
            onOpenChange={setShowEmailPreview}
            startupId={selectedStartupForEmail.id}
            startupName={selectedStartupForEmail.name}
            roundName={currentRound === 'screeningRound' ? 'screening' : 'pitching'}
            communicationType="top-100-feedback"
            onEmailStatusChange={handleEmailStatusChange}
          />
        )}

        {/* Feedback Edit Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Feedback Summary</DialogTitle>
              <DialogDescription>
                Review and edit the AI-generated feedback for {selectedResult?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editingFeedback}
                onChange={(e) => setEditingFeedback(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFeedback}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Approval Confirmation Dialog */}
        <Dialog open={showBatchApprovalDialog} onOpenChange={setShowBatchApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Feedback Summaries?</DialogTitle>
              <DialogDescription>
                You are about to approve {pendingBatchApproval?.count} feedback summaries for {pendingBatchApproval?.type} startups.
                Once approved, these feedback summaries will be ready to be sent via email.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBatchApprovalDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBatchApproval}
                disabled={batchApproving}
              >
                {batchApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhancement Preview Dialog */}
        <Dialog open={showEnhancementPreview} onOpenChange={setShowEnhancementPreview}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Enhanced Feedback Preview
                </div>
              </DialogTitle>
              <DialogDescription>
                Review the AI-enhanced feedback for {enhancedFeedbackPreview?.startupName}. Compare the original with the enhanced version before applying.
              </DialogDescription>
            </DialogHeader>
            
            {enhancedFeedbackPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Original Feedback</h4>
                      <Badge variant="outline">Before</Badge>
                    </div>
                    <Textarea 
                      value={enhancedFeedbackPreview.original} 
                      readOnly 
                      rows={15}
                      className="font-mono text-xs bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      {enhancedFeedbackPreview.original.length} characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Enhanced Feedback</h4>
                      <Badge variant="default">
                        <Sparkles className="h-3 w-3 mr-1" />
                        After
                      </Badge>
                    </div>
                    <Textarea 
                      value={enhancedFeedbackPreview.enhanced} 
                      readOnly 
                      rows={15}
                      className="font-mono text-xs bg-primary/5 border-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      {enhancedFeedbackPreview.enhanced.length} characters
                    </p>
                  </div>
                </div>
                
                {enhancedFeedbackPreview.improvements.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-2">AI Improvements Applied:</p>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {enhancedFeedbackPreview.improvements.map((improvement, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEnhancementPreview(false);
                  setEnhancedFeedbackPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={applyEnhancement}>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Enhancement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Confirmation Modal */}
        <StartupCommunicationConfirmationModal
          open={showConfirmationModal}
          onOpenChange={setShowConfirmationModal}
          communicationType={pendingCommunicationType}
          currentRound={currentRound}
          validationResults={validationResult?.validationResults || []}
          validationSummary={validationResult?.validationSummary || {
            totalStartups: 0,
            validStartups: 0,
            willSend: 0,
            willSkip: 0,
            skipReasons: {}
          }}
          onConfirm={sendCommunications}
          isLoading={sendingEmails}
        />

        {/* Email Preview Modal */}
        {showEmailPreview && selectedStartupForEmail && (
          <EmailPreviewModal
            open={showEmailPreview}
            onOpenChange={setShowEmailPreview}
            startupId={selectedStartupForEmail.id}
            startupName={selectedStartupForEmail.name}
            roundName={currentRound === 'screeningRound' ? 'screening' : 'pitching'}
            communicationType="top-100-feedback"
            onEmailStatusChange={handleEmailStatusChange}
          />
        )}

        {/* VC Feedback Details Modal */}
        {vcFeedbackOpen && selectedStartupForVCFeedback && (
          <VCFeedbackDetailsModal
            open={vcFeedbackOpen}
            onOpenChange={setVcFeedbackOpen}
            startupId={selectedStartupForVCFeedback.id}
            startupName={selectedStartupForVCFeedback.name}
            roundName={currentRound === 'screeningRound' ? 'screening' : 'pitching'}
            onStatusChange={handleVCFeedbackStatusChange}
          />
        )}
      </CardContent>
    </Card>
  );
};