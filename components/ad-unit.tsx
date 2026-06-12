"use client";

import { useEffect, useMemo, useRef } from "react";

import type { MonetizationPageGroup, MonetizationProviderType, MonetizationSlotKey } from "@/lib/monetization";

type AdUnitProps = {
  htmlScript: string | null;
  className?: string;
  title?: string;
  slotKey?: MonetizationSlotKey;
  pageGroup?: MonetizationPageGroup;
  providerType?: MonetizationProviderType;
};

function buildAdDocument(markup: string, slotKey?: string, pageGroup?: string, providerType?: string) {
  const htmlAttrs = [
    slotKey ? `data-slot-key="${slotKey}"` : "",
    pageGroup ? `data-page-group="${pageGroup}"` : "",
    providerType ? `data-provider-type="${providerType}"` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<!doctype html>
<html ${htmlAttrs}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        background: transparent;
        overflow: hidden;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      * {
        max-width: 100%;
        box-sizing: border-box;
      }
    </style>
    <script>
      (function () {
        var slotKey = document.documentElement.getAttribute("data-slot-key");
        var pageGroup = document.documentElement.getAttribute("data-page-group") || "sitewide";
        var providerType = document.documentElement.getAttribute("data-provider-type") || "network";
        var hasReported = false;
        function postClick() {
          if (hasReported || !slotKey) return;
          hasReported = true;
          try {
            window.parent.postMessage({
              type: "mil-ad-slot-click",
              slotKey: slotKey,
              pageGroup: pageGroup,
              providerType: providerType
            }, "*");
          } catch (error) {}
        }
        document.addEventListener("click", postClick, true);
        document.addEventListener("touchstart", postClick, true);
      })();
    </script>
  </head>
  <body>${markup}</body>
</html>`;
}

export function AdUnit({ htmlScript, className = "", title = "Advertisement", slotKey, pageGroup, providerType = "network" }: AdUnitProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastClickDayRef = useRef<string | null>(null);

  const sanitizedSlotKey = useMemo(() => slotKey ?? null, [slotKey]);

  useEffect(() => {
    if (!slotKey || !htmlScript || htmlScript.trim() === "") {
      return;
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `mil:ad:${slotKey}:${dayKey}`;

    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        return;
      }
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Session storage is best-effort only.
    }

    void fetch("/api/analytics/ad-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotKey,
        pageGroup: pageGroup ?? "sitewide",
        providerType,
        hasCreative: true
      }),
      keepalive: true
    }).catch(() => {});
  }, [htmlScript, pageGroup, providerType, slotKey]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!sanitizedSlotKey || !iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data = event.data as { type?: string; slotKey?: string; pageGroup?: string; providerType?: string } | null;
      if (!data || data.type !== "mil-ad-slot-click" || data.slotKey !== sanitizedSlotKey) {
        return;
      }

      const dayKey = new Date().toISOString().slice(0, 10);
      if (lastClickDayRef.current === dayKey) {
        return;
      }
      lastClickDayRef.current = dayKey;

      void fetch("/api/analytics/ad-slot/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey: data.slotKey,
          pageGroup: data.pageGroup ?? pageGroup ?? "sitewide",
          providerType: data.providerType ?? providerType
        }),
        keepalive: true
      }).catch(() => {});
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pageGroup, providerType, sanitizedSlotKey]);

  if (!htmlScript || htmlScript.trim() === "") {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={`w-full border-0 bg-transparent ${className}`}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      scrolling="no"
      srcDoc={buildAdDocument(htmlScript, slotKey ?? undefined, pageGroup ?? undefined, providerType)}
      data-slot-key={slotKey ?? undefined}
      data-page-group={pageGroup ?? undefined}
      data-provider-type={providerType}
    />
  );
}
