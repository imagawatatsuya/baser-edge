import { getSession, loginWithPasskey } from "./api-client.js";

const status = document.querySelector("#loginStatus");
const button = document.querySelector("#loginButton");

if (getSession()) {
  window.location.replace("./index.html");
}

button.addEventListener("click", async () => {
  status.textContent = "ログイン中…";
  button.disabled = true;
  try {
    const hintResponse = await fetch("/v1/dev/local-login-hint");
    const hint = await hintResponse.json();
    if (!hintResponse.ok) throw new Error(hint.error?.message ?? "ローカルヒントを取得できません。dev:stack を起動してください。");
    await loginWithPasskey(hint);
    window.location.replace("./index.html");
  } catch (error) {
    status.textContent = String(error);
    button.disabled = false;
  }
});
