import { actor } from "@baser-edge/content-kernel";
import {
  AuthService,
  TestWebAuthnGateway,
  buildTestRegistrationResponse,
  memoryAuthStore,
} from "@baser-edge/auth-kernel";
import { createPrincipalLookup } from "../apps/api-worker/dist/auth-routes.js";

const THEME_TOKENS = {
  colorBackground: "#f7f4ed",
  colorSurface: "#ffffff",
  colorText: "#24211d",
  colorMuted: "#6a6258",
  colorAccent: "#315b47",
  colorBorder: "#d8d0c4",
  fontFamily: 'system-ui,-apple-system,"Noto Sans JP",sans-serif',
  baseFontSize: 17,
  lineHeight: 1.8,
  contentMaxWidth: 1040,
  spacingScale: 1,
  radius: 8,
};

const THEME_LAYOUT = {
  header: "brand",
  navigation: "none",
  footer: "simple",
  showSiteName: true,
  footerText: "baser-edge local",
  mainClass: "bc-page basercms-migrated-page",
};

export async function seedLocalStack({ cms, themes }) {
  const boot = await cms.bootstrap({
    workspaceName: "ローカル開発",
    siteName: "ローカルサイト",
    hostname: "local.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const theme = await themes.createTheme(owner, {
    workspaceId: boot.workspaceId,
    key: "local",
    name: "ローカルテーマ",
    description: "ローカルスタック用",
  });
  const tokens = await themes.createTokenRevision(owner, {
    themeId: theme.id,
    name: "基本",
    tokens: THEME_TOKENS,
  });
  const layout = await themes.createLayoutRevision(owner, {
    themeId: theme.id,
    name: "基本",
    layout: THEME_LAYOUT,
  });
  const release = await themes.createRelease(owner, {
    themeId: theme.id,
    version: "1.0.0",
    designTokenRevisionId: tokens.id,
    layoutRevisionId: layout.id,
    manifest: {
      rendererApiVersion: 1,
      variant: "light",
      supportedContentTypes: ["*"],
      cssText: ".bc-page{display:block}",
      source: { kind: "native" },
    },
  });
  await themes.activate(owner, { siteId: boot.siteId, themeReleaseId: release.id });

  const bootstrapSecret = "local-dev-bootstrap-passkey";
  const auth = new AuthService({
    store: memoryAuthStore,
    principals: createPrincipalLookup(cms),
    webauthn: new TestWebAuthnGateway(),
    bootstrapSecret,
  });
  const passkeyLabel = "owner";
  const begin = await auth.beginPasskeyRegistration(owner, {
    workspaceId: boot.workspaceId,
    principalId: boot.ownerPrincipalId,
    label: passkeyLabel,
    bootstrapSecret,
  });
  const registration = buildTestRegistrationResponse(begin.options.challenge);
  await auth.finishPasskeyRegistration(owner, {
    challengeId: begin.challengeId,
    response: registration,
  });

  return {
    ...boot,
    passkeyLabel,
    credentialId: registration.id,
    apiUrl: "http://localhost:8787",
    publicUrl: "http://localhost:8788",
  };
}
