// Global State Management with Zustand
import { create } from 'zustand';
import { Invoice, InvoiceStatus, UserRole, CONTRACT_CONFIG } from './contracts/config';

// Demo invoice for Pending Requests - this shows until real invoices are minted
const INITIAL_INVOICES: Invoice[] = [
    {
        id: 'INV-DEMO-001',
        supplier: CONTRACT_CONFIG.TEST_ACCOUNTS.SUPPLIER,
        buyer: CONTRACT_CONFIG.TEST_ACCOUNTS.BUYER,
        amount: '100000000000', // 10,000 XLM
        currency: 'XLM',
        createdAt: Math.floor(Date.now() / 1000) - 86400,
        dueDate: Math.floor(Date.now() / 1000) + 86400 * 90,
        verifiedAt: 0,
        settledAt: 0,
        status: InvoiceStatus.Draft,
        tokenSymbol: '',
        totalTokens: '0',
        description: 'Sample Invoice - Web Development Services',
        purchaseOrder: 'PO-DEMO-001',
        repaymentReceived: '0',
        buyerSignedAt: 0,
    },
];

interface WalletState {
    isConnected: boolean;
    address: string | null;
    role: UserRole | null;
}

interface AppState {
    // Wallet
    wallet: WalletState;
    connectWallet: (address: string, role: UserRole) => void;
    disconnectWallet: () => void;

    // Demo Mode
    isDemoMode: boolean;
    demoRole: UserRole;
    setDemoRole: (role: UserRole) => void;

    // Invoices
    invoices: Invoice[];
    selectedInvoice: Invoice | null;
    setSelectedInvoice: (invoice: Invoice | null) => void;
    addInvoice: (invoice: Invoice) => void;
    updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
    fetchInvoices: () => Promise<void>;

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

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
    txHash?: string; // For linking to Stellar explorer
}

export const useStore = create<AppState>((set, get) => ({
    // Wallet State
    wallet: {
        isConnected: false,
        address: null,
        role: null,
    },

    // Demo State
    isDemoMode: true, // Default to demo mode for now
    demoRole: UserRole.Supplier, // Default start as Supplier
    setDemoRole: (role: UserRole) => {
        set({ demoRole: role });
        // Auto-connect wallet with mock address when role changes in demo mode
        const mockAddress = CONTRACT_CONFIG.TEST_ACCOUNTS[role.toUpperCase() as keyof typeof CONTRACT_CONFIG.TEST_ACCOUNTS];
        get().connectWallet(mockAddress, role);
    },

    connectWallet: (address: string, role: UserRole) => {
        set({
            wallet: {
                isConnected: true,
                address,
                role,
            },
        });
        get().addNotification({
            type: 'success',
            title: 'Wallet Connected',
            message: `Connected as ${role}`,
        });
    },

    disconnectWallet: () => {
        set({
            wallet: {
                isConnected: false,
                address: null,
                role: null,
            },
        });
    },

    // Invoices
    invoices: INITIAL_INVOICES,
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

    fetchInvoices: async () => {
        set({ isLoading: true });
        try {
            // Import dynamically to avoid SSR issues
            const { getInvoice } = await import('./contracts/client');

            // Demo IDs to check
            const demoIds = ['INV-1001', 'INV-1002', 'INV-1003', 'INV-1018'];
            const fetchedInvoices: Invoice[] = [];

            // We use the admin account to read for now, as it has permission
            const reader = CONTRACT_CONFIG.TEST_ACCOUNTS.ADMIN;

            for (const id of demoIds) {
                const invoice = await getInvoice(id, reader);
                if (invoice) {
                    fetchedInvoices.push(invoice);
                }
            }

            if (fetchedInvoices.length > 0) {
                // Merge with mock invoices, prioritizing fetched ones
                const currentInvoices = get().invoices;
                // Simple merge for demo: fetch + mock that aren't fetched
                const merged = [
                    ...fetchedInvoices,
                    ...currentInvoices.filter(m => !fetchedInvoices.find(f => f.id === m.id))
                ];
                set({ invoices: merged });
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            set({ isLoading: false });
        }
    },

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
}));
