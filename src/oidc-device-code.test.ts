import { describe, expect, test } from "bun:test";

import {
  initiateSuiteOidcDeviceAuthorization,
  parseDeviceAuthorizationResponse,
  parseDeviceTokenResponse,
  pollSuiteOidcDeviceToken,
  type SuiteOidcDeviceAuthorizationResponse,
  type SuiteOidcDevicePollOutcome,
} from "./oidc-device-code";

const nowMs = 1_800_000_300_000;

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}


describe("parseDeviceAuthorizationResponse", () => {
  test("parses a minimal valid response", () => {
    const parsed = parseDeviceAuthorizationResponse(
      {
        device_code: "d".repeat(40),
        expires_in: 600,
        interval: 5,
        user_code: "ABCD-EFGH",
        verification_uri: "https://account.hraness.com/login/cli",
      },
      nowMs,
    );
    expect(parsed).toEqual({
      deviceCode: "d".repeat(40),
      expiresAtMs: nowMs + 600_000,
      intervalMs: 5_000,
      userCode: "ABCD-EFGH",
      verificationUri: "https://account.hraness.com/login/cli",
      verificationUriComplete: null,
    });
  });

  test("parses verification_uri_complete when present", () => {
    const parsed = parseDeviceAuthorizationResponse(
      {
        device_code: "d".repeat(40),
        expires_in: 600,
        interval: 5,
        user_code: "ABCD-EFGH",
        verification_uri: "https://account.hraness.com/login/cli",
        verification_uri_complete:
          "https://account.hraness.com/login/cli?code=ABCD-EFGH",
      },
      nowMs,
    );
    expect(parsed?.verificationUriComplete).toBe(
      "https://account.hraness.com/login/cli?code=ABCD-EFGH",
    );
  });

  test("rejects malformed or oversized fields", () => {
    expect(parseDeviceAuthorizationResponse(null, nowMs)).toBeNull();
    expect(
      parseDeviceAuthorizationResponse({ device_code: "" }, nowMs),
    ).toBeNull();
    expect(
      parseDeviceAuthorizationResponse(
        {
          device_code: "d".repeat(40),
          expires_in: -1,
          interval: 5,
          user_code: "ABCD-EFGH",
          verification_uri: "https://account.hraness.com/login/cli",
        },
        nowMs,
      ),
    ).toBeNull();
    expect(
      parseDeviceAuthorizationResponse(
        {
          device_code: "d".repeat(40),
          expires_in: 600,
          interval: 0,
          user_code: "ABCD-EFGH",
          verification_uri: "https://account.hraness.com/login/cli",
        },
        nowMs,
      ),
    ).toBeNull();
  });

  test("rejects verification_uri_complete with credentials or fragments", () => {
    expect(
      parseDeviceAuthorizationResponse(
        {
          device_code: "d".repeat(40),
          expires_in: 600,
          interval: 5,
          user_code: "ABCD-EFGH",
          verification_uri: "https://account.hraness.com/login/cli",
          verification_uri_complete: "https://user:pass@example.com",
        },
        nowMs,
      ),
    ).toBeNull();
    expect(
      parseDeviceAuthorizationResponse(
        {
          device_code: "d".repeat(40),
          expires_in: 600,
          interval: 5,
          user_code: "ABCD-EFGH",
          verification_uri: "https://account.hraness.com/login/cli",
          verification_uri_complete: "https://account.hraness.com/login/cli#x",
        },
        nowMs,
      ),
    ).toBeNull();
  });
});

