import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CommunityModal } from "@/components/CommunityModal";
import { Button } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { SegmentedControl } from "@/components/layout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { captureDualDescriptors, getKioskFace } from "@/lib/synk-face";
import type { SynkIdentityStatus } from "@/lib/synk";
import { pickSynkDisplayName } from "@/lib/synk-name";

type Mode = "signin" | "link";
type Tab = "face" | "code";

type VerifyResult = {
  synk_pass: string;
  synk_assertion: string | null;
};

async function proxySynkVerify(body: Record<string, unknown>): Promise<VerifyResult> {
  const res = await fetch("/api/synk-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as VerifyResult & { error?: string };
  if (!res.ok || !data.synk_pass) {
    throw new Error(data.error || "Verification failed");
  }
  return {
    synk_pass: data.synk_pass,
    synk_assertion: data.synk_assertion ?? null,
  };
}

export function SynkVerifyModal({
  open,
  onClose,
  mode,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  onLinked?: (status: SynkIdentityStatus) => void;
}) {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<Tab>("face");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraNonce, setCameraNonce] = useState(0);
  const [synkCode, setSynkCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [secret, setSecret] = useState("");

  const stopCamera = () => {
    window.KioskFace?.stopCamera(videoRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setError("");
      setBusy(false);
      setStatus("Ready");
      setTab("face");
      setSynkCode("");
      setDateOfBirth("");
      setSecret("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "face") {
      if (open && tab === "code") stopCamera();
      return;
    }

    let cancelled = false;
    const boot = async () => {
      try {
        setError("");
        setStatus("Starting camera…");
        const face = await getKioskFace();
        if (cancelled || !videoRef.current) return;
        await face.startCamera(videoRef.current, { facingMode: "user" });
        if (cancelled) {
          face.stopCamera(videoRef.current);
          return;
        }
        setCameraReady(true);
        setStatus("Preparing face check…");
        await face.ensureFaceApi();
        if (cancelled) return;
        setStatus("Ready — look at the camera and tap Verify");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not open camera");
        setStatus("Camera unavailable — use Synk code instead");
        setTab("code");
      }
    };

    void boot();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, tab, cameraNonce]);

  const finishWithPass = async (pass: string, assertion: string | null) => {
    if (mode === "link") {
      setStatus("Linking Synk ID…");
      await api.synk.link(pass, assertion);
      const next = await api.synk.status();
      onLinked?.(next);
      onClose();
      return;
    }

    setStatus("Signing in…");
    const res = await fetch("/api/synk-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "signin",
        synk_pass: pass,
        synk_assertion: assertion,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      token_hash?: string;
      profile?: { name?: string | null };
    };
    if (!res.ok || !data.token_hash) {
      throw new Error(data.error || "Synk sign-in failed");
    }
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: "email",
    });
    if (otpError) throw otpError;

    // Apply Synk's name so setup doesn't ask for it again.
    const synkName = pickSynkDisplayName(data.profile?.name);
    if (synkName) {
      try {
        await updateProfile({ displayName: synkName });
      } catch (err) {
        console.warn("Could not save Synk display name:", err);
      }
    }

    onClose();
    navigate("/setup", { replace: true });
  };

  const onFaceVerify = async () => {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setError("");
    try {
      setStatus("Scanning…");
      const descriptors = await captureDualDescriptors(videoRef.current);
      setStatus("Checking Synk ID…");
      const result = await proxySynkVerify({ descriptors });
      await finishWithPass(result.synk_pass, result.synk_assertion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setStatus("Try again");
    } finally {
      setBusy(false);
    }
  };

  const onCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setStatus("Checking Synk ID…");
      const result = await proxySynkVerify({
        synkCode: synkCode.trim(),
        dateOfBirth,
        secret,
      });
      await finishWithPass(result.synk_pass, result.synk_assertion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setStatus("Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommunityModal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={mode === "link" ? "Link Synk ID" : "Synk ID"}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "face", label: "Face" },
            { value: "code", label: "Synk code" },
          ]}
        />

        {tab === "face" ? (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-[3/4] max-h-[22rem] w-full overflow-hidden rounded-[1rem] bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4 text-center text-[0.9375rem] text-white/90">
                  {status}
                </div>
              )}
            </div>
            <p className="text-center text-[0.875rem] text-muted">{status}</p>
            {error ? <FormError message={error} /> : null}
            <Button className="w-full" disabled={busy || !cameraReady} onClick={() => void onFaceVerify()}>
              {busy ? "Verifying…" : "Verify face"}
            </Button>
            {!cameraReady ? (
              <Button
                className="w-full"
                variant="secondary"
                disabled={busy}
                onClick={() => setCameraNonce((n) => n + 1)}
              >
                Retry camera
              </Button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={onCodeSubmit} className="space-y-1">
            <TextField
              label="Synk code or name"
              required
              autoComplete="username"
              value={synkCode}
              onChange={(e) => setSynkCode(e.target.value)}
            />
            <TextField
              label="Date of birth"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <TextField
              label="Recovery passphrase"
              type="password"
              required
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <div className="pt-3">
              {error ? <FormError message={error} /> : null}
              <Button type="submit" className="mt-3 w-full" disabled={busy}>
                {busy ? "Verifying…" : mode === "link" ? "Link Synk ID" : "Sign in with Synk ID"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </CommunityModal>
  );
}
