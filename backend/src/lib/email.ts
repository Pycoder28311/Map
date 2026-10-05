import { getConfig } from './config'

/** Sends an email through Resend's HTTP API (no SDK needed on Workers). Sender: "<APP_NAME> <EMAIL_FROM>" */
export async function sendEmail(
    env: CloudflareBindings,
    { to, subject, text }: { to: string; subject: string; text: string },
) {
    const from = `${getConfig(env).appName} <${env.EMAIL_FROM}>`
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, text }),
    })
    if (!res.ok) {
        throw new Error(`Resend failed (${res.status}): ${await res.text()}`)
    }
}
