"use client";

import { useState, useEffect } from "react";
import { AdUnit } from "@/components/ad-unit";

type VerifyClientProps = {
  destinationUrl: string;
  packageTitle: string;
  destinationLabel: string;
  qualityLabel: string | null;
  audioLabel: string | null;
  sizeLabel: string | null;
  movieId: string;
  topBannerScript: string | null;
  bottomBannerScript: string | null;
  videoAdScript: string | null;
};

export function VerifyClient({
  destinationUrl,
  packageTitle,
  destinationLabel,
  qualityLabel,
  audioLabel,
  sizeLabel,
  movieId,
  topBannerScript,
  bottomBannerScript,
  videoAdScript
}: VerifyClientProps) {
  const [step, setStep] = useState<1 | 2 | 3>(videoAdScript ? 1 : 2);
  const [secondsLeft, setSecondsLeft] = useState(videoAdScript ? 30 : 10);
  const [canProceed, setCanProceed] = useState(false);
  const [clicked, setClicked] = useState(false);

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanProceed(true);
    }
  }, [secondsLeft, step]);

  const handleAction = () => {
    if (step === 1) {
      setStep(2);
      setSecondsLeft(10);
      setCanProceed(false);
    } else if (step === 2) {
      setStep(3);
      setSecondsLeft(10);
      setCanProceed(false);
    } else {
      setClicked(true);
      try {
        const storageKey = `mil:click:${movieId}:${getTodayKey()}`;
        if (sessionStorage.getItem(storageKey) !== "1") {
          sessionStorage.setItem(storageKey, "1");
          void fetch("/api/analytics/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId }),
            keepalive: true,
          }).catch(console.error);
        }
      } catch {
        void fetch("/api/analytics/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId }),
          keepalive: true,
        }).catch(console.error);
      }
      window.location.assign(destinationUrl);
    }
  };

  return (
    <div className="w-full max-w-3xl flex flex-col gap-8">
      
      {/* Top Ad Space */}
      <div className="w-full min-h-[90px] md:min-h-[250px] bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-center text-zinc-600 text-sm font-bold uppercase tracking-widest relative overflow-hidden group">
        {topBannerScript ? (
                <div className="w-full h-full p-2 z-10 relative" key={`ad-top-${step}`}>
            <AdUnit
              htmlScript={topBannerScript}
              className="w-full"
              title="Top banner"
              slotKey="verify_top"
              pageGroup="verify"
              providerType="network"
            />
          </div>
        ) : (
          <>
            <span className="z-10 group-hover:text-emerald-500 transition-colors">Top banner space (responsive)</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#111] to-[#222] opacity-50"></div>
          </>
        )}
      </div>

      {/* Main Verification Card */}
      <div className="bg-[#111] border border-[#222] rounded-[1.5rem] p-6 md:p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        
        {step === 1 ? (
          <div className="flex flex-col items-center justify-center space-y-6">
            <h2 className="text-2xl font-black text-white">Please wait while we prepare the destination</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              This helps keep the catalog workflow moving smoothly. You can continue when the timer completes.
            </p>
            <div className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg min-h-[150px] flex items-center justify-center overflow-hidden">
              {videoAdScript ? (
                <AdUnit
                  htmlScript={videoAdScript}
                  className="min-h-[150px]"
                  title="Sponsored video"
                  slotKey="video_ad"
                  pageGroup="verify"
                  providerType="network"
                />
              ) : (
                <span className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Video space</span>
              )}
            </div>
            {!canProceed ? (
              <div className="flex items-center justify-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-full border border-[#333]">
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-red-500 animate-spin"></div>
                <span className="text-sm font-bold text-red-500 uppercase tracking-widest">Continue in {secondsLeft}s</span>
              </div>
            ) : (
              <button 
                onClick={handleAction}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                Continue
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <span className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md">{packageTitle}</span>
              <span className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md">{destinationLabel}</span>
              {qualityLabel && <span className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md">{qualityLabel}</span>}
              {audioLabel && <span className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md">{audioLabel}</span>}
              {sizeLabel && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md">{sizeLabel}</span>}
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
              {step === 2 ? "Preparing Listing..." : "Opening Destination..."}
            </h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-md mx-auto">
              Please wait while we hand off to the selected destination. Do not refresh or click the back button.
            </p>

            {!canProceed ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative flex items-center justify-center h-24 w-24">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#222" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke={step === 2 ? "#0ea5e9" : "#10b981"} strokeWidth="8" 
                      strokeDasharray="283" 
                      strokeDashoffset={283 - (283 * ((10 - secondsLeft) / 10))} 
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className={`text-3xl font-black ${step === 2 ? "text-sky-400" : "text-emerald-400"}`}>{secondsLeft}</span>
                </div>
                <p className={`text-xs font-bold uppercase tracking-widest ${step === 2 ? "text-sky-500" : "text-emerald-500"} animate-pulse`}>
                  Seconds Remaining
                </p>
              </div>
            ) : (
              <div className="animate-in zoom-in-95 duration-500">
                <button 
                  onClick={handleAction}
                  disabled={clicked}
                  className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r p-1 text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all hover:scale-105 active:scale-95 ${
                    step === 2 
                      ? "from-sky-500 to-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.4)]" 
                      : "from-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  }`}
                >
                  <span className={`relative flex items-center gap-2 rounded-lg px-8 py-4 font-black uppercase tracking-widest transition-all group-hover:bg-opacity-0 ${
                    step === 2 ? "bg-sky-500" : "bg-emerald-500"
                  }`}>
                    {step === 3 && (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                    {clicked ? "Opening..." : step === 2 ? "Continue" : "Open Destination"}
                  </span>
                </button>
                <p className={`mt-4 text-xs font-semibold uppercase tracking-widest ${
                  step === 2 ? "text-sky-500/80" : "text-emerald-500/80"
                }`}>
                  {step === 2 ? "Step 2 of 3 Complete" : "Destination Ready"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Ad Space */}
      <div className="w-full min-h-[250px] bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-center text-zinc-600 text-sm font-bold uppercase tracking-widest relative overflow-hidden group">
        {bottomBannerScript ? (
          <div className="w-full h-full p-2 z-10 relative">
            <AdUnit
              htmlScript={bottomBannerScript}
              className="w-full"
              title="Bottom banner"
              slotKey="verify_bottom"
              pageGroup="verify"
              providerType="network"
            />
          </div>
        ) : (
          <>
            <span className="z-10 group-hover:text-emerald-500 transition-colors">Rectangle space (300x250)</span>
            <div className="absolute inset-0 bg-gradient-to-bl from-[#111] to-[#222] opacity-50"></div>
          </>
        )}
      </div>

    </div>
  );
}
