export interface SuccessCodes {
  ok: 200;
  created: 201;
  accepted: 202;
  nonAuthoritativeInformation: 203;
  noContent: 204;
  resetContent: 205;
  partialContent: 206;
  multiStatus: 207;
  alreadyReported: 208;
  imUsed: 226;
}

export interface FailureCodes {
  badRequest: 400;
  unauthorized: 401;
  forbidden: 403;
  notFound: 404;
  conflict: 409;
  unprocessableEntity: 422;
  internalServerError: 500;
  serviceUnavailable: 503;
}
