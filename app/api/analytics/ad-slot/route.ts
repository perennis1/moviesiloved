import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/server/lib/prisma";
import { isMonetizationPageGroup, isMonetizationProviderType, isMonetizationSlotKey } from "@/lib/monetization";

type AdSlotPayload = {
  slotKey?: string;
  pageGroup?: string;
  providerType?: string;
  hasCreative?: boolean;
};

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => null)) as AdSlotPayload | null;
    const slotKey = payload?.slotKey?.trim();
    const pageGroup = payload?.pageGroup?.trim();
    const providerType = payload?.providerType?.trim() ?? "network";
    const hasCreative = payload?.hasCreative !== false;

    if (!slotKey || !isMonetizationSlotKey(slotKey)) {
      return NextResponse.json({ error: "Missing or invalid slotKey" }, { status: 400 });
    }

    if (pageGroup && !isMonetizationPageGroup(pageGroup)) {
      return NextResponse.json({ error: "Missing or invalid pageGroup" }, { status: 400 });
    }

    if (!isMonetizationProviderType(providerType)) {
      return NextResponse.json({ error: "Missing or invalid providerType" }, { status: 400 });
    }

    const cookieStore = cookies();
    const dayKey = getDayKey();
    const cookieName = `mil_ad_${slotKey}`;

    if (cookieStore.get(cookieName)?.value === dayKey) {
      return NextResponse.json({ success: true, deduped: true });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.adSlotMetric.upsert({
      where: {
        date_slotKey: {
          date: today,
          slotKey
        }
      },
      update: hasCreative
        ? {
            impressions: { increment: 1 },
            pageGroup: pageGroup ?? "sitewide",
            providerType
          }
        : {
            impressions: { increment: 1 },
            fallbacks: { increment: 1 },
            pageGroup: pageGroup ?? "sitewide",
            providerType
          },
      create: {
        date: today,
        slotKey,
        pageGroup: pageGroup ?? "sitewide",
        providerType,
        impressions: 1,
        fallbacks: hasCreative ? 0 : 1
      }
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, dayKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (error) {
    console.error("Error tracking ad slot impression:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
