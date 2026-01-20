
use serde::{Deserialize, Serialize};
use weil_macros::{constructor, mutate, query, secured, smart_contract, WeilType};
use weil_rs::collections::{streaming::ByteStream, plottable::Plottable};
use weil_rs::config::Secrets;
use weil_rs::webserver::WebServer;


trait InvoiceAgent {
    fn new() -> Result<Self, String>
    where
        Self: Sized;
    async fn new(&mut self);
    async fn increment(&mut self);
    async fn create_invoice(&mut self);
    async fn reset(&mut self);
    async fn get_count(&self) -> u32;
    async fn get_invoice_count(&self) -> u32;
}

#[derive(Serialize, Deserialize, WeilType)]
pub struct InvoiceAgentContractState {
    // define your contract state here!
}

#[smart_contract]
impl InvoiceAgent for InvoiceAgentContractState {
    #[constructor]
    fn new() -> Result<Self, String>
    where
        Self: Sized,
    {
        unimplemented!();
    }


    #[mutate]
    async fn new(&mut self) {
        unimplemented!();
    }

    #[mutate]
    async fn increment(&mut self) {
        unimplemented!();
    }

    #[mutate]
    async fn create_invoice(&mut self) {
        unimplemented!();
    }

    #[mutate]
    async fn reset(&mut self) {
        unimplemented!();
    }

    #[query]
    async fn get_count(&self) -> u32 {
        unimplemented!();
    }

    #[query]
    async fn get_invoice_count(&self) -> u32 {
        unimplemented!();
    }
}

