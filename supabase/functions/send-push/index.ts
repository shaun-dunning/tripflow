const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUNDLE_ID = "app.daywave";
const APNS_PROD_URL = "https://api.push.apple.com";
const APNS_SANDBOX_URL = "https://api.sandbox.push.apple.com";

async function generateAPNsJWT(teamId: string, keyId: string, privateKeyP8: string): Promise<string> {
  const pemContents = privateKeyP8
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const header = b64url({ alg: "ES256", kid: keyId });
  const payload = b64url({ iss: teamId, iat: Math.floor(Date.now() / 1000) });
  const signingInput = `${header}.${payload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "";
  const keyId = Deno.env.get("APNS_KEY_ID") ?? "";
  const privateKeyP8 = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
  const useSandbox = Deno.env.get("APNS_SANDBOX") === "true";

  if (!teamId || !keyId || !privateKeyP8) {
    return new Response(
      JSON.stringify({ error: "APNs secrets not configured. Set APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY in Supabase secrets." }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  let body: { deviceToken: string; title: string; body: string; deepLink?: string; badge?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { deviceToken, title, body: msgBody, deepLink, badge } = body;
  if (!deviceToken || !title || !msgBody) {
    return new Response(JSON.stringify({ error: "deviceToken, title, and body are required" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const jwt = await generateAPNsJWT(teamId, keyId, privateKeyP8);
    const apnsUrl = `${useSandbox ? APNS_SANDBOX_URL : APNS_PROD_URL}/3/device/${deviceToken}`;

    const payload: Record<string, unknown> = {
      aps: {
        alert: { title, body: msgBody },
        sound: "default",
        ...(badge !== undefined ? { badge } : {}),
      },
    };
    if (deepLink) payload.deepLink = deepLink;

    const res = await fetch(apnsUrl, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `APNs error ${res.status}`, detail: text }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
