import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  selectedTeamId: string;
  selectedDealId: string | null;
  dealDrawerOpen: boolean;
  commandOpen: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (v: boolean) => void;
  setSelectedTeamId: (id: string) => void;
  openDealDrawer: (dealId: string) => void;
  closeDealDrawer: () => void;
  setCommandOpen: (v: boolean) => void;
}

const SIDEBAR_PREFERENCE = "crm.sidebar.collapsed";
function saveSidebarPreference(value: boolean) { try { localStorage.setItem(SIDEBAR_PREFERENCE, String(value)); } catch { /* Storage may be unavailable. */ } }

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  selectedTeamId: "team-gestao",
  selectedDealId: null,
  dealDrawerOpen: false,
  commandOpen: false,
  setSidebarCollapsed: (sidebarCollapsed) => { saveSidebarPreference(sidebarCollapsed); set({ sidebarCollapsed }); },
  toggleSidebar: () => set((s) => { const sidebarCollapsed = !s.sidebarCollapsed; saveSidebarPreference(sidebarCollapsed); return { sidebarCollapsed }; }),
  setSidebarMobileOpen: (sidebarMobileOpen) => set({ sidebarMobileOpen }),
  setSelectedTeamId: (selectedTeamId) => set({ selectedTeamId }),
  openDealDrawer: (dealId) =>
    set({ selectedDealId: dealId, dealDrawerOpen: true }),
  closeDealDrawer: () => set({ dealDrawerOpen: false, selectedDealId: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
