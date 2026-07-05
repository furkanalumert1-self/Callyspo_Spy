import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SYSTEM_PROMPT = `Bir Facebook reklamının kazınmış site içeriğini al, satılan tek bir ürünü bul, Amazon'da aratılabilecek şekilde ürün adını formatla. İçerik yoksa sayfa adı/caption/body text kullan. Hiçbiri yoksa 'No Product Found' döndür.`;

export interface FindProductNameInput {
  plainText: string;
  pageName?: string;
  caption?: string;
  bodyText?: string;
}

export const NO_PRODUCT_FOUND = "No Product Found";

export async function findProductName(input: FindProductNameInput): Promise<string> {
  const userContent = [
    `Sayfa Adı: ${input.pageName || "-"}`,
    `Caption: ${input.caption || "-"}`,
    `Reklam Metni: ${input.bodyText || "-"}`,
    `Kazınmış Site İçeriği:\n${input.plainText || "-"}`,
  ].join("\n\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const result = completion.choices[0]?.message?.content?.trim();
  return result || NO_PRODUCT_FOUND;
}
