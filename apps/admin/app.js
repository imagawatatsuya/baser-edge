import { getSession, readCsrfToken, CSRF_HEADER, approveAndPublish } from "./api-client.js";

if (!getSession()?.siteId) {
  window.location.replace("./login.html");
}

const panel = document.querySelector("#setupPanel");
const views = [...document.querySelectorAll("[data-view]")];
const navItems = [...document.querySelectorAll(".nav-item")];
const treePanelBody = document.querySelector("#treePanelBody");
const trashPanelBody = document.querySelector("#trashPanelBody");
const blogPanel = document.querySelector("#blogPanel");
const treeSection = document.querySelector("#treePanel");
const trashSection = document.querySelector("#trashPanel");
const blogList = document.querySelector("#blogList");
const articleCollection = document.querySelector("#articleCollection");
const articleDraftList = document.querySelector("#articleDraftList");
const blogCreateStatus = document.querySelector("#blogCreateStatus");
const articleCreateStatus = document.querySelector("#articleCreateStatus");
const customFieldStatus = document.querySelector("#customFieldStatus");
const customTableStatus = document.querySelector("#customTableStatus");
const customAttachStatus = document.querySelector("#customAttachStatus");
const customContentStatus = document.querySelector("#customContentStatus");
const customEntryStatus = document.querySelector("#customEntryStatus");
const customContentList = document.querySelector("#customContentList");
const customEntryFields = document.querySelector("#customEntryFields");
const customEntryContent = document.querySelector("#customEntryContent");
let customState = { fields: [], tables: [], contents: [] };
let blogState = [];
let contentTreeState = [];
const mailFormTable = document.querySelector("#mailFormTable");
const mailFormStatus = document.querySelector("#mailFormStatus");
const mailDeliveryStatus = document.querySelector("#mailDeliveryStatus");
const mailFormList = document.querySelector("#mailFormList");
const assetPanel = document.querySelector("#assetPanel");
const assetUploadStatus = document.querySelector("#assetUploadStatus");
const pluginList = document.querySelector("#pluginList");
const pluginCreateStatus = document.querySelector("#pluginCreateStatus");

function authHeaders(session) {
  void session;
  const headers = {};
  const csrf = readCsrfToken();
  if (csrf) headers[CSRF_HEADER] = csrf;
  return headers;
}

function apiFetchRaw(session, path, init = {}) {
  return fetch(`${session.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...authHeaders(session), ...(init.headers ?? {}) },
  });
}

function showView(target) {
  panel.hidden = true;
  for (const view of views) view.hidden = view.dataset.view !== target;
  for (const item of navItems) item.classList.toggle("active", item.dataset.target === target);
  if (target === "content") void refreshContentView();
  if (target === "media") void loadAssets();
}

function activeContentTab() {
  return document.querySelector("[data-content-tab].active")?.dataset.contentTab ?? "blog";
}

function refreshContentView() {
  void loadContentManager();
  const tab = activeContentTab();
  if (tab === "blog") void loadBlogs();
}

function openDevPanel() {
  panel.hidden = false;
  void loadPlugins();
}

function closeDevPanel() {
  panel.hidden = true;
}

for (const item of navItems) item.addEventListener("click", () => showView(item.dataset.target));
document.querySelector("#settingsButton").addEventListener("click", () => openDevPanel());
document.querySelector("#closeSettings").addEventListener("click", () => closeDevPanel());
panel.addEventListener("click", (event) => {
  if (event.target === panel) closeDevPanel();
});
document.querySelector("#refreshTree").addEventListener("click", () => refreshContentView());
document.querySelector("#refreshAssets").addEventListener("click", () => loadAssets());
document.querySelector("#refreshPlugins").addEventListener("click", () => loadPlugins());

for (const tab of document.querySelectorAll("[data-content-tab]")) {
  tab.addEventListener("click", () => {
    const target = tab.dataset.contentTab;
    treeSection.hidden = target !== "tree";
    blogPanel.hidden = target !== "blog";
    trashSection.hidden = target !== "trash";
    for (const button of document.querySelectorAll("[data-content-tab]")) button.classList.toggle("active", button === tab);
    if (target === "blog") void loadBlogs();
    if (target === "tree" || target === "trash") void loadContentManager();
  });
}

for (const details of document.querySelectorAll("#setupPanel details.dev-section")) {
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    if (details.querySelector("#customFieldForm")) void loadCustomContent();
    if (details.querySelector("#mailFormCreateForm")) void loadMailForms();
  });
}

const sessionInfo = getSession();
const siteLabel = document.querySelector("#siteLabel");
if (siteLabel && sessionInfo) {
  siteLabel.textContent = sessionInfo.siteId ? `サイト ${sessionInfo.siteId.slice(0, 8)}…` : "管理";
}

document.querySelector("#setupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const apiUrl = String(form.get("apiUrl")).replace(/\/$/, "");
  const publicUrl = String(form.get("publicUrl")).replace(/\/$/, "");
  const result = document.querySelector("#setupResult");
  result.textContent = "初期化中…";
  try {
    const response = await fetch(`${apiUrl}/v1/bootstrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries([...form].filter(([key]) => key !== "apiUrl" && key !== "publicUrl"))),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message ?? "初期化に失敗しました");
    localStorage.setItem("baser-edge-session", JSON.stringify({ apiUrl, publicUrl, ...json }));
    result.textContent = JSON.stringify(json, null, 2);
    await Promise.all([loadContentManager(), loadPlugins()]);
  } catch (error) {
    result.textContent = String(error);
  }
});

