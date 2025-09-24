import { supabase } from '@/integrations/supabase/client';

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

interface StartupValidationResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  roundStatus: string;
  isValid: boolean;
  skipReasons: string[];
  communicationType: 'selected' | 'rejected' | 'under-review';
}

interface ValidationSummary {
  totalStartups: number;
  validStartups: number;
  willSend: number;
  willSkip: number;
  skipReasons: Record<string, number>;
}

export interface CommunicationValidationResult {
  validationResults: StartupValidationResult[];
  validationSummary: ValidationSummary;
}

/**
 * Validates email addresses
 */
const isValidEmail = (email: string): boolean => {
  if (!email || email.trim() === '') return false;
  if (email.includes('example.com') || email.includes('test.com')) return false;
  if (email === 'no-email@example.com') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates startup communication requirements for a specific round and type
 */
export const validateStartupCommunications = async (
  startups: StartupResult[],
  communicationType: 'selected' | 'rejected' | 'under-review',
  currentRound: 'screeningRound' | 'pitchingRound'
): Promise<CommunicationValidationResult> => {
  
  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
  const validationResults: StartupValidationResult[] = [];
  const skipReasonsSummary: Record<string, number> = {};

  // Get round-specific statuses for all startups
  const startupIds = startups.map(s => s.id);
  const { data: roundStatuses, error: roundError } = await supabase
    .from('startup_round_statuses')
    .select(`
      startup_id,
      status,
      rounds!inner(name)
    `)
    .in('startup_id', startupIds)
    .eq('rounds.name', roundName);

  if (roundError) {
    console.error('Error fetching round statuses:', roundError);
  }

  // Create a map of startup IDs to their round-specific statuses
  const roundStatusMap = new Map();
  roundStatuses?.forEach(rs => {
    roundStatusMap.set(rs.startup_id, rs.status);
  });

  // Get existing communications for duplicate checking
  const { data: existingComms, error: commsError } = await supabase
    .from('email_communications')
    .select('recipient_id, communication_type, created_at')
    .eq('recipient_type', 'startup')
    .eq('round_name', roundName)
    .in('recipient_id', startupIds)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (commsError) {
    console.error('Error fetching existing communications:', commsError);
  }

  // Create a map of existing communications
  const existingCommsMap = new Map();
  existingComms?.forEach(comm => {
    const key = `${comm.recipient_id}-${comm.communication_type}`;
    existingCommsMap.set(key, comm.created_at);
  });

  // Filter and validate each startup
  for (const startup of startups) {
    const skipReasons: string[] = [];
    const actualRoundStatus = roundStatusMap.get(startup.id);
    
    // 1. Check if startup is in the current round
    if (!actualRoundStatus) {
      skipReasons.push('not in round');
    }

    // 2. Check if startup status matches communication type  
    let expectedStatus: string;
    switch (communicationType) {
      case 'selected':
        expectedStatus = 'selected';
        break;
      case 'rejected':
        expectedStatus = 'rejected';
        break;
      case 'under-review':
        expectedStatus = 'under-review';
        break;
      default:
        expectedStatus = 'pending';
    }

    if (actualRoundStatus && actualRoundStatus !== expectedStatus) {
      // For under-review, also accept 'pending' status
      if (!(communicationType === 'under-review' && actualRoundStatus === 'pending')) {
        skipReasons.push('wrong status');
      }
    }

    // 3. Validate email address
    if (!isValidEmail(startup.email)) {
      if (!startup.email || startup.email.trim() === '') {
        skipReasons.push('no email');
      } else {
        skipReasons.push('invalid email');
      }
    }

    // 4. Check for duplicate communications (map UI type to internal DB type)
    const commTypeMap = { selected: 'selection', rejected: 'rejection', 'under-review': 'under-review' } as const;
    const internalType = commTypeMap[communicationType] || communicationType;
    const commKey = `${startup.id}-${internalType}`;
    if (existingCommsMap.has(commKey)) {
      skipReasons.push('already sent');
    }

    // 5. Check if feedback summary is available (optional but recommended)
    if (!startup.feedbackSummary || startup.feedbackSummary.trim() === '') {
      // This is a warning, not a blocker
      skipReasons.push('no feedback');
    }

    // 6. Check if feedback is approved (recommended for quality)
    if (startup.feedbackStatus === 'draft') {
      // This is a warning, not a blocker for now
      // skipReasons.push('feedback not approved');
    }

    const isValid = skipReasons.length === 0 || 
      (skipReasons.length === 1 && skipReasons[0] === 'no feedback'); // Allow sending without feedback

    validationResults.push({
      id: startup.id,
      name: startup.name,
      email: startup.email,
      industry: startup.industry,
      roundStatus: actualRoundStatus || 'unknown',
      isValid,
      skipReasons,
      communicationType
    });

    // Count skip reasons for summary
    skipReasons.forEach(reason => {
      skipReasonsSummary[reason] = (skipReasonsSummary[reason] || 0) + 1;
    });
  }

  // Generate summary
  const validStartups = validationResults.filter(r => r.isValid);
  const invalidStartups = validationResults.filter(r => !r.isValid);

  const validationSummary: ValidationSummary = {
    totalStartups: startups.length,
    validStartups: validStartups.length,
    willSend: validStartups.length,
    willSkip: invalidStartups.length,
    skipReasons: skipReasonsSummary
  };

  return {
    validationResults,
    validationSummary
  };
};

/**
 * Enhanced validation that includes template variable checking
 */
export const validateWithTemplateRequirements = async (
  startups: StartupResult[],
  communicationType: 'selected' | 'rejected' | 'under-review',
  currentRound: 'screeningRound' | 'pitchingRound',
  requireApprovedFeedback: boolean = false
): Promise<CommunicationValidationResult> => {
  
  const baseValidation = await validateStartupCommunications(startups, communicationType, currentRound);
  
  // Add additional template-specific validations
  const enhancedResults = baseValidation.validationResults.map(result => {
    const startup = startups.find(s => s.id === result.id);
    const additionalReasons: string[] = [];
    
    if (startup) {
      // Check for required feedback approval
      if (requireApprovedFeedback && startup.feedbackStatus !== 'approved') {
        additionalReasons.push('feedback not approved');
      }
      
      // Check for feedback quality (minimum length)
      if (startup.feedbackSummary && startup.feedbackSummary.length < 50) {
        additionalReasons.push('feedback too short');
      }
    }
    
    const allSkipReasons = [...result.skipReasons, ...additionalReasons];
    const isValid = allSkipReasons.length === 0 || 
      (allSkipReasons.length === 1 && allSkipReasons[0] === 'no feedback');
    
    return {
      ...result,
      skipReasons: allSkipReasons,
      isValid
    };
  });
  
  // Recalculate summary
  const validStartups = enhancedResults.filter(r => r.isValid);
  const invalidStartups = enhancedResults.filter(r => !r.isValid);
  
  const updatedSkipReasons: Record<string, number> = {};
  enhancedResults.forEach(result => {
    result.skipReasons.forEach(reason => {
      updatedSkipReasons[reason] = (updatedSkipReasons[reason] || 0) + 1;
    });
  });
  
  return {
    validationResults: enhancedResults,
    validationSummary: {
      totalStartups: startups.length,
      validStartups: validStartups.length,
      willSend: validStartups.length,
      willSkip: invalidStartups.length,
      skipReasons: updatedSkipReasons
    }
  };
};