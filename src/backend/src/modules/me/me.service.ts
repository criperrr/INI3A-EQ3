import { hash } from "@/shared/util/bcrypt";
import * as repository from "./me.repository";
import { NotFound, ApiError, parseDatabaseError } from "@/shared/errors/errors";
import type { UpdateUserRequest } from "@/shared/types/apiResponse";
import type { AtLeastOne, UpdateUserDTO } from "@/shared/types/database";

export async function deleteSession(id: number) {
  //Se o user não existe a api não retorna erro
  try {
    await repository.deleteUser(id);
  } catch (e) {
    parseDatabaseError(e, "DATABASE: error on delete operation");
  }
}

export async function updateSession(id: number, partialUser: AtLeastOne<UpdateUserRequest>) {
  try {
    let { password, ...userRest } = partialUser;
    if (password)
      userRest = { passHash: (await hash(password)), ...userRest } as UpdateUserDTO;
    const user = (await repository.updateUser(id, userRest))[0];
    if (!user) throw new NotFound("DATABASE: no user was updated.");
    return user;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    parseDatabaseError(e, "DATABASE: error on update operation");
  }
}

export async function getMe(id: number) {
  try {
    const user = (await repository.getUser(id))[0];
    if (!user) throw new NotFound("DATABASE: no user was returned.");
    return user;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    parseDatabaseError(e, "DATABASE: error on get operation");
  }
}