document.querySelector("#pluginCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const session=getSession(); if(!session)return; const form=new FormData(event.currentTarget); pluginCreateStatus.textContent="登録中…";
  try {
    const response=await apiFetchRaw(session, `/v1/plugins`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({workspaceId:session.workspaceId,key:String(form.get("key")),name:String(form.get("name")),trust:String(form.get("trust"))})});
    const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"Pluginを登録できません");
    pluginCreateStatus.textContent=`${result.name} を登録しました。ReleaseとCapability同意はAPI/CLIから追加できます。`;await loadPlugins();
  } catch(error){pluginCreateStatus.textContent=String(error);}
});

async function loadPlugins(){
  const session=getSession();if(!session){pluginList.innerHTML=`<p class="empty-state">接続後にPluginを表示します。</p>`;return;}pluginList.innerHTML=`<p class="empty-state">読み込み中…</p>`;
  try{const [pluginsResponse,activeResponse]=await Promise.all([apiFetchRaw(session, `/v1/workspaces/${session.workspaceId}/plugins`,{headers:authHeaders(session)}),apiFetchRaw(session, `/v1/workspaces/${session.workspaceId}/plugin-activations?siteId=${session.siteId}`,{headers:authHeaders(session)})]);const plugins=await pluginsResponse.json(),active=await activeResponse.json();if(!pluginsResponse.ok)throw new Error(plugins.error?.message??"Pluginを取得できません");if(!activeResponse.ok)throw new Error(active.error?.message??"有効化情報を取得できません");pluginList.replaceChildren(renderPlugins(plugins,active));}catch(error){pluginList.innerHTML=`<p class="empty-state error">${escapeHtml(String(error))}</p>`;}
}
function renderPlugins(plugins,active){if(!plugins.length)return message("Pluginはまだありません。");const list=document.createElement("div");list.className="trash-list";for(const plugin of plugins){const activation=active.find((entry)=>entry.plugin.id===plugin.id);const card=document.createElement("article");card.className="tree-row";card.innerHTML=`<span class="type-icon">P</span><span class="tree-main"><strong>${escapeHtml(plugin.name)}</strong><small>${escapeHtml(plugin.key)} · ${escapeHtml(plugin.trust)}${activation?` · ${escapeHtml(activation.release.version)}`:""}</small></span><span class="type-pill">${activation?"active":"inactive"}</span>`;list.append(card);}return list;}

