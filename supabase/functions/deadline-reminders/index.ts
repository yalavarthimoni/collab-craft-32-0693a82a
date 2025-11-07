import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current date
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find projects with upcoming deadlines that haven't been reminded recently
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('id, title, description, deadline, owner_id, last_reminder_sent')
      .neq('status', 'completed')
      .not('deadline', 'is', null)
      .lte('deadline', threeDaysFromNow.toISOString())
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      throw projectsError;
    }

    console.log(`Found ${projects?.length || 0} projects with upcoming deadlines`);

    // Process each project
    for (const project of projects || []) {
      const deadline = new Date(project.deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get project owner
      const { data: owner } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', project.owner_id)
        .single();

      // Get project members
      const { data: members } = await supabaseClient
        .from('project_members')
        .select('user_id, profiles!inner(email, full_name)')
        .eq('project_id', project.id)
        .eq('status', 'approved');

      // Check email preferences and queue emails
      const recipients = [
        { email: owner?.email, user_id: project.owner_id },
        ...(members?.map(m => ({ 
          email: m.profiles?.email, 
          user_id: m.user_id 
        })) || [])
      ].filter(r => r.email);

      for (const recipient of recipients) {
        // Check if user wants deadline reminders
        const { data: prefs } = await supabaseClient
          .from('email_preferences')
          .select('deadline_reminders')
          .eq('user_id', recipient.user_id)
          .maybeSingle();

        if (prefs?.deadline_reminders !== false) {
          // Queue email
          await supabaseClient
            .from('email_queue')
            .insert({
              to_email: recipient.email,
              subject: `Deadline Reminder: ${project.title}`,
              body: `The project "${project.title}" is due in ${daysRemaining} day(s).`,
              template_type: 'deadline_reminder',
              metadata: {
                project_id: project.id,
                project_title: project.title,
                deadline: project.deadline,
                days_remaining: daysRemaining,
                to_email: recipient.email,
              },
            });
        }
      }

      // Update last_reminder_sent
      await supabaseClient
        .from('projects')
        .update({ last_reminder_sent: now.toISOString() })
        .eq('id', project.id);
    }

    // Trigger send-emails function
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        projects_processed: projects?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in deadline-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});