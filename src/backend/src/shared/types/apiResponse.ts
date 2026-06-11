import type { ErrorItem } from "../errors/errors";

// ---------------------------------------------------------------------------
// HTTP Success Status Codes
// Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
// claude que viu a referencia e gerou esse enum ai BELEZA HEITOR
// ---------------------------------------------------------------------------
export enum SuccessCodes {
  // 2xx — Success
  /** Request succeeded. Use for GET, PUT, PATCH. */
  ok = 200,
  /** Resource created successfully. Use for POST. */
  created = 201,
  /** Request accepted but processing is async / not yet complete. */
  accepted = 202,
  /** Success but response body comes from a third-party source. */
  nonAuthoritativeInformation = 203,
  /** Success with no body to return. Use for DELETE, logout. */
  noContent = 204,
  /** Partial content returned (range requests / pagination). */
  partialContent = 206,
  /** Multi-status (batch operations — e.g. WebDAV-style bulk responses). */
  multiStatus = 207,

  // 3xx — Redirection (informational, rarely returned as JSON)
  /** Resource moved permanently. */
  movedPermanently = 301,
  /** Resource found at a different URI temporarily. */
  found = 302,
  /** Response not modified; client can use its cache. */
  notModified = 304,
}

// API Response Shapes
export interface ApiSuccess<T = any> {
  success: true;
  status: SuccessCodes;
  data?: T;
}

export interface ApiFailure {
  success: false;
  status: number;
  message: string;
  textCode: string;
  field?: string;
}

export interface ApiMultipleErrors {
  success: false;
  status: number;
  errors: ErrorItem[];
}

//todas as respostas possiveis hehe
export type ApiResponse<T = any> =
  | ApiSuccess<T>
  | ApiFailure
  | ApiMultipleErrors;


import type { AtLeastOne, Point } from "./database";

export type UpdateUserRequest = AtLeastOne<{
  name: string;
  email: string;
  birthdate: string;
  password: string;
  location: Point;
}>;

export interface CreateUserRequest {
  name: string;
  password: string;
  email: string;
}