document.querySelector("#blogCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const session = getSession();
  if (!session) return;
  const form = new FormData(event.currentTarget);
  blogCreateStatus.textContent = "ブログを作成中…";
  try {
    const response = await apiFetchRaw(session, `/v1/blogs`, {
      method: "POST",
      headers: { ...authHeaders(session), "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ siteId: session.siteId, title: String(form.get("title")), slug: String(form.get("slug")), document: simpleDocument(String(form.get("title"))) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "ブログを作成できません");
    blogCreateStatus.textContent = `${result.snapshot.route.path} を作成しました。公開には承認が必要です。`;
    await Promise.all([loadBlogs(), loadContentManager()]);
  } catch (error) { blogCreateStatus.textContent = formatRouteError(error); }
});

function formatRouteError(message) {
  const text = String(message).replace(/^Error:\s*/, "");
  if (!/already exists/i.test(text)) return text;
  return `${text} — 同じURLの記事が既にあります。「記事下書き」から公開するか、スラッグを変えてください。`;
}

document.querySelector("#articleCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formEl = event.currentTarget;
  const session = getSession();
  if (!session) return;
  const form = new FormData(formEl);
  const collectionId = String(form.get("collectionId"));
  const articleSlug = String(form.get("slug")).trim();
  const blogEntry = blogState.find((entry) => entry.collection.id === collectionId);
  if (blogEntry && articleSlug) {
    const path = `${blogEntry.snapshot.route.path.replace(/\/$/, "")}/${articleSlug}`;
    if (contentTreeState.some((entry) => entry.snapshot.route.path === path)) {
      articleCreateStatus.textContent = formatRouteError(`Route ${path} already exists`);
      return;
    }
  }
  articleCreateStatus.textContent = "記事の下書きを作成中…";
  try {
    const response = await apiFetchRaw(session, `/v1/blogs/${encodeURIComponent(String(form.get("collectionId")))}/articles`, {
      method: "POST",
      headers: { ...authHeaders(session), "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ title: String(form.get("title")), slug: String(form.get("slug")), document: simpleDocument(String(form.get("title"))) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "記事を作成できません");
    articleCreateStatus.textContent = `${result.route.path} の下書きを作成しました。`;
    formEl.reset();
    await Promise.all([loadBlogs(), loadContentManager()]);
  } catch (error) { articleCreateStatus.textContent = formatRouteError(error); }
});

document.querySelector("#customFieldForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const formEl=event.currentTarget; const session=getSession(); if(!session)return; const form=new FormData(formEl); customFieldStatus.textContent="作成中…";
  try{const response=await apiFetchRaw(session, `/v1/custom-fields`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({workspaceId:session.workspaceId,name:String(form.get("name")),key:String(form.get("key")),type:String(form.get("type"))})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"フィールドを作成できません");customFieldStatus.textContent=`${result.name} (${result.key}) を作成しました。`;formEl.reset();await loadCustomContent();}catch(error){customFieldStatus.textContent=String(error);}
});
document.querySelector("#customTableForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const formEl=event.currentTarget; const session=getSession(); if(!session)return; const form=new FormData(formEl); customTableStatus.textContent="作成中…";
  try{const response=await apiFetchRaw(session, `/v1/custom-tables`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({workspaceId:session.workspaceId,name:String(form.get("name")),key:String(form.get("key")),kind:"content"})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"テーブルを作成できません");customTableStatus.textContent=`${result.name} を作成しました。`;formEl.reset();await loadCustomContent();}catch(error){customTableStatus.textContent=String(error);}
});
document.querySelector("#customAttachForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const session=getSession(); if(!session)return; const form=new FormData(event.currentTarget); customAttachStatus.textContent="関連付け中…";
  try{const tableId=String(form.get("tableId"));const response=await apiFetchRaw(session, `/v1/custom-tables/${encodeURIComponent(tableId)}/fields`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({fieldId:String(form.get("fieldId")),required:form.get("required")==="on",searchable:form.get("searchable")==="on"})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"関連付けできません");customAttachStatus.textContent=`Schema v${result.table.schemaVersion} へ更新しました。`;await loadCustomContent();}catch(error){customAttachStatus.textContent=String(error);}
});
document.querySelector("#customContentForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const formEl=event.currentTarget; const session=getSession(); if(!session)return; const form=new FormData(formEl); customContentStatus.textContent="配置中…";
  try{const title=String(form.get("title"));const response=await apiFetchRaw(session, `/v1/custom-contents`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({siteId:session.siteId,tableId:String(form.get("tableId")),title,slug:String(form.get("slug")),document:simpleDocument(title)})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"配置できません");customContentStatus.textContent=`${result.snapshot.route.path} を配置しました。公開には承認が必要です。`;formEl.reset();await Promise.all([loadCustomContent(),loadContentManager()]);}catch(error){customContentStatus.textContent=String(error);}
});
customEntryContent.addEventListener("change",()=>renderCustomEntryFields());
document.querySelector("#customEntryForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const formEl=event.currentTarget; const session=getSession(); if(!session)return; const form=new FormData(formEl); const selected=customState.contents.find((item)=>item.definition.id===String(form.get("customContentId"))); if(!selected)return; const values={};
  for(const {definition} of selected.schema.fields){const input=formEl.elements.namedItem(`field:${definition.key}`);if(!input)continue;if(definition.type==="boolean")values[definition.key]=input.checked;else if(definition.type==="integer"||definition.type==="decimal")values[definition.key]=input.value===""?null:Number(input.value);else if(definition.type==="richtext")values[definition.key]=simpleDocument(input.value);else values[definition.key]=input.value;}
  customEntryStatus.textContent="下書きを作成中…";
  try{const response=await apiFetchRaw(session, `/v1/custom-contents/${encodeURIComponent(selected.definition.id)}/entries`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({slug:String(form.get("slug"))||null,values})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"エントリーを作成できません");customEntryStatus.textContent=`${result.entry.id} の下書きを作成しました。`;formEl.reset();renderCustomEntryFields();await loadCustomContent();}catch(error){customEntryStatus.textContent=String(error);}
});

