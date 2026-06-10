export interface Point {
  lat: number;
  lng: number;
}

// vai ter outra interface pro admin criar o user

//Interface que mandamos para o bd
export interface CreateUserDTO {
  name: string;
  passHash: string;
  email: string;
}

//Interface nos middlewares/controllers/services
export interface HandlerCreateUserDTO {
  name: string;
  password: string;
  email: string;
}

export interface HandlerUpdateUserStrictDTO {
  name: string,
  password: string,
  email: string,
  birthdate: string,
  location: string
}

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

/*
 * A MAIORIA DOS HANDLERS IRÃO DESAPARECER APÓS USARMOS O ZOD
 */

export type HandlerUpdateUserDTO = AtLeastOne<HandlerUpdateUserStrictDTO>;

export interface UpdateUserStrictDTO {
  name: string;
  passHash: string;
  email: string;
  birthdate: string;
}

export type UpdateUserDTO = AtLeastOne<UpdateUserStrictDTO>;

export interface UserDTO {
  name: string;
  email: string;
  role_id: number;
  location: Point;
}

export interface CreateMarketDTO{
  name: string,
  location: Point
}

export type UpdateMarketDTO = CreateMarketDTO