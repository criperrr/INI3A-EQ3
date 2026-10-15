FROM eclipse-temurin:17-jre-jammy

ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências essenciais e cliente ADB
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    bash \
    ca-certificates \
    adb \
    && rm -rf /var/lib/apt/lists/*

# Instalar a versão oficial do Maestro CLI
RUN curl -FsSL "https://get.maestro.mobile.dev" | bash
ENV PATH="/root/.maestro/bin:${PATH}"

WORKDIR /app

# Ponto de entrada padrão: executa a suíte completa de estabilidade
ENTRYPOINT ["maestro"]
CMD ["test", "tests/maestro/flows/11_full_app_stability_suite.yaml"]