document.querySelector("#mailFormCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const session=getSession(); if(!session)return; const form=new FormData(event.currentTarget);
  mailFormStatus.textContent="メールフォームを作成中…";
  try {
    const recipientEmails=String(form.get("recipientEmails")).split(",").map((value)=>value.trim()).filter(Boolean);
    const response=await apiFetchRaw(session, `/v1/mail-forms`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({
      siteId:session.siteId,parentId:null,tableId:String(form.get("tableId")),title:String(form.get("title")),slug:String(form.get("slug")),recipientEmails,
      senderAddress:String(form.get("senderAddress")),subjectTemplate:String(form.get("subjectTemplate")),autoReplyEnabled:form.get("autoReplyEnabled")==="on",
      autoReplyEmailFieldKey:String(form.get("autoReplyEmailFieldKey")||"").trim()||null,turnstileRequired:form.get("turnstileRequired")==="on",document:simpleDocument(String(form.get("title")))
    })});
    const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"メールフォームを作成できません");
    mailFormStatus.textContent=`${result.snapshot.route.path} を作成しました。公開には承認が必要です。`;await Promise.all([loadMailForms(),loadContentManager()]);
  } catch(error){mailFormStatus.textContent=String(error);}
});

document.querySelector("#mailDeliveryForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const session=getSession(); if(!session)return; mailDeliveryStatus.textContent="配送中…";
  try{const response=await apiFetchRaw(session, `/v1/mail-notifications/deliver`,{method:"POST",headers:{...authHeaders(session),"content-type":"application/json"},body:JSON.stringify({limit:20})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??"通知を配送できません");mailDeliveryStatus.textContent=`送信 ${result.sent}件・失敗 ${result.failed}件`;await loadMailForms();}catch(error){mailDeliveryStatus.textContent=String(error);}
});

document.querySelector("#assetUploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formEl = event.currentTarget;
  const session = getSession();
  const file = document.querySelector("#assetFile").files?.[0];
  if (!session || !file) return;
  assetUploadStatus.textContent = "UploadSessionを発行中…";
  try {
    const sessionResponse = await apiFetchRaw(session, `/v1/assets/upload-sessions`, {
      method: "POST",
      headers: { ...authHeaders(session), "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ workspaceId: session.workspaceId, filename: file.name, mediaType: file.type || "application/octet-stream", maximumBytes: file.size }),
    });
    const upload = await sessionResponse.json();
    if (!sessionResponse.ok) throw new Error(upload.error?.message ?? "UploadSessionを作成できません");
    assetUploadStatus.textContent = "R2へアップロード中…";
    const putResponse = await fetch(upload.uploadUrl, { method: upload.method, headers: upload.requiredHeaders, body: file });
    const result = await putResponse.json();
    if (!putResponse.ok) throw new Error(result.error?.message ?? "アップロードできません");
    assetUploadStatus.textContent = `${result.originalFilename} を登録しました。`;
    formEl.reset();
    await loadAssets();
  } catch (error) {
    assetUploadStatus.textContent = String(error);
  }
});

