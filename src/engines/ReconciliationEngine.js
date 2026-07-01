/**
 * Generic Reconciliation Engine
 * Reconciles portal data against books.
 */
class ReconciliationEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the reconciliation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider
     * @param {Object} booksData - Data from the local ERP/Books
     * @param {Object} portalData - Data fetched/uploaded from the Gov Portal
     */
    async reconcile(provider, booksData, portalData) {
        if (!provider || typeof provider.reconcile !== 'function') {
            throw new Error('[ReconciliationEngine] Invalid provider or missing reconcile method.');
        }
        return await provider.reconcile(booksData, portalData, this.connection);
    }
}

module.exports = ReconciliationEngine;
