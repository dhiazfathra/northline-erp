# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1.3 AS build
WORKDIR /src
COPY . .
RUN bun install
RUN cd apps/api && bun build src/main.ts --compile --outfile /out/northline-api

FROM gcr.io/distroless/cc-debian12
COPY --from=build /out/northline-api /northline-api
ENV PORT=3000
EXPOSE 3000
# --role=web | worker | all ; SIGTERM drains the worker loop and stops the server.
ENTRYPOINT ["/northline-api"]
CMD ["--role=all"]
