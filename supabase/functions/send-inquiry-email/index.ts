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
    user: Deno.env.get("GMAIL_USER"), // Your Gmail address
    pass: Deno.env.get("GMAIL_APP_PASSWORD"), // Your generated App Password
  },
});

serve(async (req: Request) => {
  // This is needed if you're deploying functions from a browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Name and email are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // IMPORTANT: Replace this with your actual, publicly accessible website URL
    const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg";

    // Define email options with redesigned themed HTML
    const mailOptions = {
      from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`, // Display name and your Gmail address
      to: email,
      subject: "Membership Inquiry Received!",
      html: `
        <body style="font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #F5F5F5; margin: 0; padding: 0;">
          <!-- Preheader text -->
          <span style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            We've received your inquiry and will be in touch shortly!
          </span>
          
          <div style="padding: 20px; max-width: 600px; margin: auto;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100" style="max-width: 100px;"/>
            </div>

            <div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
              <h1 style="color: #E53E3E; font-size: 22px; margin-top: 0; margin-bottom: 20px;">Thank You for Your Inquiry, ${name}!</h1>
              <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                We have received your inquiry for a membership at <strong>Power Ultra Gym</strong>.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                Our team will review your information and get in touch with you shortly to discuss the next steps.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 16px 0;">
                Thank you for your interest in joining our community!
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
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ message: "Email sent successfully", info }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
