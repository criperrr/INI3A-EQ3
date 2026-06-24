import jwt from "jsonwebtoken";
import {
  Unauthorized,
  NotFound,
  ApiError,
  parseDatabaseError,
} from "@/shared/errors/errors";
import { hash } from "@/shared/util/bcrypt";
import type { UpdateUserRequest } from "@/shared/types/apiResponse";
import type { AtLeastOne, UpdateUserDTO } from "@/shared/types/database";
import {
  UserRepository,
  AuthRepository,
} from "@/shared/database/repositories/repositories.index";
const secret = process.env.JWT_SECRET;

export class AuthenticationServiceClass {
  #secret = process.env.JWT_SECRET;

  async authenticateSession(token: string) {
    let payload: Jwt.JwtPayload;
    try {
      payload = jwt.verify(token, secret as string) as Jwt.JwtPayload;
    } catch {
      throw new Unauthorized("Invalid or expired token.", "INVALID_TOKEN");
    }
    const jti = String(payload.jti);
    await AuthRepository.verifyJTI(jti);

    return payload;
  }
  async deleteSession(id: number) {
    // Se o user não existe a api não retorna erro
    try {
      await UserRepository.deleteUser(id);
    } catch (e) {
      parseDatabaseError(e, "DATABASE: error on delete operation");
    }
  }

  async updateSession(id: number, partialUser: AtLeastOne<UpdateUserRequest>) {
    try {
      let { password, ...userRest } = partialUser;
      if (password)
        userRest = {
          passHash: await hash(password),
          ...userRest,
        } as UpdateUserDTO;
      const user = (await UserRepository.updateUser(id, userRest))[0];
      if (!user) throw new NotFound("DATABASE: no user was updated.");
      return user;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      parseDatabaseError(e, "DATABASE: error on update operation");
    }
  }

  async getMe(id: number) {
    try {
      const user = await UserRepository.getUser(id);
      if (!user) throw new NotFound("DATABASE: no user was returned.");
      return user;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      parseDatabaseError(e, "DATABASE: error on get operation");
    }
  }
}

export const AuthService = new AuthenticationServiceClass();