describe("parseDeviceTokenResponse", () => {
  test("parses a successful token response", () => {
    const parsed = parseDeviceTokenResponse(
      {
        access_token: "a".repeat(32),
        expires_in: 3600,
        refresh_token: "r".repeat(32),
        token_type: "Bearer",
      },
      nowMs,
    );
    expect(parsed).toEqual({
      accessToken: "a".repeat(32),
      expiresAtMs: nowMs + 3_600_000,
      idToken: null,
      kind: "token",
      refreshToken: "r".repeat(32),
      scope: null,
      tokenType: "bearer",
    });
  });

  test("parses all RFC 8628 error outcomes", () => {
    const cases: [string, SuiteOidcDevicePollOutcome["kind"]][] = [
      ["authorization_pending", "authorization_pending"],
      ["slow_down", "slow_down"],
      ["access_denied", "access_denied"],
      ["expired_token", "expired_token"],
    ];
    for (const [error, kind] of cases) {
      const parsed = parseDeviceTokenResponse({ error }, nowMs);
      expect(parsed).not.toBeNull();
      expect(parsed?.kind).toBe(kind);
    }
  });

  test("parses unknown errors without panicking", () => {
    const parsed = parseDeviceTokenResponse(
      {
        error: "invalid_request",
        error_description: "The device_code is invalid.",
      },
      nowMs,
    );
    expect(parsed).toEqual({
      error: "invalid_request",
      errorDescription: "The device_code is invalid.",
      kind: "error",
    });
  });

  test("rejects malformed token responses", () => {
    expect(parseDeviceTokenResponse(null, nowMs)).toBeNull();
    expect(parseDeviceTokenResponse({ access_token: "" }, nowMs)).toBeNull();
    expect(
      parseDeviceTokenResponse(
        { access_token: "a", token_type: "Bearer", expires_in: 0 },
        nowMs,
      ),
    ).toBeNull();
  });
});

describe("initiateSuiteOidcDeviceAuthorization", () => {
  test("submits a form-encoded request and returns a bound poller", async () => {
    const expectedResponse: SuiteOidcDeviceAuthorizationResponse = {
      deviceCode: "d".repeat(40),
      expiresAtMs: nowMs + 600_000,
      intervalMs: 5_000,
      userCode: "ABCD-EFGH",
      verificationUri: "https://account.hraness.com/login/cli",
      verificationUriComplete: null,
    };
    const fetcher = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = input instanceof URL
        ? input.href
        : typeof input === "string"
          ? input
          : input.url;
      expect(url).toBe(
        "https://account.hraness.com/api/auth/oauth2/device_authorization",
      );
      expect(init?.method).toBe("POST");
      const request = new Request(url, init);
      return request.text().then(body => {
        expect(body).toContain("client_id=hraness%3Awrench%3Aproduction%3Av1");
        expect(body).toContain("scope=suite.read");
        return okResponse({
          device_code: expectedResponse.deviceCode,
          expires_in: 600,
          interval: 5,
          user_code: expectedResponse.userCode,
          verification_uri: expectedResponse.verificationUri,
        });
      });
    };

    const result = await initiateSuiteOidcDeviceAuthorization(
      {
        deviceAuthorizationEndpoint:
          "https://account.hraness.com/api/auth/oauth2/device_authorization",
        deviceTokenEndpoint:
          "https://account.hraness.com/api/auth/oauth2/device/token",
      },
      { clientId: "hraness:wrench:production:v1", scopes: ["suite.read"] },
      { fetch: fetcher, now: () => new Date(nowMs) },
    );

    expect(result.response).toEqual(expectedResponse);
    expect(typeof result.poll).toBe("function");
  });

  test("throws on a non-OK response", () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "invalid_client" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        }),
      );
    return expect(
      initiateSuiteOidcDeviceAuthorization(
        {
          deviceAuthorizationEndpoint:
            "https://account.hraness.com/api/auth/oauth2/device_authorization",
          deviceTokenEndpoint:
            "https://account.hraness.com/api/auth/oauth2/device/token",
        },
        { clientId: "x" },
        { fetch: fetcher },
      ),
    ).rejects.toThrow("The device authorization request failed.");
  });
});

describe("pollSuiteOidcDeviceToken", () => {
  test("polls the token endpoint with the device_code grant", async () => {
    const fetcher = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = input instanceof URL
        ? input.href
        : typeof input === "string"
          ? input
          : input.url;
      const request = new Request(url, init);
      return request.text().then(body => {
        expect(body).toContain(
          "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code",
        );
        expect(body).toContain("device_code=d");
        expect(body).toContain("client_id=hraness%3Awrench%3Aproduction%3Av1");
        return okResponse({
          access_token: "a".repeat(32),
          expires_in: 3600,
          token_type: "Bearer",
        });
      });
    };

    const outcome = await pollSuiteOidcDeviceToken(
      "https://account.hraness.com/api/auth/oauth2/token",
      { clientId: "hraness:wrench:production:v1", deviceCode: "d".repeat(40) },
      { fetch: fetcher, now: () => new Date(nowMs) },
    );

    expect(outcome.kind).toBe("token");
  });
});
