export interface Point {
  lat: number;
  lng: number;
}


// helper
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];


//Interface que mandamos para o bd
export interface CreateUserDTO {
  name: string;
  passHash: string;
  email: string;
}


//isso vai ser usado no banco
export interface UpdateUserDTO {
  name: string;
  passHash: string;
  email: string;
  birthdate: string;
  location: Point;
  password?: string
}

/*
 * A MAIORIA DOS HANDLERS IRÃO DESAPARECER APÓS USARMOS O ZOD
 */

export interface UserDTO {
  name: string;
  email: string;
  role_id: number;
  location: Point;
}

export interface CreateMarketDTO {
  name: string;
  location: Point;
}

export type UpdateMarketDTO = AtLeastOne<CreateMarketDTO>;
