import type { MailSender, OutboundEmail } from "./entities.js";

export interface CloudflareEmailBindingLike {
  send(message: { to: string; from: string; subject: string; text?: string; html?: string; replyTo?: string }): Promise<{ messageId?: string } | unknown>;
}

export class CloudflareEmailSender implements MailSender {
  readonly #binding: CloudflareEmailBindingLike;
  constructor(binding: CloudflareEmailBindingLike) { this.#binding=binding; }
  async send(message:OutboundEmail):Promise<void>{await this.#binding.send({to:message.to,from:message.from,subject:message.subject,text:message.text,...(message.replyTo?{replyTo:message.replyTo}:{})});}
}

export class MemoryMailSender implements MailSender {
  readonly sent:OutboundEmail[]=[];
  async send(message:OutboundEmail):Promise<void>{this.sent.push(structuredClone(message));}
}
