import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupIds, roundType } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`[Precompute] Starting for ${startupIds?.length || 'all'} startups, round: ${roundType}`);
    
    // Fetch startups to process
    let startupsQuery = supabase
      .from('startups')
      .select('id, name, verticals, stage, regions, description');
    
    if (startupIds && startupIds.length > 0) {
      startupsQuery = startupsQuery.in('id', startupIds);
    }
    
    const { data: startups, error: startupsError } = await startupsQuery;
    
    if (startupsError) throw startupsError;
    
    // Fetch all jurors
    const { data: jurors, error: jurorsError } = await supabase
      .from('jurors')
      .select('*');
    
    if (jurorsError) throw jurorsError;
    
    // Get config hash
    const { data: config } = await supabase
      .from('matchmaking_config')
      .select('*')
      .eq('round_name', roundType === 'screening' ? 'screening' : 'pitching')
      .single();
    
    const configHash = JSON.stringify(config || {});
    
    let processedCount = 0;
    let cachedCount = 0;
    let errorCount = 0;
    
    // Process each startup
    for (const startup of startups || []) {
      try {
        // Check if cache exists for all jurors
        const { count } = await supabase
          .from('startup_juror_compatibility_cache')
          .select('*', { count: 'exact', head: true })
          .eq('startup_id', startup.id)
          .eq('round_type', roundType)
          .eq('config_hash', configHash);
        
        if (count && count === jurors?.length) {
          console.log(`[Precompute] Skipping ${startup.name} - already cached`);
          cachedCount++;
          continue;
        }
        
        console.log(`[Precompute] Processing ${startup.name}...`);
        
        // Call ai-matchmaking for this startup
        const { data: matchData, error: matchError } = await supabase.functions.invoke('ai-matchmaking', {
          body: {
            startup: {
              id: startup.id,
              name: startup.name,
              verticals: startup.verticals || [],
              stage: startup.stage || '',
              regions: startup.regions || [],
              description: startup.description || ''
            },
            jurors: jurors,
            roundType: roundType
          }
        });
        
        if (matchError) {
          console.error(`[Precompute] Error matching startup ${startup.name}:`, matchError);
          errorCount++;
          continue;
        }
        
        // Store results in cache
        const cacheRecords = matchData.scores.map((score: any) => ({
          startup_id: startup.id,
          juror_id: score.juror_id,
          round_type: roundType,
          compatibility_score: score.compatibility_score,
          confidence: score.confidence,
          brief_reasoning: score.brief_reasoning,
          recommendation: score.recommendation,
          config_hash: configHash
        }));
        
        const { error: insertError } = await supabase
          .from('startup_juror_compatibility_cache')
          .upsert(cacheRecords, {
            onConflict: 'startup_id,juror_id,round_type,config_hash'
          });
        
        if (insertError) {
          console.error(`[Precompute] Error caching scores for ${startup.name}:`, insertError);
          errorCount++;
        } else {
          console.log(`[Precompute] Cached ${cacheRecords.length} scores for ${startup.name}`);
          processedCount++;
        }
      } catch (error) {
        console.error(`[Precompute] Error processing ${startup.name}:`, error);
        errorCount++;
      }
    }
    
    console.log(`[Precompute] Complete - Processed: ${processedCount}, Cached: ${cachedCount}, Errors: ${errorCount}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        skipped_cached: cachedCount,
        errors: errorCount,
        total: startups?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Precompute] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
