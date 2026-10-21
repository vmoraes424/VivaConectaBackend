export interface GeoLocation {
  cidade: string;
  uf: string;
}

interface GeoCacheEntry {
  cidade: string;
  uf: string;
  timestamp: number;
}

// Cache em memória para não repetir requisições de IP repetidos (TTL de 24h)
const geoCache = new Map<string, GeoCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

function isPrivateIp(ip?: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, "").trim().toLowerCase();
  if (clean === "127.0.0.1" || clean === "::1" || clean === "localhost") return true;
  if (/^10\./.test(clean)) return true;
  if (/^192\.168\./.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (/^169\.254\./.test(clean)) return true;
  if (/^fc[0-9a-f]{2}:/i.test(clean) || /^fe80:/i.test(clean)) return true;
  return false;
}

// Node lê valores de header como latin1; a Cloudflare envia UTF-8 cru, então
// "Chapecó" chega como "ChapecÃ³". Reinterpreta os bytes como UTF-8 quando for o caso.
function fixMojibake(str: string): string {
  if (!/[Â-ô][\u0080-¿]/.test(str)) return str;
  const fixed = Buffer.from(str, "latin1").toString("utf8");
  return fixed.includes("�") ? str : fixed;
}

function decodeHeader(val?: string | string[]): string | undefined {
  if (!val) return undefined;
  const str = Array.isArray(val) ? val[0] : val;
  if (!str) return undefined;
  const raw = fixMojibake(str);
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function cleanIp(ip?: string | string[]): string {
  if (!ip) return "";
  const raw = Array.isArray(ip) ? ip[0] : ip;
  return raw.replace(/^::ffff:/, "").split(",")[0].trim();
}

/**
 * Busca localização geográfica via IP usando serviços gratuitos com timeout curto.
 */
async function fetchGeoFromIp(ip: string): Promise<GeoLocation | null> {
  const privateIp = isPrivateIp(ip);
  const cacheKey = privateIp ? "__local__" : ip;

  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { cidade: cached.cidade, uf: cached.uf };
  }

  // 1. Tenta ipwho.is (HTTPS, gratuito, alta precisão para o Brasil)
  try {
    const url = privateIp ? "https://ipwho.is/" : `https://ipwho.is/${encodeURIComponent(ip)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2000),
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        city?: string;
        region_code?: string;
        region?: string;
      };

      if (data.success !== false && data.city) {
        const result: GeoLocation = {
          cidade: data.city,
          uf: (data.region_code || data.region || "").slice(0, 2).toUpperCase(),
        };

        if (geoCache.size > MAX_CACHE_ENTRIES) {
          geoCache.clear();
        }
        geoCache.set(cacheKey, { ...result, timestamp: Date.now() });
        return result;
      }
    }
  } catch {
    // Falha silenciosa para fallback
  }

  // 2. Fallback: ip-api.com (se não for IP privado)
  if (!privateIp) {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,region`,
        {
          signal: AbortSignal.timeout(2000),
          headers: { Accept: "application/json" },
        },
      );

      if (res.ok) {
        const data = (await res.json()) as {
          status?: string;
          city?: string;
          region?: string;
        };

        if (data.status === "success" && data.city) {
          const result: GeoLocation = {
            cidade: data.city,
            uf: (data.region || "").slice(0, 2).toUpperCase(),
          };

          if (geoCache.size > MAX_CACHE_ENTRIES) {
            geoCache.clear();
          }
          geoCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch {
      // Ignora erro
    }
  }

  return null;
}

/**
 * Resolve a localização do usuário a partir dos headers da requisição (Cloudflare/CDN)
 * ou do IP público do visitante.
 */
export async function resolveGeoLocation(
  request: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
  },
  bodyOverride?: { cidade?: string; uf?: string },
): Promise<GeoLocation> {
  // 1. Se veio explicitamente no corpo da requisição (ex: testes ou client override)
  if (bodyOverride?.cidade && bodyOverride?.uf) {
    return {
      cidade: bodyOverride.cidade.trim(),
      uf: bodyOverride.uf.trim().slice(0, 2).toUpperCase(),
    };
  }

  // 2. Headers da Cloudflare (quando o domínio está sob proxy Cloudflare)
  const cfCity = decodeHeader(request.headers["cf-ipcity"]);
  const cfRegion = decodeHeader(
    request.headers["cf-region-code"] || request.headers["cf-region"],
  );

  if (cfCity) {
    return {
      cidade: cfCity,
      uf: cfRegion ? cfRegion.slice(0, 2).toUpperCase() : "BR",
    };
  }

  // 3. Resolução via IP público
  const ip = cleanIp(
    request.headers["cf-connecting-ip"] ||
      request.headers["x-forwarded-for"] ||
      request.headers["x-real-ip"] ||
      request.ip,
  );

  const geoFromIp = await fetchGeoFromIp(ip);
  if (geoFromIp) {
    return geoFromIp;
  }

  // 4. Fallback padrão caso não seja possível determinar
  return {
    cidade: bodyOverride?.cidade || "São Paulo",
    uf: bodyOverride?.uf || "SP",
  };
}