async function loadCustomContent() {
  const session=getSession(); if(!session){customContentList.innerHTML=`<p class="empty-state">右上の「接続」から初期化してください。</p>`;return;}
  customContentList.innerHTML=`<p class="empty-state">読み込み中…</p>`;
  try{const [fieldResponse,tableResponse,contentResponse]=await Promise.all([apiFetchRaw(session, `/v1/custom-fields?workspaceId=${encodeURIComponent(session.workspaceId)}`,{headers:authHeaders(session)}),apiFetchRaw(session, `/v1/custom-tables?workspaceId=${encodeURIComponent(session.workspaceId)}`,{headers:authHeaders(session)}),apiFetchRaw(session, `/v1/sites/${encodeURIComponent(session.siteId)}/custom-contents`,{headers:authHeaders(session)})]);const fields=await fieldResponse.json(),tables=await tableResponse.json(),contents=await contentResponse.json();if(!fieldResponse.ok||!tableResponse.ok||!contentResponse.ok)throw new Error(fields.error?.message??tables.error?.message??contents.error?.message??"カスタムコンテンツを取得できません");customState={fields,tables,contents};populateSelect(document.querySelector("#customAttachTable"),tables,(item)=>item.id,(item)=>`${item.name} (v${item.schemaVersion})`);populateSelect(document.querySelector("#customContentTable"),tables.filter((item)=>item.kind==="content"),(item)=>item.id,(item)=>item.name);populateSelect(document.querySelector("#customAttachField"),fields,(item)=>item.id,(item)=>`${item.name} [${item.type}]`);populateSelect(customEntryContent,contents,(item)=>item.definition.id,(item)=>item.snapshot.workingRevision?.fields?.title??item.snapshot.node.slug);renderCustomEntryFields();customContentList.replaceChildren(renderCustomContents(contents,session));}catch(error){customContentList.innerHTML=`<p class="empty-state error">${escapeHtml(String(error))}</p>`;}
}
function populateSelect(select,items,value,label){const current=select.value;select.replaceChildren(...items.map((item)=>{const option=document.createElement("option");option.value=value(item);option.textContent=label(item);return option;}));if(items.some((item)=>value(item)===current))select.value=current;}
function renderCustomEntryFields(){const selected=customState.contents.find((item)=>item.definition.id===customEntryContent.value);customEntryFields.replaceChildren();if(!selected){customEntryFields.append(message("先にカスタムコンテンツを配置してください。"));return;}for(const {definition,relation} of selected.schema.fields){const label=document.createElement("label");label.textContent=relation.labelOverride??definition.name;let input;if(definition.type==="textarea"||definition.type==="richtext"){input=document.createElement("textarea");input.rows=definition.type==="richtext"?4:3;}else{input=document.createElement("input");input.type=definition.type==="boolean"?"checkbox":definition.type==="integer"||definition.type==="decimal"?"number":definition.type==="date"?"date":definition.type==="datetime"?"datetime-local":definition.type==="email"?"email":"text";}input.name=`field:${definition.key}`;input.required=relation.required;label.append(input);customEntryFields.append(label);}}
function renderCustomContents(contents,session){if(!contents.length)return message("カスタムコンテンツはまだありません。");const list=document.createElement("div");list.className="trash-list";for(const item of contents){const card=document.createElement("article");card.className="tree-row";const title=item.snapshot.workingRevision?.fields?.title??item.snapshot.node.slug;card.innerHTML=`<span class="type-icon">C</span><span class="tree-main"><strong>${escapeHtml(String(title))}</strong><small>${escapeHtml(item.snapshot.route.path)} · ${escapeHtml(item.schema.table.name)} · Schema v${item.schema.table.schemaVersion}</small></span><a class="preview-mini" target="_blank" rel="noopener" href="${escapeHtml(`${session.publicUrl}${item.snapshot.route.path}`)}">公開サイト</a><span class="type-pill">custom</span>`;list.append(card);}return list;}

async function loadMailForms() {
  const session=getSession(); if(!session){mailFormList.innerHTML=`<p class="empty-state">右上の「接続」から初期化してください。</p>`;return;}
  mailFormList.innerHTML=`<p class="empty-state">読み込み中…</p>`;
  try {
    const [tableResponse,formResponse]=await Promise.all([
      apiFetchRaw(session, `/v1/custom-tables?workspaceId=${encodeURIComponent(session.workspaceId)}`,{headers:authHeaders(session)}),
      apiFetchRaw(session, `/v1/sites/${encodeURIComponent(session.siteId)}/mail-forms`,{headers:authHeaders(session)})
    ]);
    const tables=await tableResponse.json(),forms=await formResponse.json();if(!tableResponse.ok||!formResponse.ok)throw new Error(tables.error?.message??forms.error?.message??"メールフォームを取得できません");
    populateSelect(mailFormTable,tables.filter((item)=>item.kind==="content"),(item)=>item.id,(item)=>`${item.name} (Schema v${item.schemaVersion})`);
    const entries=await Promise.all(forms.map(async(definition)=>{const [snapshotResponse,submissionsResponse]=await Promise.all([apiFetchRaw(session, `/v1/content/${encodeURIComponent(definition.contentItemId)}`,{headers:authHeaders(session)}),apiFetchRaw(session, `/v1/mail-forms/${encodeURIComponent(definition.id)}/submissions`,{headers:authHeaders(session)})]);const snapshot=await snapshotResponse.json(),submissions=await submissionsResponse.json();if(!snapshotResponse.ok||!submissionsResponse.ok)throw new Error(snapshot.error?.message??submissions.error?.message??"メールフォーム詳細を取得できません");return{definition,snapshot,submissions};}));
    mailFormList.replaceChildren(renderMailForms(entries,session));
  } catch(error){mailFormList.innerHTML=`<p class="empty-state error">${escapeHtml(String(error))}</p>`;}
}

