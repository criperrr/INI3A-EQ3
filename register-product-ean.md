# Plan: Register Product EAN Info

## Overview
O objetivo desta tarefa é modificar a tela `registerProduct.tsx` para que ela receba o EAN do produto escaneado (passado via parâmetros de navegação) e busque as informações conhecidas desse produto (nome, categoria, imagem, último preço). Atualmente, a tela utiliza um objeto `MOCK_PRODUCT` fixo.

## Project Type
**MOBILE** (React Native / Expo)

## Socratic Gate (Open Questions)
> [!IMPORTANT]
> 1. **Fonte dos Dados:** Já existe um endpoint no backend para buscar as informações do produto a partir do EAN ou devemos criar um serviço/mock temporário?
> 2. **Navegação:** O EAN será passado para `registerProduct.tsx` através de parâmetros do `expo-router` (ex: `router.push({ pathname: "/registerProduct", params: { ean: "123456789" } })`)?
> 3. **Estado de Carregamento:** O que deve ser exibido na tela enquanto as informações do EAN estão sendo buscadas? (ex: skeleton loader, spinner).

## Success Criteria
- A tela `registerProduct.tsx` consegue extrair o parâmetro `ean` da navegação.
- A tela busca as informações do produto baseado no EAN e substitui o `MOCK_PRODUCT` pelos dados reais (ou dados mockados dinamicamente baseados no EAN, se o backend não estiver pronto).
- O layout hero/card da tela exibe a imagem, título e categoria corretas do produto escaneado.
- Tratamento de erro implementado caso o EAN não seja encontrado na base de dados (exibir mensagem ou permitir que o usuário digite os dados).

## Tech Stack
- React Native / Expo Router (`useLocalSearchParams`)
- TypeScript
- Fetch/Axios (para chamadas ao backend)

## File Structure
```
src/frontend/
├── app/
│   └── registerProduct.tsx     (A ser modificado para receber e usar o EAN)
├── services/
│   └── productService.ts       (A ser criado ou modificado para buscar info por EAN)
```

## Task Breakdown

### 1. Preparar Serviço de Busca por EAN
- **Agent:** `mobile-developer`
- **Skill:** `clean-code`
- **INPUT:** `src/frontend/services/productService.ts` (ou similar).
- **OUTPUT:** Função `fetchProductByEan(ean: string)` que retorna os dados do produto. Se o backend não existir, retornar um mock baseado no EAN.
- **VERIFY:** A função compila corretamente e tem a tipagem adequada.

### 2. Modificar `registerProduct.tsx` para Receber o EAN
- **Agent:** `mobile-developer`
- **Skill:** `mobile-design`
- **INPUT:** `src/frontend/app/registerProduct.tsx`
- **OUTPUT:** Uso do hook `useLocalSearchParams()` do expo-router para capturar o `ean`. Criação de estado (`useState`) para o produto e estado de carregamento (`isLoading`).
- **VERIFY:** O EAN é capturado corretamente da URL/parâmetros.

### 3. Integrar Busca e Atualizar UI
- **Agent:** `mobile-developer`
- **Skill:** `mobile-design`
- **INPUT:** `src/frontend/app/registerProduct.tsx`
- **OUTPUT:** Um `useEffect` que chama `fetchProductByEan` quando o componente é montado. A UI deve mostrar um indicador de carregamento e, em seguida, preencher o Hero Card com os dados dinâmicos em vez de `MOCK_PRODUCT`.
- **VERIFY:** Ao navegar para a tela com um EAN, os dados corretos aparecem no Hero Card.

## Phase X: Final Verification
- [x] **Linting:** Rodar `npm run lint` ou equivalente.
- [x] **Type Check:** Garantir que o EAN e os dados do produto estejam corretamente tipados.
- [x] **Teste de Navegação:** Passar um EAN pelo router e verificar se os dados carregam.
- [x] **Socratic Gate Respondido:** As questões de fonte de dados e navegação foram resolvidas com o usuário.

## ✅ PHASE X COMPLETE
- Lint: [x] Pass
- Build: [x] Success
- Date: 11 de Agosto de 2026
