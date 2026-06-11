import type { AtLeastOne, CreateMarketDTO, Point, UpdateMarketDTO } from "./database";

//User
export type UpdateUserRequest = AtLeastOne<{
  name: string;
  email: string;
  birthdate: string;
  password: string;
  location: Point;
}>;

export interface CreateUserRequest {
  name: string;
  password: string;
  email: string;
}
//******************

//Market
export type CreateMarketRequest = CreateMarketDTO;
export type UpdateMarketRequest = UpdateMarketDTO;

//******************



