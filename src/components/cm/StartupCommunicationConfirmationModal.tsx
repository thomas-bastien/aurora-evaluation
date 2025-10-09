import { UniversalCommunicationModal } from '../communication/UniversalCommunicationModal';

interface StartupValidationResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  roundStatus: string;
  isValid: boolean;
  skipReasons: string[];
  communicationType: 'selected' | 'rejected' | 'under-review' | 'top-100-feedback';
}

interface ValidationSummary {
  totalStartups: number;
  validStartups: number;
  willSend: number;
  willSkip: number;
  skipReasons: Record<string, number>;
}

interface StartupCommunicationConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communicationType: 'selected' | 'rejected' | 'under-review' | 'top-100-feedback' | null;
  currentRound: 'screeningRound' | 'pitchingRound';
  validationResults: StartupValidationResult[];
  validationSummary: ValidationSummary;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const StartupCommunicationConfirmationModal = ({
  open,
  onOpenChange,
  communicationType,
  currentRound,
  validationResults,
  validationSummary,
  onConfirm,
  isLoading = false
}: StartupCommunicationConfirmationModalProps) => {
  const validStartups = validationResults.filter(s => s.isValid).map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    industry: s.industry,
    status: s.roundStatus,
    isValid: s.isValid,
    skipReasons: s.skipReasons,
    communicationType: s.communicationType
  }));

  const invalidStartups = validationResults.filter(s => !s.isValid).map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    industry: s.industry,
    status: s.roundStatus,
    isValid: s.isValid,
    skipReasons: s.skipReasons || [],
    communicationType: s.communicationType
  }));

  const communicationTypeMap = {
    'selected': 'results-selected' as const,
    'rejected': 'results-rejected' as const,
    'under-review': 'results-under-review' as const,
    'top-100-feedback': 'results-selected' as const
  };

  return (
    <UniversalCommunicationModal
      open={open}
      onOpenChange={onOpenChange}
      communicationType={communicationType ? communicationTypeMap[communicationType] : 'results-selected'}
      currentRound={currentRound}
      type="bulk"
      statistics={{
        total: validationSummary.totalStartups,
        eligible: validationSummary.validStartups,
        willSend: validationSummary.willSend,
        willSkip: validationSummary.willSkip,
        skipReasons: validationSummary.skipReasons
      }}
      validationResults={{
        valid: validStartups,
        invalid: invalidStartups
      }}
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
};