function renderMailForms(entries,session){
  if(!entries.length)return message("メールフォームはまだありません。先にカスタムテーブルへ入力フィールドを関連付けてください。");
  const list=document.createElement("div");list.className="trash-list";
  for(const entry of entries){const card=document.createElement("article");card.className="tree-row";card.style.alignItems="flex-start";const title=entry.snapshot.workingRevision?.fields?.title??entry.snapshot.node.slug;const published=Boolean(entry.snapshot.publishedRevision);const submissions=entry.submissions??[];
    card.innerHTML=`<span class="type-icon">M</span><span class="tree-main"><strong>${escapeHtml(String(title))}</strong><small>${escapeHtml(entry.snapshot.route.path)} · ${entry.definition.turnstileRequired?"Turnstile必須":"Turnstile任意"} · 保持${entry.definition.retentionDays}日 · 送信${submissions.length}件</small><span class="mail-card-actions"><a class="preview-mini" target="_blank" rel="noopener" href="${escapeHtml(`${session.publicUrl}${entry.snapshot.route.path}`)}">公開フォーム</a>${published?'<span class="type-pill">published</span>':'<button class="preview-mini publish-mail" type="button">承認して公開</button>'}</span>${renderSubmissionSummary(submissions)}</span><span class="type-pill">mail</span>`;
    const publishButton=card.querySelector(".publish-mail");if(publishButton)publishButton.addEventListener("click",async()=>{publishButton.disabled=true;publishButton.textContent="公開中…";try{await approveAndPublish(session,entry.snapshot);await Promise.all([loadMailForms(),loadContentManager()]);}catch(error){alert(String(error));publishButton.disabled=false;publishButton.textContent="承認して公開";}});list.append(card);
  }return list;
}
function renderSubmissionSummary(submissions){if(!submissions.length)return '<span class="submission-list"><small>送信はまだありません。</small></span>';return `<span class="submission-list">${submissions.slice(0,5).map((view)=>`<span class="submission-row"><strong>${escapeHtml(new Date(view.submission.receivedAt).toLocaleString("ja-JP"))}</strong><small>${escapeHtml(view.submission.state)} · ${escapeHtml(view.submission.payloadState)}</small><code>${escapeHtml(JSON.stringify(view.values??{}))}</code></span>`).join("")}</span>`;}

async function loadAssets() {
  const session = getSession();
  if (!session) { assetPanel.innerHTML = `<p class="empty-state">右上の「接続」から初期化してください。</p>`; return; }
  assetPanel.innerHTML = `<p class="empty-state">読み込み中…</p>`;
  try {
    const response = await apiFetchRaw(session, `/v1/assets?workspaceId=${encodeURIComponent(session.workspaceId)}`, { headers: authHeaders(session), credentials: "include" });
    const assets = await response.json();
    if (!response.ok) throw new Error(assets.error?.message ?? "メディアを取得できません");
    assetPanel.replaceChildren(renderAssets(assets, session));
  } catch (error) {
    assetPanel.innerHTML = `<p class="empty-state error">${escapeHtml(String(error))}</p>`;
  }
}

function renderAssets(assets, session) {
  if (!assets.length) return message("メディアはまだありません。");
  const grid = document.createElement("div");
  grid.className = "asset-grid-inner";
  for (const asset of assets) {
    const card = document.createElement("article");
    card.className = "asset-card";
    const publicUrl = `${session.publicUrl ?? session.apiUrl.replace(/:\d+$/, ":8788")}/assets/${encodeURIComponent(asset.id)}`;
    card.innerHTML = `${asset.mediaType.startsWith("image/") ? `<img src="${escapeHtml(publicUrl)}" alt="">` : `<div class="file-tile">FILE</div>`}
      <strong>${escapeHtml(asset.originalFilename)}</strong>
      <small>${escapeHtml(asset.mediaType)} · ${asset.byteSize ?? 0} bytes</small>
      <span class="type-pill">${escapeHtml(asset.state)}</span>`;
    grid.append(card);
  }
  return grid;
}

