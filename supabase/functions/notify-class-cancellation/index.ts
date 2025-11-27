// Supabase Edge Function to notify members when a class is cancelled
// Deploy: supabase functions deploy notify-class-cancellation

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

interface NotificationPayload {
  schedule_id: string
  class_name: string
  day_of_week: string
  start_time: string
  end_time: string
  cancellation_reason?: string
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

    const { schedule_id, class_name, day_of_week, start_time, end_time, cancellation_reason } = await req.json() as NotificationPayload

    // Get all members who have booked this class
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        profiles:user_id (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('schedule_id', schedule_id)
      .in('status', ['confirmed', 'pending'])

    if (bookingsError) {
      throw bookingsError
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No active bookings found for this class',
          notified_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notifications for each affected member
    const notifications = bookings.map((booking: any) => ({
      user_id: booking.user_id,
      type: 'class_cancelled',
      title: 'Class Cancelled',
      message: `${class_name} on ${day_of_week} at ${start_time}${cancellation_reason ? ` has been cancelled. Reason: ${cancellation_reason}` : ' has been cancelled.'}`,
      related_id: schedule_id,
      is_read: false,
    }))

    // Insert notifications
    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (notificationsError) {
      throw notificationsError
    }

    // Send emails to affected members
    const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg"
    let emailsSent = 0
    let emailsFailed = 0

    for (const booking of bookings) {
      try {
        const profile = booking.profiles as any
        const memberName = profile.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : profile.email

        const mailOptions = {
          from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`,
          to: profile.email,
          subject: `Class Cancelled: ${class_name} on ${day_of_week}`,
          html: `
            <body style="font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #F5F5F5; margin: 0; padding: 0;">
              <!-- Preheader text -->
              <span style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                Your ${class_name} class on ${day_of_week} has been cancelled.
              </span>

              <div style="padding: 20px; max-width: 600px; margin: auto;">
                <div style="text-align: center; padding-bottom: 20px;">
                  <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100" style="max-width: 100px;"/>
                </div>

                <div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
                  <h1 style="color: #E53E3E; font-size: 22px; margin-top: 0; margin-bottom: 20px;">Class Cancellation Notice</h1>
                  <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                    Dear ${memberName},
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                    We regret to inform you that the following class has been cancelled:
                  </p>
                  <div style="background-color: #121212; border: 1px solid #333; border-radius: 0.5rem; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 20px; margin: 0; color: #E53E3E; font-weight: bold;">${class_name}</p>
                    <p style="font-size: 16px; margin: 8px 0 0 0; color: #A0A0A0;">${day_of_week} at ${start_time}</p>
                  </div>
                  ${cancellation_reason ? `
                    <div style="background-color: #2A1A1A; border-left: 3px solid #E53E3E; padding: 15px; margin: 20px 0;">
                      <p style="font-size: 14px; margin: 0; color: #F5F5F5;">
                        <strong>Reason:</strong> ${cancellation_reason}
                      </p>
                    </div>
                  ` : ''}
                  <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                    We sincerely apologize for any inconvenience this may cause. Your booking has been automatically cancelled, and no charges will be applied.
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                    Please check our schedule for other available classes that might interest you.
                  </p>
                  <br/>
                  <p style="font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
                    Best regards,<br/>
                    <strong>The Power Ultra Gym Team</strong>
                  </p>
                </div>

                <div style="text-align: center; padding-top: 20px; font-size: 12px; color: #A0A0A0;">
                  <p>Power Ultra Gym</p>
                  <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
                </div>
              </div>
            </body>
          `,
        }

        await transporter.sendMail(mailOptions)
        emailsSent++
      } catch (emailError) {
        console.error(`Failed to send email to ${booking.profiles?.email}:`, emailError)
        emailsFailed++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications sent successfully',
        notified_count: bookings.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
