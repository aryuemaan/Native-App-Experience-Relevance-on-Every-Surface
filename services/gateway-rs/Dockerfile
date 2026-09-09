FROM rust:1.83-slim-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY tests ./tests
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd -m app
WORKDIR /app
COPY --from=builder /app/target/release/feg-pulse-gateway /usr/local/bin/feg-pulse-gateway
COPY .env.example /app/.env.example
ENV HOST=0.0.0.0
ENV PORT=8080
ENV RUST_LOG=info
USER app
EXPOSE 8080
CMD ["feg-pulse-gateway"]
