# Deploy do backend

Nenhuma credencial e nenhuma coordenada do servidor (host, usuário, porta, caminho)
vive no repositório — ele é público. Tudo vem de **um** de dois lugares:

| Origem | Usado por | Arquivo |
| --- | --- | --- |
| `deploy/.env.deploy` (gitignorado) | deploy manual, da sua máquina | `cp deploy/.env.deploy.example deploy/.env.deploy` |
| GitHub Actions Secrets | deploy automático no CI | `.github/workflows/deploy.yml` |

Os dois caminhos executam exatamente o mesmo script, então o CI não diverge do manual.

## Deploy manual

```bash
cp deploy/.env.deploy.example deploy/.env.deploy   # preencha uma vez
chmod 600 deploy/.env.deploy
npm run deploy          # rsync do código + migrações + seed + PM2 + healthcheck
npm run deploy:only     # reexecuta só o deploy remoto, sem sincronizar arquivos
```

## Operação

```bash
npm run remote:status     # PM2 + /health local e público
npm run remote:logs       # últimas 60 linhas
npm run remote:restart
npm run remote:crashlog
npm run remote:shell
```

## Deploy pelo CI

Actions → **Deploy Backend** → *Run workflow* (ou push em `main` tocando
`src/backend/**`). Secrets necessários no repositório:

`SSH_HOST` `SSH_USER` `SSH_PORT` `SSH_PRIVATE_KEY` `REMOTE_TARGET_DIR`
`DATABASE_URL` `REDIS_URL` `JWT_SECRET` `HERE_API_KEY` `SERVER_PORT`
`PUBLIC_URL` `REWRITE_BASE`

`SSH_PRIVATE_KEY` é uma chave **dedicada ao CI** (`ssh-keygen -t ed25519`), com a
pública em `~/.ssh/authorized_keys` do servidor — assim ela pode ser revogada sem
afetar o acesso pessoal de ninguém.

## Como os segredos chegam ao servidor

`scripts/deploy_remote.sh` monta o conjunto de variáveis e o envia **por stdin**
sobre SSH para `deploy/.env.deploy` no servidor (`umask 077`). O
`deploy/deploy.sh` carrega esse arquivo, **apaga-o imediatamente**, e regrava
`src/backend/.env` em modo `600`. Nada sensível passa pela linha de comando
(onde ficaria visível em `ps` para outros usuários do servidor compartilhado)
nem pelo Git.
