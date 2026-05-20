import { Resend } from "resend";

export async function sendOrgInviteEmail(params: {
  to: string;
  orgName: string;
  inviterEmail: string;
  role: string;
  acceptUrl: string;
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
    subject: `You've been invited to join ${params.orgName} on Crucible`,
    text: [
      `${params.inviterEmail} has invited you to join "${params.orgName}" as ${params.role}.`,
      ``,
      `Accept the invitation: ${params.acceptUrl}`,
      ``,
      `This invite expires in 7 days.`,
    ].join("\n"),
  });
}

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
