import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

function getEmailTemplate(type: string, metadata: any): EmailTemplate {
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://') || '';
  
  switch (type) {
    case 'new_project':
      return {
        to: metadata.to_email,
        subject: `New Project: ${metadata.project_title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Project Available!</h2>
            <h3>${metadata.project_title}</h3>
            <p>${metadata.project_description}</p>
            ${metadata.required_skills ? `<p><strong>Required Skills:</strong> ${metadata.required_skills.join(', ')}</p>` : ''}
            <a href="${baseUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Project
            </a>
          </div>
        `,
      };
    
    case 'application_status':
      const isApproved = metadata.status === 'approved';
      return {
        to: metadata.to_email,
        subject: `Application ${isApproved ? 'Approved' : 'Rejected'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'};">
              Application ${isApproved ? 'Approved' : 'Rejected'}
            </h2>
            <p>Your application status has been updated.</p>
            ${metadata.interview_notes ? `<p><strong>Notes:</strong> ${metadata.interview_notes}</p>` : ''}
            <a href="${baseUrl}/project/${metadata.project_id}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Project
            </a>
          </div>
        `,
      };
    
    case 'deadline_reminder':
      return {
        to: metadata.to_email,
        subject: `Deadline Reminder: ${metadata.project_title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Deadline Reminder</h2>
            <h3>${metadata.project_title}</h3>
            <p>This project is due on ${new Date(metadata.deadline).toLocaleDateString()}</p>
            <p>Days remaining: ${metadata.days_remaining}</p>
            <a href="${baseUrl}/project/${metadata.project_id}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Project
            </a>
          </div>
        `,
      };
    
    default:
      return {
        to: metadata.to_email,
        subject: 'Notification from FPCP',
        html: `<p>${metadata.body || 'You have a new notification'}</p>`,
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch pending emails from queue
    const { data: emails, error: fetchError } = await supabaseClient
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      throw fetchError;
    }

    console.log(`Processing ${emails?.length || 0} emails`);

    // Process each email
    for (const email of emails || []) {
      try {
        const template = getEmailTemplate(email.template_type, {
          ...email.metadata,
          to_email: email.to_email,
        });

        // Send email using Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          },
          body: JSON.stringify({
            from: 'FPCP <onboarding@resend.dev>',
            to: [template.to],
            subject: template.subject,
            html: template.html,
          }),
        });

        if (resendResponse.ok) {
          // Mark as sent
          await supabaseClient
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);
          
          console.log(`Email sent successfully to ${template.to}`);
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email: ${errorText}`);
          
          // Mark as failed
          await supabaseClient
            .from('email_queue')
            .update({ status: 'failed' })
            .eq('id', email.id);
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Mark as failed
        await supabaseClient
          .from('email_queue')
          .update({ status: 'failed' })
          .eq('id', email.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: emails?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-emails function:', error);
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