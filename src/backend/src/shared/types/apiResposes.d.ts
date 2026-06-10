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

//Não entendi a logica da sua api failure ent fiz a minha

interface ApiFail{
  success: false,
  error: {
    message: string,
    textCode: string,
    field: string
  },
  status: number
}
