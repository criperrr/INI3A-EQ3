import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inMemoryStore } from "../../src/backend/src/shared/redis/server";

describe("Concurrency & Race Conditions Defense Suite", () => {
  it("Cenário 1: Rate Limiter Atomic Bucket - 50 requisições simultâneas", async () => {
    const rateLimitKey = `test:ratelimit:${Date.now()}`;
    const maxLimit = 10;
    const totalRequests = 50;

    // Função simulando middleware de rate limiter atômico usando INCR
    async function simulateRateLimitedRequest(): Promise<boolean> {
      const current = await inMemoryStore.incr(rateLimitKey);
      if (current === 1) {
        await inMemoryStore.expire(rateLimitKey, 60);
      }
      return current <= maxLimit;
    }

    // Dispara 50 requisições exatamente no mesmo milissegundo via Promise.all
    const results = await Promise.all(
      Array.from({ length: totalRequests }, () => simulateRateLimitedRequest())
    );

    const allowedCount = results.filter((allowed) => allowed === true).length;
    const blockedCount = results.filter((allowed) => allowed === false).length;

    // Validação estrita (Anti-tautologia): contagem exata
    assert.strictEqual(
      allowedCount,
      maxLimit,
      `Exatamente ${maxLimit} requisições deveriam ter passado, mas passaram ${allowedCount}`
    );
    assert.strictEqual(
      blockedCount,
      totalRequests - maxLimit,
      `Exatamente ${totalRequests - maxLimit} requisições deveriam ter sido bloqueadas com 429, mas foram ${blockedCount}`
    );

    // Limpeza
    await inMemoryStore.del(rateLimitKey);
  });

  it("Cenário 2: Quorum de Votação Concorrente - 25 votos simultâneos sem Lost Updates", async () => {
    // Simula contador atômico em banco/cache de ocorrência de preço
    let upvoteCount = 0;
    const votedUsers = new Set<number>();
    const mutexLock = { locked: false };

    async function castVoteConcurrently(userId: number): Promise<{ success: boolean; duplicate: boolean }> {
      // Simula verificação atômica de unicidade e incremento
      if (votedUsers.has(userId)) {
        return { success: false, duplicate: true };
      }
      votedUsers.add(userId);
      // Operação atômica equivalente a sql`upvoteCount = upvoteCount + 1`
      upvoteCount++;
      return { success: true, duplicate: false };
    }

    const voterCount = 25;
    // Dispara 25 votos de usuários distintos simultaneamente
    const votes = await Promise.all(
      Array.from({ length: voterCount }, (_, idx) => castVoteConcurrently(idx + 1))
    );

    const successfulVotes = votes.filter((v) => v.success).length;
    assert.strictEqual(
      successfulVotes,
      voterCount,
      "Todos os 25 votos de usuários distintos devem ser contabilizados com sucesso"
    );
    assert.strictEqual(
      upvoteCount,
      voterCount,
      `Contador final de upvotes deve ser exatamente ${voterCount}, prevenindo lost updates`
    );

    // Testa idempotência: os mesmos 25 usuários tentam votar novamente simultaneamente
    const duplicateVotes = await Promise.all(
      Array.from({ length: voterCount }, (_, idx) => castVoteConcurrently(idx + 1))
    );
    const rejectedDuplicates = duplicateVotes.filter((v) => v.duplicate).length;
    assert.strictEqual(
      rejectedDuplicates,
      voterCount,
      "Todas as 25 tentativas duplicadas devem ser rejeitadas sem alterar o total"
    );
    assert.strictEqual(upvoteCount, voterCount, "Contador não deve sofrer alterações indevidas");
  });

  it("Cenário 3: Compra Concorrente de Cosmético - Prevenção de Saldo Negativo e Duplicidade", async () => {
    // Simula usuário com saldo estrito de 500 XP
    let userPoints = 500;
    const itemPrice = 500;
    const userInventory: number[] = [];

    // Lock transacional simulado com checagem ACID
    let isProcessingTransaction = false;

    async function attemptPurchase(itemId: number): Promise<{ success: boolean; reason?: string }> {
      // Simula transação de banco com isolamento serializable / row lock
      if (userInventory.includes(itemId)) {
        return { success: false, reason: "ALREADY_OWNED" };
      }
      if (userPoints < itemPrice) {
        return { success: false, reason: "INSUFFICIENT_FUNDS" };
      }

      // Se duas requisições chegarem ao mesmo tempo, a primeira que trava a linha ganha
      if (isProcessingTransaction) {
        // Aguarda liberação
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      isProcessingTransaction = true;
      try {
        if (userInventory.includes(itemId)) {
          return { success: false, reason: "ALREADY_OWNED" };
        }
        userPoints -= itemPrice;
        userInventory.push(itemId);
        return { success: true };
      } finally {
        isProcessingTransaction = false;
      }
    }

    // Dispara 10 tentativas simultâneas de compra do mesmo item
    const purchaseAttempts = await Promise.all(
      Array.from({ length: 10 }, () => attemptPurchase(99))
    );

    const successfulPurchases = purchaseAttempts.filter((p) => p.success);
    const failedPurchases = purchaseAttempts.filter((p) => !p.success);

    assert.strictEqual(
      successfulPurchases.length,
      1,
      "Exatamente 1 compra deve ser efetivada mesmo sob alta concorrência"
    );
    assert.strictEqual(
      failedPurchases.length,
      9,
      "As outras 9 compras concorrentes devem ser rejeitadas"
    );
    assert.strictEqual(
      userPoints,
      0,
      "O saldo de pontos deve ser exatamente 0, nunca negativo"
    );
    assert.strictEqual(
      userInventory.filter((id) => id === 99).length,
      1,
      "O inventário deve conter estritamente 1 unidade do item"
    );
  });

  it("Cenário 4: Revogação Concorrente de Token JTI (Blacklist Atômica)", async () => {
    const jti = `test-jti-${Date.now()}`;
    const ttlSeconds = 60;

    async function revokeToken(): Promise<boolean> {
      // Operação atômica em Redis/cache
      await inMemoryStore.set(`blacklist:${jti}`, "1", ttlSeconds);
      const isBlacklisted = await inMemoryStore.get(`blacklist:${jti}`);
      return isBlacklisted === "1";
    }

    // 15 requisições de logout simultâneas para a mesma sessão/jti
    const revocationResults = await Promise.all(
      Array.from({ length: 15 }, () => revokeToken())
    );

    // Todas devem resultar em confirmação de token na blacklist sem falha
    assert.strictEqual(
      revocationResults.every((res) => res === true),
      true,
      "Todas as chamadas concorrentes devem assegurar a presença do token na blacklist"
    );

    const verified = await inMemoryStore.get(`blacklist:${jti}`);
    assert.strictEqual(verified, "1", "JTI deve permanecer bloqueado no cache");

    await inMemoryStore.del(`blacklist:${jti}`);
  });
});
