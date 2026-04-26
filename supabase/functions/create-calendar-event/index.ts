import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64url(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlStr(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN .*-----/, '').replace(/-----END .*-----/, '').replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function createJWT(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar.events', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };
  const headerB64 = base64urlStr(JSON.stringify(header));
  const payloadB64 = base64urlStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const keyData = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createJWT(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Token exchange failed [${res.status}]: ${await res.text()}`);
  return (await res.json()).access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

    const { naam, email, telefoon, doel, voorkeur, bericht, selectedSlot, type = 'intake', duration = 45 } = await req.json();

    if (!naam || !email) {
      return new Response(JSON.stringify({ error: 'naam and email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify a matching booking exists in the database before creating calendar event
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: intakeMatch } = await supabaseAdmin
      .from('intake_requests')
      .select('id')
      .eq('email', email)
      .eq('naam', naam)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: ptMatch } = await supabaseAdmin
      .from('pt_bookings')
      .select('id')
      .eq('email', email)
      .eq('naam', naam)
      .order('created_at', { ascending: false })
      .limit(1);

    if ((!intakeMatch || intakeMatch.length === 0) && (!ptMatch || ptMatch.length === 0)) {
      return new Response(JSON.stringify({ error: 'No matching booking found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccount = JSON.parse(saJson);
    const accessToken = await getAccessToken(serviceAccount);

    // Parse slot: "2026-05-01|08:00-20:00" or legacy "1|08:00-10:00"
    let startTime: Date;
    let endTime: Date;

    if (selectedSlot) {
      const dateMatch = selectedSlot.match(/^(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      const legacyMatch = selectedSlot.match(/^(\d+)\|(\d{2}:\d{2}):?\d*-(\d{2}:\d{2})$/);

      if (dateMatch) {
        const [, dateStr, startStr, endStr] = dateMatch;
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        startTime = new Date(`${dateStr}T${startStr}:00`);
        // For the calendar event, use duration parameter to set end time
        endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      } else if (legacyMatch) {
        const dayOfWeek = parseInt(legacyMatch[1]);
        const [startH, startM] = legacyMatch[2].split(':').map(Number);
        startTime = new Date();
        const currentDay = startTime.getDay();
        let daysUntil = dayOfWeek - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        startTime.setDate(startTime.getDate() + daysUntil);
        startTime.setHours(startH, startM, 0, 0);
        endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      } else {
        startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        startTime.setMinutes(0, 0, 0);
        endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      }
    } else {
      startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      startTime.setMinutes(0, 0, 0);
      endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    }

    const eventTitle = type === 'pt_sessie' ? `PT-sessie - ${naam}` : `Intake gesprek - ${naam}`;
    const durationLabel = type === 'pt_sessie' ? '60 min' : '45 min';

    const description = [
      `📞 Telefoon: ${telefoon}`,
      `⏱ Duur: ${durationLabel}`,
      doel ? `🎯 Doel: ${doel}` : '',
      voorkeur ? `🕐 Voorkeur: ${voorkeur}` : '',
      bericht ? `💬 Bericht: ${bericht}` : '',
    ].filter(Boolean).join('\n');

    const event = {
      summary: eventTitle,
      description,
      start: { dateTime: startTime.toISOString(), timeZone: 'Europe/Amsterdam' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Europe/Amsterdam' },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }] },
    };

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error('Google Calendar API error:', errText);
      throw new Error(`Calendar API failed [${calRes.status}]: ${errText}`);
    }

    const calEvent = await calRes.json();
    console.log('Calendar event created:', calEvent.id);

    return new Response(JSON.stringify({ success: true, eventId: calEvent.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
