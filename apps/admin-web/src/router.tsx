import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AdminLayout } from "./layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { ContentLayout, ContentIndexPlaceholder } from "./pages/ContentLayout";
import { ContentEditPage } from "./pages/ContentEditPage";
import { MediaLayout } from "./pages/media/MediaLayout";
import { MediaLibraryPage } from "./pages/media/MediaLibraryPage";
import { MediaUploadPage } from "./pages/media/MediaUploadPage";
import { TrashPage } from "./pages/TrashPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { CustomContentPage } from "./pages/CustomContentPage";
import { MailPage } from "./pages/MailPage";
import { ActivationsPage } from "./pages/ActivationsPage";
import { PluginsPage } from "./pages/PluginsPage";
import { CustomContentEntriesPage, CustomEntryEditPage } from "./pages/CustomEntryPages";
import { CustomEntriesLayout } from "./pages/CustomEntriesLayout";
import { LiveSiteOutOfSyncPage } from "./pages/LiveSiteOutOfSyncPage";

export const adminRouter = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: (
        <RequireAuth>
          <AdminLayout />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <Navigate to="/content" replace /> },
        {
          path: "content",
          element: <ContentLayout />,
          children: [
            { index: true, element: <ContentIndexPlaceholder /> },
            { path: "overview/:overviewContentId", element: <ContentIndexPlaceholder /> },
            { path: ":contentId", element: <ContentEditPage /> },
          ],
        },
        {
          path: "media",
          element: <MediaLayout />,
          children: [
            { index: true, element: <MediaLibraryPage /> },
            { path: "upload", element: <MediaUploadPage /> },
          ],
        },
        { path: "trash", element: <TrashPage /> },
        { path: "approvals", element: <ApprovalsPage /> },
        { path: "out-of-sync", element: <LiveSiteOutOfSyncPage /> },
        { path: "custom", element: <CustomContentPage /> },
        {
          path: "custom/:definitionId/entries",
          element: <CustomEntriesLayout />,
          children: [
            { index: true, element: <CustomContentEntriesPage /> },
            { path: ":entryId", element: <CustomEntryEditPage /> },
          ],
        },
        { path: "mail", element: <MailPage /> },
        { path: "themes", element: <ActivationsPage /> },
        { path: "plugins", element: <PluginsPage /> },
      ],
    },
    { path: "*", element: <Navigate to="/content" replace /> },
  ],
  { basename: "/console" },
);
