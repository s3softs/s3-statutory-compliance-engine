/**
 * Generic Compliance Report Engine
 * Generates CA registers, PDF/Excel audit reports.
 */
class ComplianceReportEngine {
    constructor({ connection, logger }) {
        this.connection = connection;
        this.logger = logger;
    }

    /**
     * Executes the report generation logic defined by the provider.
     * @param {Object} provider - The specific compliance provider
     * @param {Object} parameters - Filters, date ranges, and formats
     */
    async generateReport(provider, parameters) {
        if (!provider || typeof provider.generateReport !== 'function') {
            throw new Error('[ComplianceReportEngine] Invalid provider or missing generateReport method.');
        }
        return await provider.generateReport(parameters, this.connection);
    }
}

module.exports = ComplianceReportEngine;
