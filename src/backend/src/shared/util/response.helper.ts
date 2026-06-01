import type { ApiSuccess, ApiFailure } from "../types";

export function failure(error: ApiFailure[]): ApiFailure {
    return { success: false, errors: error };
}

export function success<T = any>(data: T): ApiSuccess<T> {
    return { status: 200, success: true, data };
}

export function singleError(
    message: string,
    code: string,
    field?: string,
): ApiFailure {
    return field
        ? failure([{ message, code, field }])
        : failure([{ message, code }]);
}
