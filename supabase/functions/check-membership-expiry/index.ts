import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createTransport } from "npm:nodemailer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Configure Nodemailer transporter with Gmail SMTP
const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: Deno.env.get("GMAIL_USER"),
    pass: Deno.env.get("GMAIL_APP_PASSWORD"),
  },
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringMembership {
  id: string;
  email: string;
  full_name: string;
  membership_expiry_date: string;
  current_membership_id: string;
}

interface MembershipPlan {
  name: string;
  price: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate target date (5 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    const targetDateString = targetDate.toISOString().split("T")[0];

    console.log(`Checking for memberships expiring on: ${targetDateString}`);

    // Find all users whose membership expires in exactly 5 days
    const { data: expiringUsers, error: queryError } = await supabase
      .from("profiles")
      .select("id, email, full_name, membership_expiry_date, current_membership_id")
      .eq("membership_expiry_date", targetDateString)
      .not("email", "is", null);

    if (queryError) {
      console.error("Error querying expiring memberships:", queryError);
      throw queryError;
    }

    if (!expiringUsers || expiringUsers.length === 0) {
      console.log("No memberships expiring in 5 days");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No memberships expiring in 5 days",
          count: 0,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${expiringUsers.length} expiring memberships`);

    // Get membership plan details for all users
    const membershipIds = [
      ...new Set(
        expiringUsers
          .map((u) => u.current_membership_id)
          .filter((id) => id !== null)
      ),
    ];

    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("id, name, price")
      .in("id", membershipIds);

    if (membershipError) {
      console.error("Error fetching membership details:", membershipError);
    }

    // Create a map of membership details
    const membershipMap = new Map<string, MembershipPlan>();
    if (memberships) {
      memberships.forEach((m) => {
        membershipMap.set(m.id, { name: m.name, price: m.price });
      });
    }

    // Send notifications
    const notifications = [];
    const errors = [];

    for (const user of expiringUsers as ExpiringMembership[]) {
      try {
        const membershipPlan = user.current_membership_id
          ? membershipMap.get(user.current_membership_id)
          : null;

        const userName = user.full_name || user.email.split("@")[0];
        const membershipName = membershipPlan?.name || "Your Membership";
        const membershipPrice = membershipPlan?.price || "Contact us";

        // Send email notification using Nodemailer
        try {
          const mailOptions = {
            from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`,
            to: user.email,
            subject: "Your Gym Membership Expires Soon",
            html: generateExpiryEmail(
              userName,
              membershipName,
              targetDateString,
              membershipPrice
            ),
          };

          await transporter.sendMail(mailOptions);
          console.log(`Sent expiry notification to ${user.email}`);
          notifications.push({
            user_id: user.id,
            email: user.email,
            status: "sent",
          });
        } catch (emailError: any) {
          console.error(
            `Failed to send email to ${user.email}:`,
            emailError.message
          );
          errors.push({
            user_id: user.id,
            email: user.email,
            error: emailError.message,
          });
        }

        // Log notification in database (optional - could create a notifications table)
        await supabase.from("membership_notifications").insert({
          user_id: user.id,
          notification_type: "expiry_warning",
          sent_at: new Date().toISOString(),
          expiry_date: user.membership_expiry_date,
        });
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errors.push({
          user_id: user.id,
          email: user.email,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiringUsers.length} expiring memberships`,
        count: expiringUsers.length,
        notifications_sent: notifications.length,
        errors: errors.length,
        details: {
          notifications,
          errors,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Fatal error in check-membership-expiry function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateExpiryEmail(
  userName: string,
  membershipName: string,
  expiryDate: string,
  membershipPrice: string | number
): string {
  const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // IMPORTANT: Replace this with your actual, publicly accessible website URL
  const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg";

  return `
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #F5F5F5; margin: 0; padding: 0;">
      <!-- Preheader text -->
      <span style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Your ${membershipName} expires in 5 days. Renew now to continue your fitness journey!
      </span>

      <div style="padding: 20px; max-width: 600px; margin: auto;">
        <div style="text-align: center; padding-bottom: 20px;">
          <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100" style="max-width: 100px;"/>
        </div>

        <div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
          <h1 style="color: #E53E3E; font-size: 22px; margin-top: 0; margin-bottom: 20px;">Your Membership Expires Soon, ${userName}!</h1>

          <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
            This is a friendly reminder that your <strong style="color: #E53E3E;">${membershipName}</strong> will expire in <strong style="color: #E53E3E;">5 days</strong>.
          </p>

          <!-- Expiry Date Box -->
          <div style="background-color: #121212; border: 1px solid #333; border-radius: 0.5rem; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; margin: 0; color: #A0A0A0;">Expiry Date</p>
            <p style="font-size: 20px; margin: 8px 0 0 0; color: #E53E3E; font-weight: bold;">${formattedDate}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
            Don't miss out on your fitness journey! Contact us to renew your membership and continue enjoying:
          </p>

          <ul style="margin: 16px 0; padding-left: 20px; color: #F5F5F5; font-size: 16px; line-height: 1.8;">
            <li>Unlimited gym access</li>
            <li>Group fitness classes</li>
            <li>Personal training sessions</li>
            <li>State-of-the-art equipment</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
            <strong>Membership Price:</strong> ${
              typeof membershipPrice === "number"
                ? `R${membershipPrice}`
                : membershipPrice
            }
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
            Have questions? Contact us at <a href="mailto:info@powerultragym.com" style="color: #E53E3E; text-decoration: none;">info@powerultragym.com</a> or call us at the gym.
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
  `;
}
