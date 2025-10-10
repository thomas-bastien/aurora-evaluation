import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateVCFeedbackRequest {
  startupId: string;
  roundName: 'screening' | 'pitching';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { startupId, roundName }: GenerateVCFeedbackRequest = await req.json();

    console.log(`[Generate VC Feedback] Starting for startup ${startupId}, round ${roundName}`);

    // Fetch startup details
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('name')
      .eq('id', startupId)
      .single();

    if (startupError || !startup) {
      throw new Error(`Startup not found: ${startupError?.message}`);
    }

    // Fetch evaluations based on round
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
    
    const { data: evaluations, error: evalError } = await supabase
      .from(evaluationTable)
      .select(`
        *,
        juror:evaluator_id (
          id,
          name,
          company
        )
      `)
      .eq('startup_id', startupId)
      .eq('status', 'submitted');

    if (evalError) {
      throw new Error(`Failed to fetch evaluations: ${evalError.message}`);
    }

    if (!evaluations || evaluations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No submitted evaluations found for this startup',
          evaluationCount: 0 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Generate VC Feedback] Found ${evaluations.length} evaluations`);

    // Format VC feedback in plain text
    let plainTextFeedback = '';
    
    evaluations.forEach((evaluation: any, index: number) => {
      const jurorData = evaluation.juror;
      const vcName = jurorData?.company || 'VC Fund';
      const jurorName = jurorData?.name || 'Anonymous';
      
      plainTextFeedback += `VC fund #${index + 1} - ${vcName}\n`;
      plainTextFeedback += `Evaluator: ${jurorName}\n\n`;
      
      // Strengths
      plainTextFeedback += `Strengths of the startup:\n`;
      if (evaluation.strengths && Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0) {
        evaluation.strengths.forEach((strength: string) => {
          plainTextFeedback += `• ${strength}\n`;
        });
      } else {
        plainTextFeedback += `• No specific strengths provided\n`;
      }
      plainTextFeedback += `\n`;
      
      // Main areas that need improvement
      plainTextFeedback += `Main areas that need improvement:\n`;
      if (evaluation.improvement_areas) {
        plainTextFeedback += `${evaluation.improvement_areas}\n`;
      } else {
        plainTextFeedback += `No specific improvement areas provided\n`;
      }
      plainTextFeedback += `\n`;
      
      // Aspects of the pitch that need further development
      plainTextFeedback += `Aspects of the pitch that need further development:\n`;
      if (evaluation.pitch_development_aspects) {
        plainTextFeedback += `${evaluation.pitch_development_aspects}\n`;
      } else {
        plainTextFeedback += `No specific pitch development aspects provided\n`;
      }
      plainTextFeedback += `\n`;
      
      // Key areas the team should focus on
      plainTextFeedback += `Key areas the team should focus on:\n`;
      if (evaluation.overall_notes) {
        plainTextFeedback += `${evaluation.overall_notes}\n`;
      } else {
        plainTextFeedback += `No specific focus areas provided\n`;
      }
      plainTextFeedback += `\n`;
      
      // Additional comments
      plainTextFeedback += `Additional comments:\n`;
      if (evaluation.recommendation) {
        plainTextFeedback += `${evaluation.recommendation}\n`;
      } else {
        plainTextFeedback += `No additional comments provided\n`;
      }
      
      // Add separator between VCs (except for the last one)
      if (index < evaluations.length - 1) {
        plainTextFeedback += `\n${'='.repeat(60)}\n\n`;
      }
    });

    // Store in database
    const { data: storedFeedback, error: storeError } = await supabase
      .from('startup_vc_feedback_details')
      .upsert({
        startup_id: startupId,
        round_name: roundName,
        plain_text_feedback: plainTextFeedback,
        evaluation_count: evaluations.length,
        is_approved: false,
        approved_by: null,
        approved_at: null,
      }, {
        onConflict: 'startup_id,round_name'
      })
      .select()
      .single();

    if (storeError) {
      console.error('[Generate VC Feedback] Error storing feedback:', storeError);
      throw new Error(`Failed to store VC feedback: ${storeError.message}`);
    }

    console.log(`[Generate VC Feedback] Successfully generated and stored feedback`);

    return new Response(
      JSON.stringify({
        success: true,
        plainTextFeedback,
        evaluationCount: evaluations.length,
        feedbackId: storedFeedback.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[Generate VC Feedback] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
