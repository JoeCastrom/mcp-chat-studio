/**
 * URL Validator — SSRF Protection
 * Blocks requests to internal/private network destinations.
 */

import { URL } from 'url';
import { isIP } from 'net';

// Private/reserved IPv4 ranges
const PRIVATE_IPV4_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },       // RFC1918
  { start: '172.16.0.0', end: '172.31.255.255' },     // RFC1918
  { start: '192.168.0.0', end: '192.168.255.255' },   // RFC1918
  { start: '127.0.0.0', end: '127.255.255.255' },     // Loopback
  { start: '169.254.0.0', end: '169.254.255.255' },   // Link-local
  { start: '0.0.0.0', end: '0.255.255.255' },         // Current network
  { start: '100.64.0.0', end: '100.127.255.255' },    // Shared address space (CGN)
  { start: '192.0.0.0', end: '192.0.0.255' },         // IETF protocol assignments
  { start: '198.18.0.0', end: '198.19.255.255' },     // Benchmarking
  { start: '224.0.0.0', end: '239.255.255.255' },     // Multicast
  { start: '240.0.0.0', end: '255.255.255.255' },     // Reserved
];

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip) {
  const ipInt = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(range => {
    const startInt = ipToInt(range.start);
    const endInt = ipToInt(range.end);
    return ipInt >= startInt && ipInt <= endInt;
  });
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  // Loopback
  if (normalized === '::1' || normalized === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
  // Link-local
  if (normalized.startsWith('fe80:')) return true;
  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

/**
 * Validate that a URL is safe for outbound requests (not targeting internal networks).
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateOutboundUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL is empty or not a string' };
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Disallowed URL scheme: ${parsed.protocol}` };
  }

  // Block credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URLs with embedded credentials are not allowed' };
  }

  const hostname = parsed.hostname;

  // Check if hostname is a raw IP address
  if (isIP(hostname) === 4) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, reason: `Requests to private IPv4 address ${hostname} are blocked` };
    }
  } else if (isIP(hostname) === 6) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, reason: `Requests to private IPv6 address ${hostname} are blocked` };
    }
  } else {
    // It's a hostname — block well-known internal hostnames
    const lower = hostname.toLowerCase();
    const blockedHostnames = [
      'localhost',
      'localhost.localdomain',
      'metadata.google.internal',
      'metadata',
      'instance-data',
    ];
    if (blockedHostnames.includes(lower) || lower.endsWith('.local') || lower.endsWith('.internal')) {
      return { valid: false, reason: `Requests to internal hostname "${hostname}" are blocked` };
    }
  }

  // Block cloud metadata IP specifically (even if it passes the range check above, belt-and-suspenders)
  if (hostname === '169.254.169.254' || hostname === 'fd00:ec2::254') {
    return { valid: false, reason: 'Requests to cloud metadata endpoints are blocked' };
  }

  return { valid: true };
}

/**
 * Middleware-style helper: throws an Error if the URL is not safe.
 */
export function assertSafeUrl(urlString, context = '') {
  const result = validateOutboundUrl(urlString);
  if (!result.valid) {
    const prefix = context ? `[${context}] ` : '';
    throw new Error(`${prefix}SSRF protection: ${result.reason}`);
  }
}