async function createPreview(contentItemId, revisionId) {
  const session = getSession();
  if (!session) return;
  const response = await apiFetchRaw(session, `/v1/content/${encodeURIComponent(contentItemId)}/previews`, {
    method: "POST",
    headers: { ...authHeaders(session), "content-type": "application/json" }, credentials: "include",
    body: JSON.stringify({ revisionId, previewBaseUrl: session.publicUrl ?? session.apiUrl.replace(/:\d+$/, ":8788") }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "プレビューを作成できません");
  window.open(result.previewUrl, "_blank", "noopener,noreferrer");
}

async function loadBlogs() {
  const session = getSession();
  if (!session) { blogList.innerHTML = `<p class="empty-state">ログインしてください。</p>`; return; }
  blogList.innerHTML = `<p class="empty-state">読み込み中…</p>`;
  articleDraftList.innerHTML = `<h2>記事下書き</h2><p class="empty-state">読み込み中…</p>`;
  try {
    const [response, treeResponse] = await Promise.all([
      apiFetchRaw(session, `/v1/sites/${session.siteId}/blogs`),
      apiFetchRaw(session, `/v1/sites/${session.siteId}/content-tree`),
    ]);
    const blogs = await response.json();
    const tree = await treeResponse.json();
    if (!response.ok) throw new Error(blogs.error?.message ?? "ブログを取得できません");
    if (!treeResponse.ok) throw new Error(tree.error?.message ?? "コンテンツツリーを取得できません");
    blogState = blogs;
    contentTreeState = tree;
    articleCollection.replaceChildren(...blogs.map((entry) => { const option = document.createElement("option"); option.value = entry.collection.id; option.textContent = entry.snapshot.workingRevision?.fields?.title ?? entry.snapshot.node.slug; return option; }));
    blogList.replaceChildren(renderBlogs(blogs, session));
    const articles = tree.filter((entry) => entry.snapshot.item.contentTypeKey === "article");
    articleDraftList.replaceChildren(renderArticleDrafts(articles, session));
  } catch (error) { blogList.innerHTML = `<p class="empty-state error">${escapeHtml(String(error))}</p>`; }
}

function renderArticleDrafts(entries, session) {
  const heading = document.createElement("h2");
  heading.textContent = "記事下書き";
  if (!entries.length) return fragment(heading, message("記事下書きはまだありません。上のフォームから作成してください。"));
  const list = document.createElement("div");
  list.className = "trash-list";
  for (const entry of entries) {
    const published = Boolean(entry.snapshot.publishedRevision);
    const card = document.createElement("article");
    card.className = "tree-row";
    const title = displayTitle(entry);
    const publicUrl = `${session.publicUrl}${entry.snapshot.route.path}?baserAdminView=published`;
    card.innerHTML = `<span class="type-icon">A</span><span class="tree-main"><strong>${escapeHtml(String(title))}</strong><small>${escapeHtml(entry.snapshot.route.path)}</small><span class="mail-card-actions">${published ? `<a class="preview-mini" target="_blank" rel="noopener" href="${escapeHtml(publicUrl)}">公開ページ</a><span class="type-pill">published</span>` : `<button class="preview-mini publish-article" type="button">承認して公開</button>`}</span></span>`;
    const publishButton = card.querySelector(".publish-article");
    if (publishButton) {
      publishButton.addEventListener("click", async () => {
        publishButton.disabled = true;
        publishButton.textContent = "公開中…";
        try {
          await approveAndPublish(session, entry.snapshot);
          await Promise.all([loadBlogs(), loadContentManager()]);
        } catch (error) {
          alert(String(error));
          publishButton.disabled = false;
          publishButton.textContent = "承認して公開";
        }
      });
    }
    list.append(card);
  }
  return fragment(heading, list);
}

function fragment(...nodes) {
  const wrap = document.createDocumentFragment();
  for (const node of nodes) wrap.append(node);
  return wrap;
}

function renderBlogs(blogs, session) {
  if (!blogs.length) return message("ブログはまだありません。");
  const list = document.createElement("div");
  list.className = "trash-list";
  for (const entry of blogs) {
    const blog = entry.collection;
    const card = document.createElement("article");
    card.className = "tree-row";
    const title = entry.snapshot.workingRevision?.fields?.title ?? entry.snapshot.node.slug;
    const publicUrl = `${session.publicUrl}${entry.snapshot.route.path}?baserAdminView=published`;
    card.innerHTML = `<span class="type-icon">B</span><span class="tree-main"><strong>${escapeHtml(String(title))}</strong><small>${escapeHtml(entry.snapshot.route.path)} · 1ページ ${blog.pageSize}件 · RSS ${blog.feedSize}件</small></span><a class="preview-mini" target="_blank" rel="noopener" href="${escapeHtml(publicUrl)}">公開サイト</a><span class="type-pill">blog</span>`;
    list.append(card);
  }
  return list;
}

function simpleDocument(title) {
  return { formatVersion: 1, root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [{ id: crypto.randomUUID(), type: "heading", componentVersion: 1, props: { level: 1, text: title }, slots: {} }, { id: crypto.randomUUID(), type: "richText", componentVersion: 1, props: { paragraphs: ["本文を入力してください。"] }, slots: {} }] } } };
}

