import type { ErrorItem } from "../errors/errors";
import type {
  ApiMultipleErrors,
  ApiSuccess,
  ApiFailure,
} from "../types/apiResponse";

export { SuccessCodes } from "../types/apiResponse";
export type {
  ApiSuccess,
  ApiFailure,
  ApiMultipleErrors,
  ApiResponse,
} from "../types/apiResponse";

export function multipleErrors(
  errors: ErrorItem[],
  status: number = 400,
): ApiMultipleErrors {
  if (!errors || errors.length === 0) {
    throw new Error("At least one error must be provided");
  }

  return {
    success: false,
    status,
    errors,
  };
}

export function failure(
  message: string,
  textCode: string,
  field?: string,
  status: number = 400,
): ApiFailure {
  return {
    success: false,
    status,
    message,
    textCode,
    ...(field && { field }), 
  };
}

// nao precisa de dispatch failure pq o error handler meio que faz o trabalho de montar a resposta ja
export function success<T = any>(code: number, data?: T): ApiSuccess<T> {
  if (data === undefined) {
    return {
      status: code,
      success: true,
    } as ApiSuccess<T>;
  }

  return {
    status: code,
    success: true,
    data,
  };
}

export function dispatchSuccess<T = any>(
  code: number,
  res: import("express").Response,
  data?: T,
) {
  return res.status(code).json(success<T>(code, data));
}
