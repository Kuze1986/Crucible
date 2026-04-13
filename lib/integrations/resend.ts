import { Resend } from "resend";

export async function sendSimulationCompleteEmail(params: {
  to: string;
  runTitle: string;
  reportUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("[resend] missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: params.to,
    subject: `Simulation complete: ${params.runTitle}`,
    text: `Your Crucible simulation "${params.runTitle}" has finished.\n\nView report: ${params.reportUrl}`,
  });
}
