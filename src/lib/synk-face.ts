/** Loader for Synk's KioskFace helper (`public/synk-face.js` + face-api CDN). */

type KioskFaceApi = {
  ensureFaceApi: () => Promise<unknown>;
  startCamera: (
    video: HTMLVideoElement,
    opts?: { facingMode?: string },
  ) => Promise<MediaStream>;
  stopCamera: (video?: HTMLVideoElement | null) => void;
  descriptorFromVideo: (video: HTMLVideoElement) => Promise<number[]>;
};

declare global {
  interface Window {
    KioskFace?: KioskFaceApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadSynkFaceScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.KioskFace) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-synk-face="1"]');
    if (existing) {
      if (window.KioskFace) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Synk face helper")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "/synk-face.js";
    script.async = true;
    script.dataset.synkFace = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Synk face helper"));
    document.head.appendChild(script);
  }).then(() => {
    if (!window.KioskFace) throw new Error("Synk face helper unavailable");
  });

  return scriptPromise;
}

export async function getKioskFace(): Promise<KioskFaceApi> {
  await loadSynkFaceScript();
  if (!window.KioskFace) throw new Error("Synk face helper unavailable");
  return window.KioskFace;
}

/** Two descriptors ~380ms apart for Synk's consistency check. */
export async function captureDualDescriptors(video: HTMLVideoElement): Promise<number[][]> {
  const face = await getKioskFace();
  await face.ensureFaceApi();
  const first = await face.descriptorFromVideo(video);
  await new Promise((r) => setTimeout(r, 380));
  const second = await face.descriptorFromVideo(video);
  return [first, second];
}
