FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY *.py ./
# A instrução do Tutor é lida do disco A CADA TURNO (tutor.py -> instrucao.py),
# e o COPY acima leva só os .py da raiz. Sem esta linha o container sobe inteiro
# e levanta FileNotFoundError em TODO turno do /agent-tutor, calado: o Dockerfile
# é de 19/07 e agent/metodos/ nasceu em 25/07. Qualquer agente novo que leia
# prompt do disco depende dela.
COPY metodos/ ./metodos/

EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
