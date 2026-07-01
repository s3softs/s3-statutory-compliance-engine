/**
 * Generic Rule Engine
 * Evaluates payloads against specific provider rules and thresholds.
 */
class RuleEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the rule evaluation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider (e.g., TDSProvider)
     * @param {Object} payload - Transaction payload
     */
    async evaluate(provider, payload) {
        if (!provider || typeof provider.evaluateRules !== 'function') {
            throw new Error('[RuleEngine] Invalid provider or missing evaluateRules method.');
        }
        return await provider.evaluateRules(payload, this.connection);
    }
}

module.exports = RuleEngine;
