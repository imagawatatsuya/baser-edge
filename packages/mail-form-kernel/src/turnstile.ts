import type { BotVerifier, BotVerificationResult } from "./entities.js";

export class AllowAllBotVerifier implements BotVerifier {
  async verify(): Promise<BotVerificationResult> { return { success: true }; }
}

export class UnavailableBotVerifier implements BotVerifier {
  async verify(): Promise<BotVerificationResult> { return { success: false, errorCodes: ["turnstile-not-configured"] }; }
}

export class TurnstileBotVerifier implements BotVerifier {
  readonly #secret: string;
  readonly #fetch: typeof fetch;
  constructor(secret: string, fetchImpl: typeof fetch = fetch) { this.#secret=secret; this.#fetch=fetchImpl; }
  async verify(input:{token:string;remoteIp?:string;idempotencyKey:string;expectedHostname?:string}):Promise<BotVerificationResult>{
    const body:Record<string,string>={secret:this.#secret,response:input.token,idempotency_key:input.idempotencyKey};
    if(input.remoteIp)body.remoteip=input.remoteIp;
    const response=await this.#fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    if(!response.ok)return{success:false,errorCodes:[`http-${response.status}`]};
    const data=await response.json() as {success?:boolean;hostname?:string;action?:string;"error-codes"?:string[]};
    if(input.expectedHostname&&data.hostname!==input.expectedHostname)return{success:false,...(data.hostname?{hostname:data.hostname}:{}),...(data.action?{action:data.action}:{}),errorCodes:["hostname-mismatch"]};
    return{success:Boolean(data.success),...(data.hostname?{hostname:data.hostname}:{}),...(data.action?{action:data.action}:{}),...(data["error-codes"]?{errorCodes:data["error-codes"]}:{})};
  }
}
