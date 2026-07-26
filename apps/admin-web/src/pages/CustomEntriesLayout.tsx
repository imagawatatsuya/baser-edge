import { Outlet, useParams } from "react-router-dom";
import { CustomEntriesProvider, useCustomEntries } from "../hooks/useCustomEntries";

export function CustomEntriesLayout() {
  const { definitionId = "" } = useParams();
  const entriesState = useCustomEntries(definitionId);

  return (
    <CustomEntriesProvider value={entriesState}>
      <Outlet />
    </CustomEntriesProvider>
  );
}
