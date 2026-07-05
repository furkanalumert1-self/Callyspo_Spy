import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function notifySearchCompleted(email: string, searchId: string, keyword: string, matchCount: number) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping email notification");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AdSpy <notifications@adspy.app>",
      to: email,
      subject: `Aramanız tamamlandı: "${keyword}"`,
      html: `<p>"${keyword}" için aramanız tamamlandı. ${matchCount} ürün eşleşmesi bulundu.</p>
             <p><a href="${appUrl}/dashboard/searches/${searchId}">Sonuçları görüntülemek için tıklayın</a></p>`,
    });
  } catch (err) {
    console.error("Failed to send notification email", err);
  }
}
