import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTransport } from "npm:nodemailer";

// CORS headers to allow requests from your web app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      memberName,
      memberEmail,
      activationCode,
      membershipName,
      durationMonths,
      expiresAt,
    } = await req.json();

    if (!memberName || !memberEmail || !activationCode || !membershipName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Format expiry date
    const expiryDate = new Date(expiresAt);
    const formattedExpiry = expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // IMPORTANT: Replace this with your actual, publicly accessible website URL
    const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg";
    const ACTIVATION_URL = "[YOUR_WEBSITE_URL]/activate-membership";

    // Define email options with dark theme
    const mailOptions = {
      from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`,
      to: memberEmail,
      subject: `Your Membership Activation Code - ${membershipName}`,
      html: `
        <body style="font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #F5F5F5; margin: 0; padding: 0;">
          <!-- Preheader text -->
          <span style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            Your activation code for ${membershipName} is ready!
          </span>

          <div style="padding: 20px; max-width: 600px; margin: auto;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100" style="max-width: 100px;"/>
            </div>

            <div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
              <h1 style="color: #E53E3E; font-size: 22px; margin-top: 0; margin-bottom: 20px;">
                Welcome to Power Ultra Gym, ${memberName}!
              </h1>

              <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                Great news! Your <strong style="color: #E53E3E;">${membershipName}</strong> activation code is ready.
              </p>

              <!-- Activation Code Box -->
              <div style="background: linear-gradient(135deg, #E53E3E 0%, #C53030 100%); border-radius: 0.75rem; padding: 24px; margin: 24px 0; text-align: center; box-shadow: 0 4px 14px rgba(229, 62, 62, 0.3);">
                <p style="font-size: 14px; margin: 0 0 8px 0; color: #FFF; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">
                  Your Activation Code
                </p>
                <p style="font-size: 32px; font-family: 'Courier New', monospace; font-weight: bold; margin: 0; color: #FFF; letter-spacing: 2px;">
                  ${activationCode}
                </p>
              </div>

              <!-- Membership Details -->
              <div style="background-color: #121212; border: 1px solid #333; border-radius: 0.5rem; padding: 20px; margin: 20px 0;">
                <h3 style="color: #E53E3E; font-size: 16px; margin: 0 0 12px 0;">Membership Details:</h3>
                <table style="width: 100%; font-size: 15px; line-height: 1.8;">
                  <tr>
                    <td style="color: #A0A0A0; padding: 4px 0;">Plan:</td>
                    <td style="color: #F5F5F5; text-align: right; font-weight: 600;">${membershipName}</td>
                  </tr>
                  <tr>
                    <td style="color: #A0A0A0; padding: 4px 0;">Duration:</td>
                    <td style="color: #F5F5F5; text-align: right; font-weight: 600;">${durationMonths} ${durationMonths === 1 ? "month" : "months"}</td>
                  </tr>
                  <tr>
                    <td style="color: #A0A0A0; padding: 4px 0;">Code Expires:</td>
                    <td style="color: #F5F5F5; text-align: right; font-weight: 600;">${formattedExpiry}</td>
                  </tr>
                </table>
              </div>

              <!-- Instructions -->
              <div style="background: rgba(229, 62, 62, 0.1); border-left: 4px solid #E53E3E; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #E53E3E; font-size: 16px; margin: 0 0 12px 0;">How to Activate:</h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">Log in to your Power Ultra Gym account</li>
                  <li style="margin-bottom: 8px;">Navigate to the activation page</li>
                  <li style="margin-bottom: 8px;">Enter the code above</li>
                  <li style="margin-bottom: 0;">Start enjoying your membership!</li>
                </ol>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${ACTIVATION_URL}" style="display: inline-block; background: linear-gradient(135deg, #E53E3E 0%, #C53030 100%); color: #FFF; text-decoration: none; padding: 14px 32px; border-radius: 0.5rem; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(229, 62, 62, 0.3);">
                  Activate Now
                </a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; color: #A0A0A0; text-align: center;">
                This code will expire on <strong>${formattedExpiry}</strong>
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
              <p style="margin-top: 12px;">
                Need help? Contact us at
                <a href="mailto:info@powerultragym.com" style="color: #E53E3E; text-decoration: none;">info@powerultragym.com</a>
              </p>
            </div>
          </div>
        </body>
      `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return new Response(
      JSON.stringify({ message: "Activation code sent successfully", info }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending activation code email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
