function htmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineJson(value: string): string {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function createOidcContinuationResponse(
  returnTo: string,
  nonce: string,
  cookies: readonly string[],
): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-security-policy": [
      "default-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      `script-src 'nonce-${nonce}'`,
    ].join("; "),
    "content-type": "text/html; charset=utf-8",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  const body = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Continue</title>",
    "</head>",
    "<body>",
    `<p><a href="${htmlAttribute(returnTo)}">Continue</a></p>`,
    `<script nonce="${nonce}">location.replace(${inlineJson(returnTo)});</script>`,
    "</body>",
    "</html>",
  ].join("");
  return new Response(body, { headers, status: 200 });
}