async function loadContentManager() {
  const session = getSession();
  if (!session) {
    treePanelBody.innerHTML = `<p class="empty-state">ログインしてください。</p>`;
    trashPanelBody.innerHTML = `<p class="empty-state">ログインしてください。</p>`;
    return;
  }
  treePanelBody.innerHTML = `<p class="empty-state">読み込み中…</p>`;
  trashPanelBody.innerHTML = `<p class="empty-state">読み込み中…</p>`;
  try {
    const [treeResponse, trashResponse] = await Promise.all([
      apiFetchRaw(session, `/v1/sites/${session.siteId}/content-tree`),
      apiFetchRaw(session, `/v1/sites/${session.siteId}/trash`),
    ]);
    const tree = await treeResponse.json();
    const trash = await trashResponse.json();
    if (!treeResponse.ok) throw new Error(tree.error?.message ?? "サイトツリーを取得できません");
    if (!trashResponse.ok) throw new Error(trash.error?.message ?? "ゴミ箱を取得できません");
    contentTreeState = tree;
    treePanelBody.replaceChildren(renderTree(tree));
    trashPanelBody.replaceChildren(renderTrash(trash));
  } catch (error) {
    treePanelBody.innerHTML = `<p class="empty-state error">${escapeHtml(String(error))}</p>`;
    trashPanelBody.innerHTML = `<p class="empty-state error">取得できませんでした。</p>`;
  }
}

function renderTree(entries) {
  if (!entries.length) return message("コンテンツはまだありません。Folder、Page、Blogを作成してください。");
  const byParent = new Map();
  for (const entry of entries) {
    const key = entry.snapshot.node.parentId ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(entry);
  }
  for (const values of byParent.values()) values.sort((a, b) => a.snapshot.node.sortKey.localeCompare(b.snapshot.node.sortKey));
  const root = document.createElement("ol");
  root.className = "content-tree";
  appendChildren(root, byParent, "root", 0);
  return root;
}

function appendChildren(list, byParent, parentId, depth) {
  for (const entry of byParent.get(parentId) ?? []) {
    const item = entry.snapshot.item;
    const node = entry.snapshot.node;
    const li = document.createElement("li");
    li.style.setProperty("--depth", depth);
    const row = document.createElement("article");
    row.className = "tree-row";
    row.innerHTML = `
      <span class="type-icon" aria-hidden="true">${typeIcon(item.contentTypeKey)}</span>
      <span class="tree-main"><strong>${escapeHtml(displayTitle(entry))}</strong><small>${escapeHtml(entry.snapshot.route.path)}</small></span>
      ${item.contentTypeKey === "page" && entry.snapshot.workingRevision ? `<button class="preview-mini" type="button">Preview</button>` : ""}
      <span class="type-pill">${escapeHtml(item.contentTypeKey)}</span>`;
    const previewButton = row.querySelector(".preview-mini");
    if (previewButton) previewButton.addEventListener("click", () => createPreview(item.id, entry.snapshot.workingRevision.id).catch((error) => alert(String(error))));
    li.append(row);
    const children = byParent.get(node.id);
    if (children?.length) {
      const nested = document.createElement("ol");
      appendChildren(nested, byParent, node.id, depth + 1);
      li.append(nested);
    }
    list.append(li);
  }
}

function renderTrash(entries) {
  if (!entries.length) return message("ゴミ箱は空です。");
  const list = document.createElement("div");
  list.className = "trash-list";
  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = "tree-row trash-row";
    card.innerHTML = `
      <span class="type-icon" aria-hidden="true">↩</span>
      <span class="tree-main"><strong>${escapeHtml(displayTitle(entry))}</strong><small>元のURL: ${escapeHtml(entry.trash.previousPath)}</small></span>
      <span class="type-pill">復元可能</span>`;
    list.append(card);
  }
  return list;
}

function displayTitle(entry) {
  const title = entry.snapshot.workingRevision?.fields?.title;
  return typeof title === "string" && title ? title : entry.snapshot.node.slug;
}

function typeIcon(type) {
  if (type === "folder") return "▾";
  if (type === "alias") return "↗";
  if (type === "blog") return "B";
  if (type === "article") return "A";
  if (type === "custom-content") return "C";
  if (type === "mail-form") return "M";
  return "▤";
}

function message(text) {
  const p = document.createElement("p");
  p.className = "empty-state";
  p.textContent = text;
  return p;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

showView("content");
void loadBlogs();
