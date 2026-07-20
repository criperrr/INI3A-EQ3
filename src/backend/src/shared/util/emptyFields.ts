import { MultipleApiError } from "../errors/errors";

// usaremos o zod

export default function verifyEmptyFields(
  fields: Record<string, string>,
): void {
  let emptyFields: Array<string> = [];
  for (const key in fields) {
    if (!fields[`${key}`]) {
      emptyFields.push(`${key}`);
    }
  }
  if (emptyFields.length != 0) {
    const errors = emptyFields.map((field) => ({
      field: field,
      message: `Empty field ${field}`,
      code: "REG_MISSING_FIELD",
    }));
    throw new MultipleApiError(errors, 400);
  }
}
