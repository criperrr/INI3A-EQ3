interface ApiSuccess<T> {
  status: 200;
  success: true;
  data?: T;
}

interface ApiFailure {
  status: number;
  message: string;
  code: string;
  success: false;
  errors: any[];
  field?: string; // ? field?
}
