import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Lightbulb, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistPreferences } from '@/hooks/useAIAssistPreferences';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';

interface Suggestion {
  text: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIFeedbackAssistProps {
  fieldType: 'strengths' | 'improvement_areas' | 'pitch_development' | 'overall_notes';
  draftText: string;
  rubric: Array<{
    key: string;
    title: string;
    criteria: Array<{
      label: string;
      description: string;
    }>;
    guidance: string;
  }>;
  startupContext: {
    name: string;
    vertical: string;
    stage: string;
  };
  roundName: 'screening' | 'pitching';
  onInsertSuggestion: (text: string) => void;
  disabled?: boolean;
}

export const AIFeedbackAssist = ({
  fieldType,
  draftText,
  rubric,
  startupContext,
  roundName,
  onInsertSuggestion,
  disabled = false,
}: AIFeedbackAssistProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { isEnabled, toggleEnabled } = useAIAssistPreferences();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastDraftRef = useRef<string>('');

  // Track analytics
  const trackEvent = (event: string, data: any) => {
    console.log('[AI Feedback Assist]', {
      timestamp: new Date().toISOString(),
      event,
      fieldType,
      roundName,
      ...data
    });
  };

  // Fetch suggestions from edge function
  const fetchSuggestions = async (text: string) => {
    if (text === lastDraftRef.current) {
      return; // No change, skip
    }
    lastDraftRef.current = text;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setSuggestions([]);
    setDismissedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('suggest-evaluation-feedback', {
        body: {
          draftText: text,
          fieldType,
          rubric: { sections: rubric },
          startupContext,
          roundName,
        },
      });

      if (controller.signal.aborted) {
        return; // Request was cancelled
      }

      if (error) {
        console.error('Error fetching suggestions:', error);
        if (error.message?.includes('429')) {
          toast({
            title: "Rate limit reached",
            description: "AI suggestions temporarily unavailable. Try again in a moment.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Unable to fetch suggestions",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
        return;
      }

      const newSuggestions = data?.suggestions || [];
      setSuggestions(newSuggestions);

      trackEvent('suggestions_generated', {
        count: newSuggestions.length,
        draftLength: text.length,
      });

    } catch (error) {
      if (controller.signal.aborted) {
        return; // Ignore aborted requests
      }
      console.error('Failed to fetch suggestions:', error);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
      abortControllerRef.current = null;
    }
  };

  // Debounced effect for fetching suggestions
  useEffect(() => {
    if (!isEnabled || disabled || draftText.length < 10) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(draftText);
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [draftText, isEnabled, disabled]);

  // Handle insert suggestion
  const handleInsert = (suggestion: Suggestion, index: number) => {
    onInsertSuggestion(suggestion.text);
    
    trackEvent('suggestion_inserted', {
      suggestionText: suggestion.text,
      priority: suggestion.priority,
      index,
    });

    // Remove this suggestion from view
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handle dismiss suggestion
  const handleDismiss = (suggestion: Suggestion, index: number) => {
    const id = `${index}-${suggestion.text}`;
    setDismissedIds(prev => new Set([...prev, id]));
    
    trackEvent('suggestion_dismissed', {
      suggestionText: suggestion.text,
      priority: suggestion.priority,
      index,
    });

    // Remove this suggestion from view
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handle toggle
  const handleToggle = () => {
    toggleEnabled();
    trackEvent('ai_assist_toggled', {
      enabled: !isEnabled,
    });
  };

  if (disabled) {
    return null;
  }

  const visibleSuggestions = suggestions.filter((s, i) => 
    !dismissedIds.has(`${i}-${s.text}`)
  );

  return (
    <div className="space-y-2 mt-2">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor={`ai-assist-${fieldType}`} className="text-sm text-muted-foreground cursor-pointer">
          AI Assist
        </Label>
        <Switch
          id={`ai-assist-${fieldType}`}
          checked={isEnabled}
          onCheckedChange={handleToggle}
          className="ml-auto"
        />
      </div>

      {/* Loading indicator */}
      {isEnabled && isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Analyzing feedback...</span>
        </div>
      )}

      {/* Suggestions */}
      {isEnabled && visibleSuggestions.length > 0 && (
        <div className="space-y-2">
          {visibleSuggestions.map((suggestion, index) => (
            <div
              key={`${index}-${suggestion.text}`}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg border bg-card text-card-foreground",
                suggestion.priority === 'high' && "border-primary/50 bg-primary/5",
                suggestion.priority === 'medium' && "border-border",
                suggestion.priority === 'low' && "border-border/50"
              )}
            >
              <Lightbulb className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                suggestion.priority === 'high' && "text-primary",
                suggestion.priority === 'medium' && "text-foreground",
                suggestion.priority === 'low' && "text-muted-foreground"
              )} />
              
              <div className="flex-1 space-y-2">
                <p className="text-sm">{suggestion.text}</p>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleInsert(suggestion, index)}
                    className="h-7 text-xs"
                  >
                    Insert
                  </Button>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{suggestion.reason}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(suggestion, index)}
                    className="h-7 w-7 p-0 ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
