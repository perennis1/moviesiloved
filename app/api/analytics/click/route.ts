import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/server/lib/prisma";

export async function POST(req: Request) {
  try {
    const { movieId } = await req.json();

    if (!movieId) {
      return NextResponse.json({ error: "Missing movieId" }, { status: 400 });
    }

    const cookieStore = cookies();
    const dayKey = new Date().toISOString().slice(0, 10);
    const cookieName = `mil_click_${movieId}`;

    if (cookieStore.get(cookieName)?.value === dayKey) {
      return NextResponse.json({ success: true, deduped: true });
    }

    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.$transaction([
      prisma.movie.update({
        where: { id: movieId },
        data: { clicks: { increment: 1 } },
      }),
      prisma.dailyMetric.upsert({
        where: {
          date_movieId: {
            date: today,
            movieId,
          },
        },
        update: {
          clicks: { increment: 1 },
        },
        create: {
          date: today,
          movieId,
          views: 0,
          clicks: 1,
        },
      }),
    ]);

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, dayKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Error tracking click:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
