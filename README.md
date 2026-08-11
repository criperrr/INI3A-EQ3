# Projeto TCC - CTI Bauru
## Grupo 3, 3A-2026
```
.
├── AGENTS.md
├── COMMITS.md
├── CURRENT.md
├── DESIGN.md
├── docs
│   ├── design
│   │   ├── Apresentação 1 TCC
│   │   ├── Figma
│   │   └── Imagens
│   │       ├── LogoClaro.svg
│   │       ├── logo-darkmode.png
│   │       └── LogoEscuro.svg
│   └── placeholder
├── gestao
│   └── placeholder
├── install_dependencies.sh
├── package.json
├── package-lock.json
├── README.md
├── sprints
│   ├── Planilha de avaliação.url
│   └── Relatórios de Sprints
├── src
│   ├── backend
│   │   ├── dbQueries.sql
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── src
│   │   │   ├── app.ts
│   │   │   ├── modules
│   │   │   │   ├── auth
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   └── auth.service.ts
│   │   │   │   └── product
│   │   │   │       ├── product.controller.ts
│   │   │   │       ├── product.routes.ts
│   │   │   │       └── product.service.ts
│   │   │   ├── server.ts
│   │   │   └── shared
│   │   │       ├── database
│   │   │       │   ├── database.ts
│   │   │       │   ├── drizzle.config.ts
│   │   │       │   ├── migrate.ts
│   │   │       │   ├── repositories
│   │   │       │   │   ├── auth.repository.ts
│   │   │       │   │   ├── market.repository.ts
│   │   │       │   │   ├── product.repository.ts
│   │   │       │   │   ├── repositories.index.ts
│   │   │       │   │   └── user.repository.ts
│   │   │       │   └── schema.ts
│   │   │       ├── errors
│   │   │       │   └── errors.ts
│   │   │       ├── helpers
│   │   │       │   ├── response.helper.ts
│   │   │       │   └── types.helpers.ts
│   │   │       ├── middlewares
│   │   │       │   ├── authMiddleware.ts
│   │   │       │   └── errorHandler.ts
│   │   │       ├── redis
│   │   │       │   └── server.ts
│   │   │       ├── @types
│   │   │       │   └── jsonwebtoken
│   │   │       │       └── index.d.ts
│   │   │       ├── types
│   │   │       │   ├── apiTypes.ts
│   │   │       │   ├── database.ts
│   │   │       │   ├── product.ts
│   │   │       │   ├── repositories.ts
│   │   │       │   └── services.ts
│   │   │       └── util
│   │   │           ├── bcrypt.ts
│   │   │           ├── emptyFields.ts
│   │   │           ├── getNcmData.ts
│   │   │           └── jwt.ts
│   │   └── tsconfig.json
│   ├── frontend
│   │   ├── app
│   │   │   ├── aboutUs.tsx
│   │   │   ├── customRegisterProduct.tsx
│   │   │   ├── helpUser.tsx
│   │   │   ├── index.tsx
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── manualEanSearch.tsx
│   │   │   ├── map.native.tsx
│   │   │   ├── map.tsx
│   │   │   ├── map.web.tsx
│   │   │   ├── productDetails.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── registerProduct.tsx
│   │   │   ├── registerUser.tsx
│   │   │   ├── scannerConfirmation.tsx
│   │   │   ├── scannerProduct.tsx
│   │   │   ├── search.tsx
│   │   │   └── settings.tsx
│   │   ├── app.json
│   │   ├── components
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── images
│   │   │   │   ├── logo-darkmode.png
│   │   │   │   ├── logo-presco.png
│   │   │   │   └── logo-preta.png
│   │   │   ├── productCard.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── content
│   │   │   ├── authContext.tsx
│   │   │   └── themeContent.tsx
│   │   ├── eas.json
│   │   ├── eslint.config.js
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── README.md
│   │   ├── services
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── productService.ts
│   │   └── tsconfig.json
│   └── README.md
└── start_project.sh

31 directories, 101 files
```