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

interface HandlerUpdateUserStrictDTO {
  name: string,
  password: string,
  email: string,
  birthdate: string,
  location: string
}

/***
 * A MAIORIA DOS HANDLERS IRÃO DESAPARECER APÓS USARMOS O ZOD
 */

type HandlerUpdateUserDTO = AtLeastOne<HandlerUpdateUserStrictDTO>;

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

interface CreateMarketDTO{
  name: string,
  location: Point
}

type UpdateMarketDTO = CreateMarketDTO