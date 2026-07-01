const RuleEngine = require('../engines/RuleEngine');
const CalculationEngine = require('../engines/CalculationEngine');
const ValidationEngine = require('../engines/ValidationEngine');
const ReturnEngine = require('../engines/ReturnEngine');
const ReconciliationEngine = require('../engines/ReconciliationEngine');
const ComplianceReportEngine = require('../engines/ComplianceReportEngine');

const tdsProvider = require('../providers/tds');

/**
 * ComplianceEngine Facade
 * Acts as the single entry point for host applications.
 * Routes requests to specific sub-engines and providers based on the domain.
 */
class ComplianceEngine {
    /**
     * @param {Object} options 
     * @param {Object} options.connection - Mongoose connection from host application
     * @param {Object} options.tenantContext - Tenant context (if any)
     * @param {Object} options.logger - Optional logger
     */
    constructor({ connection, tenantContext, logger }) {
        if (!connection) throw new Error('[ComplianceEngine] Mongoose connection is required.');
        this.connection = connection;
        this.tenantContext = tenantContext || {};
        this.logger = logger || console;

        // Ensure required schemas are registered by host
        if (!this.connection.models.ComplianceSection || 
            !this.connection.models.ComplianceRule || 
            !this.connection.models.ComplianceRateHistory) {
            throw new Error('[ComplianceEngine] Required schemas are not registered on this connection.');
        }

        // Initialize Sub-Engines
        this.ruleEngine = new RuleEngine({ connection: this.connection, logger: this.logger });
        this.calculationEngine = new CalculationEngine({ connection: this.connection, logger: this.logger });
        this.validationEngine = new ValidationEngine({ connection: this.connection, logger: this.logger });
        this.returnEngine = new ReturnEngine({ connection: this.connection, logger: this.logger });
        this.reconciliationEngine = new ReconciliationEngine({ connection: this.connection, logger: this.logger });
        this.complianceReportEngine = new ComplianceReportEngine({ connection: this.connection, logger: this.logger });

        // Register Providers
        this.providers = {
            'TDS': tdsProvider,
            'GST': require('../providers/gst'),
            'MSME': require('../providers/msme'),
            'TCS': require('../providers/tcs'),
            'BANKING': require('../providers/banking')
        };
    }

    _getProvider(domain) {
        const provider = this.providers[domain];
        if (!provider) throw new Error(`[ComplianceEngine] Provider for domain '${domain}' not found.`);
        return provider;
    }

    /**
     * Evaluates compliance rules dynamically using the RuleEngine and Provider.
     * @param {String} domain - e.g., 'TDS', 'GST'
     * @param {Object} payload - Data payload to evaluate
     */
    async Evaluate(domain = 'TDS', payload) {
        // Backwards compatibility for single-argument (payload) signature in existing SUPER-POS
        if (typeof domain === 'object') {
            payload = domain;
            domain = 'TDS';
        }
        
        const provider = this._getProvider(domain);
        return await this.ruleEngine.evaluate(provider, payload);
    }

    /**
     * Calculates tax entries based on evaluation results.
     * @param {String} domain - e.g., 'TDS', 'GST'
     * @param {Object} evaluationResult 
     */
    GenerateEntries(domain = 'TDS', evaluationResult) {
        if (typeof domain === 'object') {
            evaluationResult = domain;
            domain = 'TDS';
        }

        const provider = this._getProvider(domain);
        return this.calculationEngine.calculate(provider, evaluationResult);
    }

    /**
     * Explain() API to return the decision tree for audit purposes.
     * @param {String} domain 
     * @param {Object} evaluationResult 
     */
    async Explain(domain = 'TDS', evaluationResult) {
        if (typeof domain === 'object') {
            evaluationResult = domain;
            domain = 'TDS';
        }

        const provider = this._getProvider(domain);
        if (typeof provider.explain === 'function') {
            return provider.explain(evaluationResult);
        }
        return "Explanation not implemented for this domain.";
    }

    /**
     * Validate structural and legal payloads.
     */
    async Validate(domain, payload) {
        const provider = this._getProvider(domain);
        return await this.validationEngine.validate(provider, payload);
    }

    /**
     * Generate structured statutory returns.
     */
    async GenerateReturn(domain, parameters) {
        const provider = this._getProvider(domain);
        return await this.returnEngine.generateReturn(provider, parameters);
    }

    /**
     * Reconcile portal data vs books.
     */
    async Reconcile(domain, booksData, portalData) {
        const provider = this._getProvider(domain);
        return await this.reconciliationEngine.reconcile(provider, booksData, portalData);
    }

    /**
     * Generate CA registers and PDFs.
     */
    async GenerateReport(domain, parameters) {
        const provider = this._getProvider(domain);
        return await this.complianceReportEngine.generateReport(provider, parameters);
    }
}

module.exports = ComplianceEngine;
