import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateSpec {
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  lifecycle_stage?: string | null;
  evaluation_phase?: 'screening' | 'pitching' | null;
  display_order?: number | null;
  is_active: boolean;
  trigger_priority?: number;
}

const baseWrapperStart = `
  <div style="background:#0b1020;padding:32px 0;">
    <div style="max-width:680px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden;">
      <div style="padding:24px;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:12px;color:#e2e8f0;">
        <span style="font-weight:700;letter-spacing:.5px;">Aurora Evaluation Program</span>
      </div>
      <div style="padding:24px;color:#e2e8f0;line-height:1.65;">
`;
const baseWrapperEnd = `
      </div>
      <div style="padding:18px 24px;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">
        This message was sent by Aurora. Questions? Reply to this email.
      </div>
    </div>
  </div>
`;

const templates: TemplateSpec[] = [
  {
    name: 'Pitch Scheduling',
    category: 'pitch_scheduling',
    subject_template: '🚀 Time to Schedule Your Pitch Sessions!',
    variables: ['startup_name','juror_count','jurors_html'],
    lifecycle_stage: 'pitch_scheduling',
    evaluation_phase: 'pitching',
    display_order: 13,
    is_active: true,
    trigger_priority: 1,
    body_template:
      baseWrapperStart +
      `
        <h1 style="margin:0 0 12px 0;font-size:22px;">Hi {{startup_name}}, let’s schedule your pitch</h1>
        <p>You’ve been matched with our VC partners. Pick a time with each using their links below.</p>
        <p><strong>Total VCs:</strong> {{juror_count}}</p>
        <div style="margin-top:16px;">{{jurors_html}}</div>
      ` +
      baseWrapperEnd,
  },
  {
    name: 'Founder Selection',
    category: 'founder_selection',
    subject_template: "🎉 Congratulations! You've been selected for the Pitching Round",
    variables: ['startup_name','feedback_summary','next_steps'],
    lifecycle_stage: 'screening_selected',
    evaluation_phase: 'screening',
    display_order: 16,
    is_active: true,
    trigger_priority: 1,
    body_template:
      baseWrapperStart +
      `
        <h1 style="margin:0 0 12px 0;font-size:22px;">Congrats {{startup_name}} — you’re moving forward!</h1>
        <p>Here’s a brief summary of feedback from the screening round:</p>
        <div style="background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:12px 14px;margin:12px 0;">{{feedback_summary}}</div>
        <p>{{next_steps}}</p>
      ` +
      baseWrapperEnd,
  },
  {
    name: 'Founder Rejection',
    category: 'founder_rejection',
    subject_template: 'Thank you for participating in our evaluation process',
    variables: ['startup_name','feedback_summary','encouragement_message'],
    lifecycle_stage: 'screening_rejected',
    evaluation_phase: 'screening',
    display_order: 17,
    is_active: true,
    trigger_priority: 1,
    body_template:
      baseWrapperStart +
      `
        <h1 style="margin:0 0 12px 0;font-size:22px;">Thank you, {{startup_name}}</h1>
        <p>We appreciate your time and effort. While you won’t proceed to pitching this time, here’s a brief summary:</p>
        <div style="background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:12px 14px;margin:12px 0;">{{feedback_summary}}</div>
        <p>{{encouragement_message}}</p>
      ` +
      baseWrapperEnd,
  },
  {
    name: 'Juror Screening Complete - Pitching Assignments Coming',
    category: 'juror_phase_transition',
    subject_template: 'Screening Complete - Pitching Round Assignments Coming Soon',
    variables: ['juror_name','evaluation_count','next_steps'],
    lifecycle_stage: 'screening_complete',
    evaluation_phase: 'screening',
    display_order: 14,
    is_active: true,
    trigger_priority: 1,
    body_template:
      baseWrapperStart +
      `
        <h1 style="margin:0 0 12px 0;font-size:22px;">Thank you, {{juror_name}}</h1>
        <p>You’ve completed {{evaluation_count}} screening evaluations. We’re preparing pitching assignments next.</p>
        <p>{{next_steps}}</p>
      ` +
      baseWrapperEnd,
  },
  {
    name: 'Juror Round Transition - Generic',
    category: 'juror_phase_transition',
    subject_template: 'Round Transition: {{from_round}} → {{to_round}}',
    variables: ['juror_name','from_round','to_round'],
    lifecycle_stage: 'round_transition',
    evaluation_phase: null,
    display_order: 15,
    is_active: true,
    trigger_priority: 2,
    body_template:
      baseWrapperStart +
      `
        <h1 style="margin:0 0 12px 0;font-size:22px;">Next up: {{to_round}}</h1>
        <p>Hi {{juror_name}}, we’re transitioning from {{from_round}} to {{to_round}}. Details will follow shortly.</p>
      ` +
      baseWrapperEnd,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let inserted = 0;
    let updated = 0;
    const results: Array<{ name: string; action: 'inserted' | 'updated' }> = [];

    for (const t of templates) {
      const { data: existing, error: fetchErr } = await supabase
        .from('email_templates')
        .select('id')
        .eq('name', t.name)
        .maybeSingle();

      if (fetchErr) {
        console.error('Fetch error for template', t.name, fetchErr);
      }

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from('email_templates')
          .update({
            category: t.category,
            subject_template: t.subject_template,
            body_template: t.body_template,
            variables: t.variables,
            lifecycle_stage: t.lifecycle_stage ?? null,
            evaluation_phase: t.evaluation_phase ?? null,
            display_order: t.display_order ?? null,
            is_active: t.is_active,
            trigger_priority: t.trigger_priority ?? 1,
          })
          .eq('id', existing.id);
        if (updErr) throw updErr;
        updated++;
        results.push({ name: t.name, action: 'updated' });
      } else {
        const { error: insErr } = await supabase
          .from('email_templates')
          .insert({
            name: t.name,
            category: t.category,
            subject_template: t.subject_template,
            body_template: t.body_template,
            variables: t.variables,
            lifecycle_stage: t.lifecycle_stage ?? null,
            evaluation_phase: t.evaluation_phase ?? null,
            display_order: t.display_order ?? null,
            is_active: t.is_active,
            trigger_priority: t.trigger_priority ?? 1,
          });
        if (insErr) throw insErr;
        inserted++;
        results.push({ name: t.name, action: 'inserted' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, updated, results }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error('ensure-email-templates error', e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});