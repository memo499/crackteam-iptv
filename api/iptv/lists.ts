import mysql from "mysql2/promise";

type Channel = { name: string; url: string; group?: string; logo?: string };

function getSessionToken(req: any) {
  const authorization = String(req.headers?.authorization ?? "");
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = String(req.headers?.cookie ?? "");
  return cookie.match(/(?:^|;\s*)ct_iptv_session=([^;]+)/)?.[1] ?? "";
}

function parseM3u(input: string): Channel[] {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const channels: Channel[] = [];
  let pending: Omit<Channel, "url"> | null = null;
  for (const line of lines) {
    if (line.toUpperCase().startsWith("#EXTINF:")) {
      const comma = line.indexOf(",");
      const attrs = comma >= 0 ? line.slice(8, comma) : line.slice(8);
      const name = comma >= 0 ? line.slice(comma + 1).trim() : "Kanal";
      const group = attrs.match(/group-title=["']([^"']*)["']/i)?.[1];
      const logo = attrs.match(/(?:tvg-logo|logo)=["']([^"']*)["']/i)?.[1];
      pending = { name: name || "Kanal", group, logo };
    } else if (!line.startsWith("#") && pending) {
      channels.push({ ...pending, url: line });
      pending = null;
    }
  }
  if (channels.length) return channels.slice(0, 5000);
  // Some providers return a minimal playlist containing only stream URLs.
  return lines.filter((line) => /^https?:\/\//i.test(line)).slice(0, 5000).map((url, index) => ({ name: `Kanal ${index + 1}`, url }));
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function providerApiUrl(value: string) {
  const url = new URL(value);
  if (!isHttpUrl(url.toString())) throw new Error("Provider link must use HTTP or HTTPS");
  const path = url.pathname.toLowerCase();
  if (path.endsWith("/player_api.php")) return url;
  if (path.endsWith("/get.php") || path.endsWith("/xmltv.php")) url.pathname = path.slice(0, path.lastIndexOf("/")) + "/player_api.php";
  else url.pathname = `${url.pathname.replace(/\/$/, "")}/player_api.php`;
  url.search = "";
  return url;
}

async function ensureTable(connection: mysql.Connection) {
  await connection.execute(`CREATE TABLE IF NOT EXISTS iptvLists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accountUsername VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sourceType ENUM('m3u','credentials') NOT NULL,
    sourceUrl TEXT NULL,
    providerUsername VARCHAR(255) NULL,
    providerPassword VARCHAR(255) NULL,
    providerLink TEXT NULL,
    channels LONGTEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX iptvLists_accountUsername_idx (accountUsername)
  )`);
}

export default async function handler(req: any, res: any) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ ok: false, error: "Method not allowed" });
  const sessionToken = getSessionToken(req);
  if (!sessionToken) return res.status(401).json({ ok: false, error: "Login required" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, error: "Database is not configured" });
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    await ensureTable(connection);
    const [accounts] = await connection.execute<any[]>("SELECT username FROM iptvAccounts WHERE sessionToken = ? LIMIT 1", [sessionToken]);
    const account = accounts[0];
    if (!account) return res.status(401).json({ ok: false, error: "Invalid session" });
    if (req.method === "GET") {
      const [rows] = await connection.execute<any[]>("SELECT id, name, sourceType, sourceUrl, providerLink, channels, createdAt FROM iptvLists WHERE accountUsername = ? ORDER BY createdAt DESC", [account.username]);
      return res.status(200).json({ ok: true, lists: rows.map((row) => ({ ...row, channels: JSON.parse(row.channels || "[]") })) });
    }
    const body = req.body ?? {};
    const sourceType = body.sourceType === "credentials" ? "credentials" : "m3u";
    const name = String(body.name || (sourceType === "m3u" ? "M3U listesi" : "Xtream IPTV")).trim().slice(0, 255);
    let sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : null;
    let providerLink = body.providerLink ? String(body.providerLink).trim() : null;
    let providerUsername = body.providerUsername ? String(body.providerUsername).trim() : null;
    let providerPassword = body.providerPassword ? String(body.providerPassword) : null;
    let channels: Channel[] = [];
    if (sourceType === "m3u") {
      const raw = String(body.m3uText || "").trim();
      if (!raw) return res.status(400).json({ ok: false, error: "M3U content or URL is required" });
      if (/^https?:\/\//i.test(raw)) {
        sourceUrl = raw;
        const response = await fetch(raw, { redirect: "follow", signal: AbortSignal.timeout(15000) });
        if (!response.ok) return res.status(400).json({ ok: false, error: "M3U URL could not be downloaded" });
        channels = parseM3u((await response.text()).slice(0, 10_000_000));
      } else {
        channels = parseM3u(raw);
      }
      if (!channels.length) return res.status(400).json({ ok: false, error: "No channels found in M3U" });
    } else {
      if (!providerLink || !providerUsername || !providerPassword) return res.status(400).json({ ok: false, error: "Provider link, username and password are required" });
      const apiUrl = providerApiUrl(providerLink);
      apiUrl.searchParams.set("username", providerUsername);
      apiUrl.searchParams.set("password", providerPassword);
      apiUrl.searchParams.set("action", "get_live_streams");
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const payload: any = await response.json().catch(() => null);
        const streams = Array.isArray(payload) ? payload : Array.isArray(payload?.available_channels) ? payload.available_channels : Array.isArray(payload?.live_streams) ? payload.live_streams : [];
        channels = streams.slice(0, 5000).map((item: any) => {
          const streamId = item.stream_id ?? item.id;
          const fallbackUrl = streamId !== undefined && streamId !== null ? `${apiUrl.origin}/live/${encodeURIComponent(providerUsername)}/${encodeURIComponent(providerPassword)}/${encodeURIComponent(String(streamId))}.ts` : "";
          return { name: String(item.name ?? item.stream_name ?? "Kanal"), url: String(item.stream_url ?? item.url ?? item.direct_source ?? fallbackUrl), group: item.category_name ? String(item.category_name) : undefined, logo: item.stream_icon ? String(item.stream_icon) : undefined };
        }).filter((item: Channel) => isHttpUrl(item.url));
      }
      // Standard Xtream panels expose a get.php M3U endpoint when the API
      // response is empty or uses a non-standard stream field.
      if (!channels.length) {
        const playlistUrl = new URL(providerLink);
        playlistUrl.pathname = `${playlistUrl.pathname.replace(/\/$|\/player_api\.php$|\/get\.php$/i, "")}/get.php`;
        playlistUrl.search = "";
        playlistUrl.searchParams.set("username", providerUsername);
        playlistUrl.searchParams.set("password", providerPassword);
        playlistUrl.searchParams.set("type", "m3u_plus");
        playlistUrl.searchParams.set("output", "ts");
        const playlistResponse = await fetch(playlistUrl, { redirect: "follow", signal: AbortSignal.timeout(15000) });
        if (playlistResponse.ok) channels = parseM3u((await playlistResponse.text()).slice(0, 10_000_000));
      }
      if (!channels.length) return res.status(400).json({ ok: false, error: "Provider connected but returned no live channels" });
    }
    await connection.execute("INSERT INTO iptvLists (accountUsername, name, sourceType, sourceUrl, providerUsername, providerPassword, providerLink, channels) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [account.username, name, sourceType, sourceUrl, providerUsername, providerPassword, providerLink, JSON.stringify(channels)]);
    return res.status(201).json({ ok: true, name, sourceType, channelCount: channels.length, channels });
  } catch (error) {
    console.error("[iptv/lists] failed", error);
    return res.status(503).json({ ok: false, error: "IPTV list could not be saved" });
  } finally {
    await connection?.end().catch(() => undefined);
  }
}
