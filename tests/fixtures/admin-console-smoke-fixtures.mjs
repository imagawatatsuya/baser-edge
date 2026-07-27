export const SMOKE_SITE_ID = "site-smoke";
export const SMOKE_CONTENT_ID = "c-page-smoke";
export const SMOKE_DEFINITION_ID = "def-smoke";
export const SMOKE_ENTRY_ID = "entry-smoke";
export const smokeSession = {
  apiUrl: "http://127.0.0.1:0",
  publicUrl: "https://public.smoke.test",
  workspaceId: "ws-smoke",
  siteId: SMOKE_SITE_ID,
  ownerPrincipalId: "owner-smoke",
};

const document = {
  formatVersion: 1,
  root: {
    id: "root",
    type: "page",
    componentVersion: 1,
    props: {},
    slots: {
      body: [
        {
          id: "heading",
          type: "heading",
          componentVersion: 1,
          props: { level: 1, text: "Smoke page" },
          slots: {},
        },
        {
          id: "body",
          type: "richText",
          componentVersion: 1,
          props: { paragraphs: ["hello"] },
          slots: {},
        },
      ],
    },
  },
};

const revision = {
  id: "rev-working",
  fields: { title: "Smoke page" },
  document,
  createdAt: 1,
};

const publishedRevision = {
  id: "rev-published",
  fields: { title: "Smoke page" },
  document,
  createdAt: 1,
};

export const smokeSnapshot = {
  item: {
    id: SMOKE_CONTENT_ID,
    contentTypeKey: "page",
    siteId: SMOKE_SITE_ID,
    lockVersion: 1,
    state: "active",
    createdAt: 1,
    updatedAt: 1,
  },
  node: {
    id: "node-smoke",
    parentId: null,
    slug: "smoke",
    sortKey: "a",
    treeVersion: 1,
    cachedPath: "/smoke",
  },
  route: { path: "/smoke" },
  workingRevision: revision,
  publishedRevision,
};

export const smokeContentTree = [{ snapshot: smokeSnapshot }];

export const smokeCapabilities = {
  assetPublicDelivery: false,
  assetStorage: "memory",
  environment: "production",
  instantLogin: false,
  cloudflareLogin: false,
  publicSiteUrl: "https://public.smoke.test",
};

export const smokeCustomEntrySnapshot = {
  entry: { id: SMOKE_ENTRY_ID, lockVersion: 1, slug: "smoke-entry" },
  workingRevision: { id: "ce-rev-working", values: { title: "Smoke entry" } },
  publishedRevision: { id: "ce-rev-published" },
};

export const smokeCustomEntriesList = [smokeCustomEntrySnapshot];

export const smokeCustomContentsList = [
  {
    definition: { id: SMOKE_DEFINITION_ID },
    schema: {
      fields: [
        {
          definition: { key: "title", name: "タイトル", type: "text" },
          required: false,
        },
      ],
    },
  },
];