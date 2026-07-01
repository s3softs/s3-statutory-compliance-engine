/**
 * Generic Calculation Engine
 * Calculates tax amounts, deductions, and exemptions based on evaluated rules.
 */
class CalculationEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the calculation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider
     * @param {Object} evaluationResult - Output from the RuleEngine
     */
    calculate(provider, evaluationResult) {
        if (!provider || typeof provider.calculate !== 'function') {
            throw new Error('[CalculationEngine] Invalid provider or missing calculate method.');
        }
        return provider.calculate(evaluationResult);
    }
}

module.exports = CalculationEngine;
