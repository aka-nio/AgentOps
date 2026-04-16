import https from "node:https";
import { mercadoLivreItemSchema, type MercadoLivreItem } from "./types.js";

const ML_API_BASE_URL = "https://api.mercadolibre.com";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export async function getItemById(itemId: string): Promise<MercadoLivreItem> {
  const accessToken = getEnv("ML_TOKEN_SECRET");

  const url = new URL(`${ML_API_BASE_URL}/items/${encodeURIComponent(itemId)}`);

  const responseBody = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (statusCode >= 200 && statusCode < 300) {
            resolve(body);
          } else {
            reject(
              new Error(
                `Mercado Libre API error: ${statusCode} - ${body.slice(
                  0,
                  500,
                )}`,
              ),
            );
          }
        });
      },
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });

  const json = JSON.parse(responseBody);
  return mercadoLivreItemSchema.parse(json);
}
