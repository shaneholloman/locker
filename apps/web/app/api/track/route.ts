import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@openstore/database/client';
import { trackedLinks, trackedLinkEvents } from '@openstore/database';
import { eq } from 'drizzle-orm';
import {
  parseUserAgent,
  resolveGeoFromIp,
  getClientIp,
} from '@/lib/tracking';

// POST /api/track — records a view event for a tracked link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, visitorId, email, eventType } = body as {
      token?: string;
      visitorId?: string;
      email?: string;
      eventType?: string;
    };

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const db = getDb();
    const [link] = await db
      .select({ id: trackedLinks.id, isActive: trackedLinks.isActive })
      .from(trackedLinks)
      .where(eq(trackedLinks.token, token));

    if (!link || !link.isActive) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const headers = req.headers;
    const ip = getClientIp(headers);
    const ua = headers.get('user-agent') ?? '';
    const referer = headers.get('referer');
    const language = headers.get('accept-language')?.split(',')[0] ?? null;

    const parsed = parseUserAgent(ua);

    // Resolve geo in the background — don't block the response
    const geo = ip ? await resolveGeoFromIp(ip) : null;

    // Extract UTM params from referer or from body
    const url = body.pageUrl ? new URL(body.pageUrl) : null;
    const utmSource =
      url?.searchParams.get('utm_source') ?? body.utmSource ?? null;
    const utmMedium =
      url?.searchParams.get('utm_medium') ?? body.utmMedium ?? null;
    const utmCampaign =
      url?.searchParams.get('utm_campaign') ?? body.utmCampaign ?? null;

    await db.insert(trackedLinkEvents).values({
      trackedLinkId: link.id,
      eventType: eventType === 'download' ? 'download' : 'view',
      visitorId: visitorId ?? null,
      email: email ?? null,
      ipAddress: ip,
      country: geo?.country ?? null,
      countryCode: geo?.countryCode ?? null,
      region: geo?.region ?? null,
      city: geo?.city ?? null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      userAgent: ua || null,
      browser: parsed.browser,
      browserVersion: parsed.browserVersion,
      os: parsed.os,
      osVersion: parsed.osVersion,
      deviceType: parsed.deviceType,
      referrer: referer ?? body.referrer ?? null,
      utmSource,
      utmMedium,
      utmCampaign,
      language,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}

// PATCH /api/track — updates duration for an existing event (beacon)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, durationSeconds } = body as {
      eventId?: string;
      durationSeconds?: number;
    };

    if (!eventId || typeof durationSeconds !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = getDb();
    await db
      .update(trackedLinkEvents)
      .set({ durationSeconds })
      .where(eq(trackedLinkEvents.id, eventId));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
