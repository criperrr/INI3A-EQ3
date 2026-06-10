import bcrypt from "bcrypt";

/**
 * Todas essas funções são padronizadas para o formato hexadecimal
 */

export async function hash(target: string, rounds: number = 10) {
  return bcrypt.hash(target, rounds);
}

export async function compare(target: string, origin: string) {
  return bcrypt.compare(target, origin);
}
// heitor pq vc fez isso? kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
// é tipo function somar(a, b) {return require('lib').somar(a,b)}
// vou mexer nos seus autismos nao
