import * as Services from "@/shared/types/services";
import * as Repositories from "@/shared/types/repositories";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { hash } from "bcrypt";
import { InternalError } from "@/shared/errors/errors";

class AuthServiceClass {
  async createUser(user: Services.CreateUser) {
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

  async updateUser(id: number | string, user: Services.UpdateUser) {
    const { password, ...remainder } = user;

    if (Object.keys(remainder).length === 0) {
      throw new Error("internal");
    }

    const userQuery: Partial<Repositories.UpdateUser> = { ...remainder };

    if (password !== undefined) {
      userQuery.passHash = await hash(password, 10);
    }

    if (Object.keys(userQuery).length == 0) {
      throw new Error("Nothing to update");
    }

    const result = await UserRepository.updateUser(
      id,
      userQuery as Repositories.UpdateUser,
    );

    if (!result[0]) {
      throw new Error("internal");
    }

    return result[0];
  }

  async deleteUser(id: number | string) {
    
    const rowCount = await UserRepository.deleteUser(id);
    
    if (rowCount == 0) {
      throw new Error("internal");
    }
    
    return rowCount;

  };

  async getUserById(id: number | string) {
    const result = await UserRepository.getUserById(id);
    if (!result) {
      throw new Error("internal");
    }
    return result;
  }
}

export const authService = new AuthServiceClass();
