export interface ApiSuccess<T> {
    status: 200,
    success: true,
    data?: T,
}

export interface ApiFailure {
    status: number,
    message: string,
    code: string,
    success: false,
    errors: any[],
    field?: string
}
