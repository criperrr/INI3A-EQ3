interface Point {
  lat: number;
  lng: number;
}

// vai ter outra interface pro admin criar o user

//Interface que mandamos para o bd
interface CreateUserDTO {
  name: string;
  passHash: string;
  email: string;
}

//Interface nos middlewares/controllers/services
interface HandlerCreateUserDTO {
  name: string;
  password: string;
  email: string;
}

interface UpdateUserStrictDTO {
  name: string;
  passHash: string;
  email: string;
  birthdate: string;
}

type UpdateUserDTO = AtLeastOne<UpdateUserStrictDTO>;

interface UserDTO {
  name: string;
  email: string;
  role_id: number;
  location: Point;
}
