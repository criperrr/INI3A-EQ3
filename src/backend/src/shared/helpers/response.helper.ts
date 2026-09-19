import type { SuccessCodes } from "../types/apiTypes";

export function success(data: any, code?: SuccessCodes) {
  return { success: true, code: code || 200, data };
}

