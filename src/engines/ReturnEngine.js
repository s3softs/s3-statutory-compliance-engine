/**
 * Generic Return Engine
 * Generates structured returns (JSON/Excel/XML) as per statutory formats.
 */
class ReturnEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the return generation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider
     * @param {Object} parameters - Scope of the return (e.g. date range, format)
     */
    async generateReturn(provider, parameters) {
        if (!provider || typeof provider.generateReturn !== 'function') {
            throw new Error('[ReturnEngine] Invalid provider or missing generateReturn method.');
        }
        return await provider.generateReturn(parameters, this.connection);
    }
}

module.exports = ReturnEngine;
