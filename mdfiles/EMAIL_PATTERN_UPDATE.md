# Email Pattern Update - Membership Expiry Notifications

## Changes Made

The membership expiry notification edge function has been updated to match the existing email pattern used throughout the application.

---

## What Changed

### 1. **Email Service: Resend → Nodemailer + Gmail**

**Before:**
```typescript
// Used Resend API
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const emailResponse = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: "Power Ultra Gym <noreply@powerultragym.com>",
    to: [user.email],
    subject: "Your Gym Membership Expires Soon",
    html: generateExpiryEmail(...)
  }),
});
```

**After:**
```typescript
// Uses Nodemailer with Gmail SMTP
import { createTransport } from "npm:nodemailer";

const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: Deno.env.get("GMAIL_USER"),
    pass: Deno.env.get("GMAIL_APP_PASSWORD"),
  },
});

const mailOptions = {
  from: `Power Ultra Gym <${Deno.env.get("GMAIL_USER")}>`,
  to: user.email,
  subject: "Your Gym Membership Expires Soon",
  html: generateExpiryEmail(...)
};

await transporter.sendMail(mailOptions);
```

### 2. **Email Design: Bright/Light Theme → Dark Theme**

**Before (Resend-style):**
- Light background (#f4f4f4)
- White card (#ffffff)
- Purple gradient header (#667eea to #764ba2)
- Dark text on light background

**After (Power Ultra Gym Theme):**
- Dark background (#121212)
- Dark card (#1A1A1A)
- Red accent color (#E53E3E) - matches gym brand
- Light text on dark background (#F5F5F5)
- Gray borders (#333)
- Muted gray for secondary text (#A0A0A0)

### 3. **Structure & Pattern Matching**

Now matches the exact pattern from:
- [send-booking-confirmation/index.ts](supabase/functions/send-booking-confirmation/index.ts)
- [send-inquiry-email/index.ts](supabase/functions/send-inquiry-email/index.ts)

**Consistent Elements:**
```html
<!-- Preheader text (hidden preview) -->
<span style="display: none; font-size: 1px; ...">
  Preview text here
</span>

<!-- Logo section -->
<div style="text-align: center; padding-bottom: 20px;">
  <img src="${LOGO_URL}" alt="Power Ultra Gym Logo" width="100"/>
</div>

<!-- Main card -->
<div style="border: 1px solid #333; border-radius: 0.5rem; padding: 30px; background-color: #1A1A1A;">
  <h1 style="color: #E53E3E; font-size: 22px; ...">Title</h1>
  <!-- Content -->
</div>

<!-- Footer -->
<div style="text-align: center; padding-top: 20px; font-size: 12px; color: #A0A0A0;">
  <p>Power Ultra Gym</p>
  <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
</div>
```

### 4. **CORS Headers Added**

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // ...
});
```

---

## Environment Variables Update

### Old Configuration (Resend)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

### New Configuration (Gmail)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

**How to Get Gmail App Password:**
1. Enable 2-Factor Authentication on Gmail
2. Google Account → Security → 2-Step Verification → App passwords
3. Generate app password for "Mail"
4. Copy the 16-character password (no spaces)

---

## Color Reference

### Power Ultra Gym Brand Colors

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Very Dark Gray | `#121212` | Email body background |
| Card Background | Dark Gray | `#1A1A1A` | Main content card |
| Primary Text | Off-White | `#F5F5F5` | Main text color |
| Accent/Brand | Red | `#E53E3E` | Headings, highlights, links |
| Borders | Medium Gray | `#333` | Card borders, dividers |
| Secondary Text | Light Gray | `#A0A0A0` | Footer, captions |

### Example Usage in Email

```html
<!-- Main heading with brand red -->
<h1 style="color: #E53E3E; font-size: 22px;">
  Your Membership Expires Soon!
</h1>

<!-- Highlighted information box -->
<div style="background-color: #121212; border: 1px solid #333; border-radius: 0.5rem; padding: 20px;">
  <p style="color: #A0A0A0;">Expiry Date</p>
  <p style="color: #E53E3E; font-weight: bold;">December 15, 2024</p>
</div>

<!-- Links -->
<a href="mailto:info@powerultragym.com" style="color: #E53E3E; text-decoration: none;">
  Contact Us
</a>
```

---

## Side-by-Side Comparison

### Old Email (Resend Style)
```
┌────────────────────────────────────┐
│    [Purple Gradient Header]        │
│      Power Ultra Gym               │
├────────────────────────────────────┤
│ [White Background]                 │
│                                    │
│ Hi John,                           │
│                                    │
│ Your membership expires soon...    │
│                                    │
│ ┌──────────────────────────────┐  │
│ │ [Light Gray Box]             │  │
│ │ Expiry: Dec 15, 2024         │  │
│ └──────────────────────────────┘  │
│                                    │
│ [Purple Button: Renew]             │
└────────────────────────────────────┘
```

### New Email (Power Ultra Style)
```
┌────────────────────────────────────┐
│ [Dark Background #121212]          │
│                                    │
│         [Logo]                     │
│                                    │
│ ┌──────────────────────────────┐  │
│ │ [Dark Card #1A1A1A]          │  │
│ │                              │  │
│ │ [Red Heading]                │  │
│ │ Your Membership Expires      │  │
│ │ Soon, John!                  │  │
│ │                              │  │
│ │ ┌────────────────────────┐  │  │
│ │ │ [Darker Box #121212]   │  │  │
│ │ │ Expiry Date            │  │  │
│ │ │ Dec 15, 2024 [Red]     │  │  │
│ │ └────────────────────────┘  │  │
│ │                              │  │
│ │ [Light text on dark]         │  │
│ └──────────────────────────────┘  │
│                                    │
│ [Gray Footer]                      │
│ © 2024 Power Ultra Gym             │
└────────────────────────────────────┘
```

---

## Benefits of This Change

### 1. **Consistency**
- All emails now use the same dark theme
- Users get a consistent brand experience
- Easier to maintain (one design system)

### 2. **Simplicity**
- Uses existing Gmail infrastructure
- No need for additional API service (Resend)
- Same SMTP setup as other emails

### 3. **Cost**
- No additional email service costs
- Uses free Gmail SMTP (within limits)
- No need to manage multiple API keys

### 4. **Maintenance**
- Changes to email design can be applied across all templates
- Single source of truth for colors and styling
- Easier onboarding for new developers

---

## Files Modified

1. **[supabase/functions/check-membership-expiry/index.ts](supabase/functions/check-membership-expiry/index.ts)**
   - Lines 1-23: Changed imports and email transporter setup
   - Lines 38-42: Added CORS handling
   - Lines 124-155: Updated email sending logic
   - Lines 206-283: Redesigned email HTML template

2. **[MEMBERSHIP_ACTIVATION_IMPLEMENTATION.md](MEMBERSHIP_ACTIVATION_IMPLEMENTATION.md)**
   - Lines 401-416: Updated environment variables section
   - Lines 671-674: Updated troubleshooting section

---

## Testing Checklist

After deploying these changes:

- [ ] Set `GMAIL_USER` environment variable
- [ ] Set `GMAIL_APP_PASSWORD` environment variable
- [ ] Deploy edge function: `supabase functions deploy check-membership-expiry`
- [ ] Test email sending manually
- [ ] Verify dark theme renders correctly in:
  - [ ] Gmail
  - [ ] Outlook
  - [ ] Apple Mail
  - [ ] Mobile email clients
- [ ] Check spam folder (shouldn't go to spam)
- [ ] Verify logo displays correctly (update LOGO_URL)
- [ ] Test on dark mode and light mode email clients

---

## Logo Configuration

**Important:** Update the logo URL in the email template:

```typescript
// In check-membership-expiry/index.ts, line 219
const LOGO_URL = "[YOUR_WEBSITE_URL]/placeholder.svg";

// Replace with:
const LOGO_URL = "https://your-actual-domain.com/logo.png";
```

The logo should be:
- Publicly accessible (not behind authentication)
- Hosted on a reliable CDN or your website
- Reasonably sized (recommend 100x100px or smaller for email)
- PNG or SVG format

---

## Summary

The membership expiry notification email now perfectly matches the existing Power Ultra Gym email pattern:
- ✅ Dark theme (#121212, #1A1A1A, #E53E3E)
- ✅ Nodemailer + Gmail SMTP
- ✅ CORS headers
- ✅ Consistent structure
- ✅ Brand colors
- ✅ Same transporter pattern

This ensures a cohesive user experience across all automated communications from the gym management system.
