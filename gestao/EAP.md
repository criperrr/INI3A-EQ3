# Documentação do Projeto PResco

Este documento contém a conversão do fluxo de gerenciamento do projeto **PResco** a partir do arquivo fornecido, além dos diagramas explicativos no formato **Mermaid**.

---

## 1. Ciclo de Vida do Projeto (Fases e Atividades)

O projeto está estruturado em **5 etapas principais** de gerenciamento:

### 1. Iniciação
* **Elaboração do TAP** (Termo de Abertura do Projeto)
* **Definição das funções** dos integrantes
* **Identificação de necessidades**

### 2. Planejamento
* **Reunião de Alinhamento**
* **Estabelecimento dos recursos** necessários
* **Realização de pesquisas** com o público-alvo
* **Elaboração da EAP** (Estrutura Analítica do Projeto)
* **Aprovação do Planejamento**

### 3. Execução
* **Testes e validações**
* **Gerenciar as expectativas** dos clientes
* **Implementação de funcionalidades**
* **Desenvolvimento do Design**

### 4. Monitoramento e Controle
* **Monitoramento do desempenho** do grupo
* **Reunião de desenvolvimento** do projeto
* **Monitoramento dos prazos** de entrega
* **Gerenciar as funcionalidades** do sistema

### 5. Encerramento
* **Avaliações dos clientes**
* **Relatório final** do projeto
* **Apresentação final**
* **Encerramento do projeto**

---

## 2. Diagrama de Fluxo das Fases do Projeto (Mermaid)

```mermaid
flowchart TD
    subgraph Iniciacao ["1. Iniciação"]
        I1["Elaboração do TAP"]
        I2["Definição das funções dos integrantes"]
        I3["Identificação de necessidades"]
    end

    subgraph Planejamento ["2. Planejamento"]
        P1["Reunião de Alinhamento"]
        P2["Estabelecimento dos recursos necessários"]
        P3["Realização de pesquisas com o público-alvo"]
        P4["Elaboração do EAP"]
        P5["Aprovação do Planejamento"]
    end

    subgraph Execucao ["3. Execução"]
        E1["Testes e validações"]
        E2["Gerenciar as expectativas dos clientes"]
        E3["Implementação de funcionalidades"]
        E4["Desenvolvimento do Design"]
    end

    subgraph Monitoramento ["4. Monitoramento e Controle"]
        M1["Monitoramento do desempenho do grupo"]
        M2["Reunião de desenvolvimento do projeto"]
        M3["Monitoramento dos prazos de entrega"]
        M4["Gerenciar as funcionalidades do sistema"]
    end

    subgraph Encerramento ["5. Encerramento"]
        F1["Avaliações dos clientes"]
        F2["Relatório final do projeto"]
        F3["Apresentação final"]
        F4["Encerramento do projeto"]
    end

    Iniciacao --> Planejamento
    Planejamento --> Execucao
    Execucao <--> Monitoramento
    Execucao --> Encerramento
```

---

## 3. Diagrama de Casos de Uso (Mermaid)

```mermaid
flowchart LR
    %% Atores
    User([Usuário Consumidor])
    Mercado([Supermercado Parceiro])
    Dev([Desenvolvedor])
    Maps([API OpenStreetMap])

    %% Sistema e Casos de Uso
    subgraph PResco [PResco - Comparador de Preços]
        direction TB
        UC01(UC01: Cadastrar Usuário)
        UC02(UC02: Autenticar Usuário)
        UC03(UC03: Buscar Produtos e Preços)
        UC04(UC04: Consultar Mercados Próximos)
        UC05(UC05: Registrar Produto e Preço)
        UC06(UC06: Ler Código de Barras)
        UC07(UC07: Publicar Ofertas)
        UC08(UC08: Manter Banco de Dados)
    end

    %% Relações dos Atores com os Casos de Uso
    User --- UC01
    User --- UC02
    User --- UC03
    User --- UC04
    User --- UC05

    Mercado --- UC07
    Dev --- UC08

    %% Includes e Dependências
    UC05 -.->|<<include>>| UC06
    UC04 -.->|usa| Maps
```
