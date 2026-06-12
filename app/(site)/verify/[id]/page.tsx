import { notFound } from "next/navigation";
import { prisma } from "@/server/lib/prisma";
import { getMonetizationConfig, getMonetizationSlot } from "@/server/lib/monetization";
import { VerifyClient } from "./verify-client"; // Force TS re-check

type VerifyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;

  const releaseDestination = await prisma.releaseDestination.findUnique({
    where: { id },
    include: {
      package: {
        include: {
          movie: true
        }
      }
    }
  });

  const watchLink = releaseDestination
    ? null
    : await prisma.watchLink.findUnique({
        where: { id },
        include: { movie: true }
      });

  if (!releaseDestination && (!watchLink || watchLink.type !== "DOWNLOAD")) {
    notFound();
  }

  const movie = releaseDestination ? releaseDestination.package.movie : watchLink!.movie;
  const packageTitle = releaseDestination
    ? releaseDestination.package.title
    : watchLink!.seasonLabel || watchLink!.platform || watchLink!.movie.title;
  const destinationLabel = releaseDestination
    ? releaseDestination.label
    : watchLink!.linkLabel || watchLink!.platform;
  const qualityLabel = releaseDestination ? releaseDestination.package.qualityLabel : watchLink!.quality;
  const audioLabel = releaseDestination ? releaseDestination.package.audioLabel : watchLink!.language;
  const sizeLabel = releaseDestination ? releaseDestination.package.sizeLabel : watchLink!.price;

  const monetizationConfig = await getMonetizationConfig();
  const verifyTopSlot = getMonetizationSlot(monetizationConfig, "verify_top");
  const verifyBottomSlot = getMonetizationSlot(monetizationConfig, "verify_bottom");
  const videoAdSlot = getMonetizationSlot(monetizationConfig, "video_ad");

  // We are going to pass the URL to the client. 
  // For a basic ad-wall, this is sufficient.
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#111] py-4">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-xl font-black text-sky-400 tracking-wider uppercase">
            Fast Server Verification
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Verifying your request for: {movie.title}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <VerifyClient 
          destinationUrl={releaseDestination ? releaseDestination.url : watchLink!.url} 
          packageTitle={packageTitle}
          destinationLabel={destinationLabel}
          qualityLabel={qualityLabel}
          audioLabel={audioLabel}
          sizeLabel={sizeLabel}
          movieId={releaseDestination ? releaseDestination.package.movieId : watchLink!.movieId}
          topBannerScript={verifyTopSlot.enabled ? verifyTopSlot.snippet : null}
          bottomBannerScript={verifyBottomSlot.enabled ? verifyBottomSlot.snippet : null}
          videoAdScript={videoAdSlot.enabled ? videoAdSlot.snippet : null}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] bg-[#111] py-6 mt-12 text-center text-xs text-zinc-600">
        <p>Please do not close this page while verifying.</p>
        <p className="mt-1">By proceeding, you agree to the Terms of Service.</p>
      </footer>
    </div>
  );
}
