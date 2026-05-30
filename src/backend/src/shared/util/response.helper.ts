import type { ApiSuccess, ApiFailure } from "../types";

interface ErrorItem {
    message: string;
    code: string;
    field?: string;
}

export function failure(errors: ErrorItem[], status: number = 400): ApiFailure {
    if (!errors || errors.length === 0) {
        throw new Error("At least one error must be provided");
    }

    const firstError = errors[0];
    if (!firstError) {
        throw new Error("Invalid error object");
    }

    const response: ApiFailure = {
        status,
        success: false,
        message: firstError.message,
        code: firstError.code,
        errors,
    };

    if (firstError.field) {
        response.field = firstError.field;
    }

    return response;
}

export function success<T = any>(data?: T): ApiSuccess<T> {
    if (data === undefined) {
        return {
            status: 200,
            success: true,
        } as ApiSuccess<T>;
    }

    return {
        status: 200,
        success: true,
        data,
    };
}

export function singleError(
    message: string,
    code: string,
    field?: string,
    status: number = 400,
): ApiFailure {
    return failure([{ message, code, ...(field && { field }) }], status);
}
