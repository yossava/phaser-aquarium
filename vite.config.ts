import tailwindcss from "@tailwindcss/vite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body.length > 0 ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "aquarium-dev-fish-order",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__dev/fish-order", async (request, response) => {
          if (request.method !== "POST") {
            response.statusCode = 405;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: "Use POST" }));
            return;
          }

          try {
            const body = await readJsonBody(request);
            const ids = Array.isArray((body as { ids?: unknown }).ids)
              ? (body as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string")
              : [];
            const fishPath = path.resolve(server.config.root, "src/data/fish-types.json");
            server.watcher.unwatch(fishPath);
            const fishData = JSON.parse(await readFile(fishPath, "utf8")) as Array<{ id: string }>;
            const fishById = new Map(fishData.map((fish) => [fish.id, fish]));
            const orderedFish = ids.map((id) => fishById.get(id)).filter((fish): fish is { id: string } => Boolean(fish));
            const remainingFish = fishData.filter((fish) => !ids.includes(fish.id));
            if (orderedFish.length !== ids.length || orderedFish.length === 0) {
              server.watcher.add(fishPath);
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: "Invalid fish order" }));
              return;
            }

            await writeFile(fishPath, `${JSON.stringify([...orderedFish, ...remainingFish], null, 2)}\n`);
            setTimeout(() => server.watcher.add(fishPath), 1000);
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ ok: true, count: fishData.length }));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
          }
        });
      }
    }
  ]
});
