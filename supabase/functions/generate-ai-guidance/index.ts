import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GuidanceRequest {
  role: 'admin' | 'vc';
  userName: string;
  roundName: string;
  metrics: {
    // Juror metrics
    assignedStartups?: number;
    completedEvaluations?: number;
    draftEvaluations?: number;
    pendingEvaluations?: number;
    // CM metrics
    totalStartups?: number;
    totalJurors?: number;
    completionRate?: number;
    pendingCommunications?: number;
    unscheduledPitches?: number;
    activeJurors?: number;
  };
}

interface QuickAction {
  label: string;
  route: string;
  icon: string;
}

interface GuidanceResponse {
  guidance: string;
  priority: 'high' | 'medium' | 'low';
  quickActions: QuickAction[];
  insights: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { role, userName, roundName, metrics }: GuidanceRequest = await req.json();

    // Define valid actions based on role
    const validActions = role === 'vc' 
      ? [
          { route: '/dashboard', label: 'Go to Dashboard', icon: 'BarChart3' },
          { route: '/evaluate', label: 'Start Evaluations', icon: 'PlayCircle' },
          { route: '/evaluate', label: 'Continue Evaluations', icon: 'CheckCircle2' },
          { route: '/profile', label: 'Update Profile', icon: 'Users' }
        ]
      : [
          { route: '/dashboard', label: 'Dashboard Overview', icon: 'BarChart3' },
          { route: `/selection?round=${roundName}&tab=startup-selection`, label: 'Review Startups', icon: 'Users' },
          { route: `/selection?round=${roundName}&tab=jury-progress`, label: 'Monitor Jury Progress', icon: 'CheckCircle2' },
          { route: `/selection?round=${roundName}&tab=matchmaking`, label: 'Matchmaking', icon: 'Users' },
          { route: `/selection?round=${roundName}&tab=communications`, label: 'Communications', icon: 'Send' },
          { route: '/email-management', label: 'Email Templates', icon: 'Mail' }
        ];

    const actionLabels = validActions.map(a => a.label).join(', ');

    let systemPrompt = '';
    let userPrompt = '';

    if (role === 'vc') {
      // Juror guidance
      systemPrompt = `You are a helpful assistant guiding a juror (VC partner) through startup evaluations. 
Be encouraging, specific, and actionable. Keep messages concise and motivating.
Generate 2-3 quick action suggestions based on their progress.`;

      userPrompt = `Juror: ${userName}
Round: ${roundName}
Progress:
- Assigned startups: ${metrics.assignedStartups || 0}
- Completed evaluations: ${metrics.completedEvaluations || 0}
- Draft evaluations: ${metrics.draftEvaluations || 0}
- Pending evaluations: ${metrics.pendingEvaluations || 0}

Available actions: ${actionLabels}

Generate personalized guidance with:
1. A warm greeting
2. Progress summary with encouragement
3. Next steps suggestion
4. 2-3 action labels from the available actions list

Consider:
- If 0 completed: Encourage to start
- If 0-30% complete: Motivate to continue
- If 30-70% complete: Acknowledge progress, push to finish
- If 70-99% complete: Almost there, final push
- If 100% complete: Congratulate, suggest next phase prep`;

    } else {
      // CM guidance
      systemPrompt = `You are a strategic assistant helping a Community Manager oversee a startup evaluation program.
Be analytical, flag bottlenecks, and prioritize actions. Keep messages clear and actionable.
Suggest 2-3 high-priority actions based on round status.`;

      userPrompt = `Community Manager
Round: ${roundName}
Status:
- Total startups: ${metrics.totalStartups || 0}
- Total jurors: ${metrics.totalJurors || 0}
- Active jurors: ${metrics.activeJurors || 0}
- Overall completion rate: ${metrics.completionRate || 0}%
- Pending communications: ${metrics.pendingCommunications || 0}
- Unscheduled pitch calls: ${metrics.unscheduledPitches || 0}

Available actions: ${actionLabels}

Generate strategic guidance with:
1. Status overview
2. Bottleneck analysis
3. Priority action recommendations
4. 2-3 action labels from the available actions list

Consider:
- If completion < 30%: Flag as high priority, suggest reminders
- If pending communications > 5: Highlight communication needs
- If unscheduled pitches > 0: Direct to pitch coordination
- If completion > 90%: Prepare for round transition`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_guidance',
            description: 'Generate personalized guidance for the user',
            parameters: {
              type: 'object',
              properties: {
                guidance: {
                  type: 'string',
                  description: 'Main guidance message (2-3 sentences)'
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Priority level based on urgency'
                },
                quickActions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: `Choose 2-3 action labels from: ${actionLabels}. Return ONLY the exact labels.`
                },
                insights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2-4 key insights or highlights'
                }
              },
              required: ['guidance', 'priority', 'quickActions', 'insights'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_guidance' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const guidanceData: GuidanceResponse = JSON.parse(toolCall.function.arguments);

    // Map AI-selected labels to full action objects
    const aiLabels = guidanceData.quickActions as unknown as string[];
    const mappedActions = aiLabels
      .map(label => validActions.find(a => a.label === label))
      .filter(Boolean) as QuickAction[];

    // Fallback if mapping fails
    if (mappedActions.length === 0) {
      mappedActions.push(validActions[0]);
    }

    guidanceData.quickActions = mappedActions;

    return new Response(JSON.stringify(guidanceData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-guidance:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      guidance: 'Welcome back! Check your dashboard for the latest updates.',
      priority: 'medium',
      quickActions: [{ label: 'Go to Dashboard', route: '/dashboard', icon: 'BarChart3' }],
      insights: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
