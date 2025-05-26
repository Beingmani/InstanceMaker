
// Extend the existing Figma Plugin API with Payments
declare global {
    interface PluginAPI {
      payments: {
        status: {
          type: "UNPAID" | "PAID" | "NOT_SUPPORTED"
        };
        getUserFirstRanSecondsAgo(): number;
        initiateCheckoutAsync(options?: { interstitial: 'PAID_FEATURE' | 'TRIAL_ENDED' | 'SKIP' }): Promise<void>;
        requestCheckout(): void;
        getPluginPaymentTokenAsync(): Promise<string>;
        setPaymentStatusInDevelopment(status: { type: "UNPAID" | "PAID" | "NOT_SUPPORTED" }): void;
      };
    }
  }
  
  export {};