/**
 * Generic Validation Engine
 * Validates payloads structurally and legally before execution.
 */
class ValidationEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the validation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider
     * @param {Object} payload - The input data to validate
     */
    async validate(provider, payload) {
        if (!provider || typeof provider.validate !== 'function') {
            throw new Error('[ValidationEngine] Invalid provider or missing validate method.');
        }
        return await provider.validate(payload, this.connection);
    }
}

module.exports = ValidationEngine;
