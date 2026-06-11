import { dispatchSuccess, SuccessCodes } from "@/shared/util/response.helper";

export default function apiStatus(
  _req: any,
  res: import("express").Response,
  next: Function,
) {
  const status = {
    version: "1.0",
  };
  return dispatchSuccess(SuccessCodes.ok, res, status);
}
