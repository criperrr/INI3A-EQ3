import type { AtLeastOne, Point } from "./database";

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
