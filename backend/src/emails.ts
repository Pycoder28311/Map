// PROJECT file: the texts of the emails this app sends. Edit freely per project.
import type { AppConfig } from './lib/config'

type Email = { subject: string; text: string }

export const resetPasswordEmail = ({ appName }: AppConfig, url: string): Email => ({
  subject: `Reset your ${appName} password`,
  text: `Open this link to choose a new password (valid for 1 hour):\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
})

export const verifyEmail = ({ appName }: AppConfig, url: string): Email => ({
  subject: `Confirm your ${appName} email`,
  text: `Welcome to ${appName}! Open this link to confirm your email:\n\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
})

export const signInCodeEmail = ({ appName }: AppConfig, otp: string): Email => ({
  subject: `Your ${appName} sign-in code`,
  text: `Your code is ${otp}. It expires in 10 minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
})
