// Global State Management with Zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Invoice } from './contracts/config';

interface WalletState {
    isConnected: boolean;
    address: string | null;
}

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
    txHash?: string;
}

interface AppState {
    // Wallet
    wallet: WalletState;
    connectWallet: (address: string) => void;
    disconnectWallet: () => void;

    // Invoices
    invoices: Invoice[];
    selectedInvoice: Invoice | null;
    setSelectedInvoice: (invoice: Invoice | null) => void;
    addInvoice: (invoice: Invoice) => void;
    updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
    setInvoices: (invoices: Invoice[]) => void;

    // UI State
    isLoading: boolean;
    setLoading: (loading: boolean) => void;

    // Modals
    activeModal: string | null;
    openModal: (modalId: string) => void;
    closeModal: () => void;

    // Notifications
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
}

// FIX: Add persist middleware to save wallet state to localStorage
export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Wallet State
            wallet: {
                isConnected: false,
                address: null,
            },

            connectWallet: (address: string) => {
                set({
                    wallet: {
                        isConnected: true,
                        address,
                    },
                });
                get().addNotification({
                    type: 'success',
                    title: 'Wallet Connected',
                    message: `Connected: ${address.slice(0, 8)}...${address.slice(-4)}`,
                });
            },

            disconnectWallet: () => {
                set({
                    wallet: {
                        isConnected: false,
                        address: null,
                    },
                });
            },

            // Invoices - start empty, will be fetched from API/chain
            invoices: [],
            selectedInvoice: null,

            setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),

            addInvoice: (invoice) => {
                set((state) => ({
                    invoices: [...state.invoices, invoice],
                }));
            },

            updateInvoice: (invoiceId, updates) => {
                set((state) => ({
                    invoices: state.invoices.map((inv) =>
                        inv.id === invoiceId ? { ...inv, ...updates } : inv
                    ),
                }));
            },

            setInvoices: (invoices) => set({ invoices }),

            // UI State
            isLoading: false,
            setLoading: (loading) => set({ isLoading: loading }),

            // Modals
            activeModal: null,
            openModal: (modalId) => set({ activeModal: modalId }),
            closeModal: () => set({ activeModal: null }),

            // Notifications
            notifications: [],

            addNotification: (notification) => {
                const id = Math.random().toString(36).substring(7);
                set((state) => ({
                    notifications: [...state.notifications, { ...notification, id }],
                }));

                // Auto-remove after 5 seconds
                setTimeout(() => {
                    get().removeNotification(id);
                }, 5000);
            },

            removeNotification: (id) => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            },
        }),
        {
            name: 'sangini-storage', // localStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist wallet state, not transient UI state
            partialize: (state) => ({
                wallet: state.wallet,
                // Don't persist: invoices (fetched from API), selectedInvoice, notifications, modals
            }),
        }
    )
);
