import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";

import { RequireAuth } from "./auth/RequireAuth";

import { AdminLayout } from "./layout/AdminLayout";

import "./layout/admin.css";

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

export function App() {

  return (

    <AuthProvider>

      <Routes>

        <Route path="/login" element={<LoginPage />} />

        <Route

          path="/"

          element={(

            <RequireAuth>

              <AdminLayout />

            </RequireAuth>

          )}

        >

          <Route index element={<Navigate to="/content" replace />} />

          <Route path="content" element={<ContentLayout />}>

            <Route index element={<ContentIndexPlaceholder />} />

            <Route path=":contentId" element={<ContentEditPage />} />

          </Route>

          <Route path="media" element={<MediaLayout />}>
            <Route index element={<MediaLibraryPage />} />
            <Route path="upload" element={<MediaUploadPage />} />
          </Route>

          <Route path="trash" element={<TrashPage />} />

          <Route path="approvals" element={<ApprovalsPage />} />

          <Route path="custom" element={<CustomContentPage />} />

          <Route path="custom/:definitionId/entries" element={<CustomContentEntriesPage />} />

          <Route path="custom/:definitionId/entries/:entryId" element={<CustomEntryEditPage />} />

          <Route path="mail" element={<MailPage />} />

          <Route path="themes" element={<ActivationsPage />} />

          <Route path="plugins" element={<PluginsPage />} />

        </Route>

        <Route path="*" element={<Navigate to="/content" replace />} />

      </Routes>

    </AuthProvider>

  );

}

