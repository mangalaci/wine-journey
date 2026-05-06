import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.wineProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(
    profile ?? { likedWines: [], dislikedWines: [], sessionCount: 0 }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { likedWines, dislikedWines, sessionCount } = await req.json() as {
    likedWines: unknown;
    dislikedWines: unknown;
    sessionCount: number;
  };

  const profile = await prisma.wineProfile.upsert({
    where: { userId: session.user.id },
    update: { likedWines, dislikedWines, sessionCount },
    create: { userId: session.user.id, likedWines, dislikedWines, sessionCount },
  });

  return NextResponse.json(profile);
}
