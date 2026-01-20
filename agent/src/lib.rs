use serde::{Deserialize, Serialize};
use weil_macros::{constructor, mutate, query, smart_contract, WeilType};

pub trait InvoiceAgent {
    fn new() -> Result<Self, String>
    where
        Self: Sized;
    async fn increment(&mut self);
    async fn get_count(&self) -> u32;
    async fn create_invoice(&mut self);
    async fn get_invoice_count(&self) -> u32;
    async fn reset(&mut self);
}

#[derive(Serialize, Deserialize, WeilType)]
pub struct InvoiceAgentState {
    counter: u32,
    invoice_count: u32,
}

#[smart_contract]
impl InvoiceAgent for InvoiceAgentState {
    #[constructor]
    fn new() -> Result<Self, String>
    where
        Self: Sized,
    {
        Ok(Self {
            counter: 0,
            invoice_count: 0,
        })
    }

    #[mutate]
    async fn increment(&mut self) {
        self.counter += 1;
    }

    #[query]
    async fn get_count(&self) -> u32 {
        self.counter
    }

    #[mutate]
    async fn create_invoice(&mut self) {
        self.invoice_count += 1;
    }

    #[query]
    async fn get_invoice_count(&self) -> u32 {
        self.invoice_count
    }

    #[mutate]
    async fn reset(&mut self) {
        self.counter = 0;
        self.invoice_count = 0;
    }
}
