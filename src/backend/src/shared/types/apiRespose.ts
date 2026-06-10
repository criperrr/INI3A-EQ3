export interface ApiSuccess<T> {
  status: 200;
  success: true;
  data?: T;
}

export interface ApiFailure {
    success: false;
    errors: ApiError[];
    status: number;
}

export interface ApiError {
    message: string;
    textCode: string;
    field: string;
}