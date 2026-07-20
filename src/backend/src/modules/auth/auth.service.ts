import * as Repository from "@/shared/types/repositories";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { hash } from "bcrypt";

type CreateUserBody = Pick<Repository.User, "name" | "email"> & {
  password: string;
};

class AuthServiceClass {
  async createUser(user: CreateUserBody) {
    const passHash = await hash(user.password, 10);

    const { email, name } = user;
    const userQuery = {
      name,
      email,
      passHash,
    };

    const result = await UserRepository.createUser(userQuery);
    if (!result[0]) {
      throw new Error();
    }
    return result[0];
  }
}

export const authService = new AuthServiceClass();
