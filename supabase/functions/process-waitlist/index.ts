// Supabase Edge Function to process waitlist when a booking is cancelled
// Deploy: supabase functions deploy process-waitlist

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configure Nodemailer transporter with Gmail SMTP credentials
const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: Deno.env.get("GMAIL_USER"),
    pass: Deno.env.get("GMAIL_APP_PASSWORD"),
  },
})

interface ProcessWaitlistPayload {
  schedule_id: string
  class_name: string
  day_of_week: string
  start_time: string
  end_time: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { schedule_id, class_name, day_of_week, start_time, end_time } = await req.json() as ProcessWaitlistPayload

    console.log(`Processing waitlist for schedule: ${schedule_id}`)

    // Get the first person on the waitlist (queue_position = 1, status = 'waiting')
    const { data: waitlistEntry, error: waitlistError } = await supabaseClient
      .from('waitlist')
      .select(`
        id,
        user_id,
        queue_position,
        profiles:user_id (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('schedule_id', schedule_id)
      .eq('status', 'waiting')
      .eq('queue_position', 1)
      .single()

    // No one on waitlist
    if (waitlistError || !waitlistEntry) {
      console.log('No one on waitlist for this class')
      return new Response(
        JSON.stringify({
          message: 'No one on waitlist',
          notified_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Update waitlist entry to 'notified' status
    const { error: updateError } = await supabaseClient
      .from('waitlist')
      .update({
        status: 'notified',
        notified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', waitlistEntry.id)

    if (updateError) {
      throw new Error(`Failed to update waitlist entry: ${updateError.message}`)
    }

    console.log(`Updated waitlist entry ${waitlistEntry.id} to notified status`)

    // Create in-app notification
    const profile = waitlistEntry.profiles as any
    const memberName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : profile.email

    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: waitlistEntry.user_id,
        type: 'waitlist_spot_available',
        title: 'Waitlist Update: Spot Available!',
        message: `A spot is now available for ${class_name} on ${day_of_week} at ${start_time}. Book within 24 hours to claim your spot!`,
        related_id: schedule_id,
        is_read: false
      })

    if (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't throw - notification failure shouldn't block waitlist processing
    } else {
      console.log('Created in-app notification')
    }

    // Send email notification
    const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg"
    let emailSent = false

    try {
      const mailOptions = {
        from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`,
        to: profile.email,
        subject: `Spot Available: ${class_name} on ${day_of_week}`,
        html: `
          <body style="font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #F5F5F5; margin: 0; padding: 0;">
            <!-- Preheader text -->
            <span style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
              A spot is available for ${class_name}! Book now before it's gone.
            </span>

            <div style="padding: 20px; max-width: 600px; margin: auto;">
              <div style="text-align: center; padding-bottom: 20px;">
                <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100" style="max-width: 100px;"/>
              </div>

              <div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
                <h1 style="color: #4ADE80; font-size: 22px; margin-top: 0; margin-bottom: 20px;">🎉 Great News, ${memberName}!</h1>
                <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                  A spot just opened up for the class you've been waiting for!
                </p>
                <div style="background-color: #121212; border: 1px solid #333; border-radius: 0.5rem; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 20px; margin: 0; color: #4ADE80; font-weight: bold;">${class_name}</p>
                  <p style="font-size: 16px; margin: 8px 0 0 0; color: #A0A0A0;">${day_of_week} at ${start_time} - ${end_time}</p>
                </div>
                <div style="background-color: #2A1A1A; border-left: 3px solid #F59E0B; padding: 15px; margin: 20px 0;">
                  <p style="font-size: 14px; margin: 0; color: #F59E0B;">
                    <strong>⏰ Time-Sensitive:</strong> You have 24 hours to book this class. After that, the spot will go to the next person on the waitlist.
                  </p>
                </div>
                <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                  Don't miss out! Log in to your dashboard now to secure your spot.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="[YOUR_WEBSITE_URL]/dashboard" style="display: inline-block; background: linear-gradient(135deg, #E53E3E 0%, #DC2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 0.5rem; font-weight: bold; font-size: 16px;">
                    Book Now
                  </a>
                </div>
                <br/>
                <p style="font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
                  Best regards,<br/>
                  <strong>The Power Ultra Gym Team</strong>
                </p>
              </div>

              <div style="text-align: center; padding-top: 20px; font-size: 12px; color: #A0A0A0;">
                <p>Power Ultra Gym</p>
                <p>This opportunity expires at ${expiresAt.toLocaleString()}</p>
                <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </body>
        `,
      }

      await transporter.sendMail(mailOptions)
      emailSent = true
      console.log(`Sent email to ${profile.email}`)
    } catch (emailError) {
      console.error(`Failed to send email to ${profile.email}:`, emailError)
      // Don't throw - email failure shouldn't block the process
    }

    return new Response(
      JSON.stringify({
        message: 'Waitlist processed successfully',
        notified_count: 1,
        email_sent: emailSent,
        member_name: memberName,
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing waitlist:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
