/** Shared safe error envelope. Never leak stack traces or provider payloads. */
export interface HarvyError {
  error: { code: string; message: string; trace_id: string; retryable: boolean };
}

const CODE = /^[a-z][a-z0-9_]{0,63}$/;

export function harvyError(code: string, message: string, traceId: string, retryable = false): HarvyError {
  const safeCode = CODE.test(code) ? code : "internal";
  const safeMessage = typeof message === "string" && message.length > 0 ? message.slice(0, 300) : "Request failed.";
  return { error: { code: safeCode, message: safeMessage, trace_id: traceId, retryable } };
}

export function harvyErrorResponse(code: string, message: string, status: number, traceId: string, retryable = false): Response {
  return Response.json(harvyError(code, message, traceId, retryable), { status, headers: { "Cache-Control": "no-store" } });
}
