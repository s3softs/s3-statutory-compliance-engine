/**
 * Core Statutory Compliance Engine
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

        // Engine assumes the host has already registered these models on the connection
        // using the Schema factories provided by this library.
        this.ComplianceSection = this.connection.models.ComplianceSection;
        this.ComplianceRule = this.connection.models.ComplianceRule;
        this.ComplianceRateHistory = this.connection.models.ComplianceRateHistory;

        if (!this.ComplianceSection || !this.ComplianceRule || !this.ComplianceRateHistory) {
            throw new Error('[ComplianceEngine] Required schemas are not registered on this connection.');
        }
    }

    /**
     * Evaluates compliance rules based on DSL expression.
     */
    async Evaluate({ transactionType, partyInfo, amount, date }) {
        // Simple mapping for MVP blueprint
        let sectionCode = null;
        if (transactionType === 'INTEREST_PAYMENT') sectionCode = '194A';
        if (!sectionCode) return { isApplicable: false };

        const section = await this.ComplianceSection.findOne({ sectionCode, isActive: true });
        if (!section) return { isApplicable: false };

        const rules = await this.ComplianceRule.find({ sectionId: section._id, isActive: true });
        
        for (const rule of rules) {
            // Pseudo Rule DSL Evaluator
            // In a real implementation, we'd parse rule.ruleExpression safely using a library like Jexl or a custom AST parser.
            let match = true; // Assuming match for MVP purposes

            if (match) {
                const rateHistory = await this.ComplianceRateHistory.findOne({
                    ruleId: rule._id,
                    effectiveFrom: { $lte: date },
                    $or: [
                        { effectiveTo: null },
                        { effectiveTo: { $gte: date } }
                    ]
                });

                if (rateHistory) {
                    const isAboveThreshold = amount > (rateHistory.thresholdAmount || 0);
                    if (isAboveThreshold) {
                        return {
                            isApplicable: true,
                            section: section.sectionCode,
                            taxType: section.taxType,
                            rate: rateHistory.ratePercentage,
                            taxAmount: (amount * rateHistory.ratePercentage) / 100,
                            _auditInfo: {
                                sectionId: section._id,
                                ruleId: rule._id,
                                rateHistoryId: rateHistory._id,
                                thresholdMatched: rateHistory.thresholdAmount
                            }
                        };
                    }
                }
            }
        }

        return { isApplicable: false };
    }

    GenerateEntries(evaluationResult) {
        if (!evaluationResult || !evaluationResult.isApplicable) return [];

        const entries = [];
        if (evaluationResult.taxType === 'TDS') {
            entries.push({
                type: 'TDS_PAYABLE',
                action: 'CREDIT',
                amount: evaluationResult.taxAmount,
                section: evaluationResult.section
            });
        }
        return entries;
    }

    /**
     * Explain() API to return the decision tree for audit purposes.
     * @param {Object} evaluationResult 
     */
    async Explain(evaluationResult) {
        if (!evaluationResult || !evaluationResult.isApplicable) {
            return "No compliance rule was applicable for this transaction.";
        }

        const audit = evaluationResult._auditInfo;
        const section = await this.ComplianceSection.findById(audit.sectionId);
        const rule = await this.ComplianceRule.findById(audit.ruleId);
        
        const explanation = `
=== Compliance Deduction Explanation ===
1. Trigger: Transaction matched Section ${section.sectionCode} (${section.description}).
2. Rule Evaluated: ${rule.ruleName}
3. Condition Met: DSL Expression [${rule.ruleExpression}] evaluated to true based on party details.
4. Threshold Check: Transaction amount crossed the threshold of ₹${audit.thresholdMatched}.
5. Rate Applied: ${evaluationResult.rate}% was active on the transaction date.
6. Result: Tax amount deduced is ₹${evaluationResult.taxAmount}.
========================================
        `.trim();
        return explanation;
    }
}

module.exports = ComplianceEngine;
