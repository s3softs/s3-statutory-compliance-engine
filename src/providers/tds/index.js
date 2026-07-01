/**
 * TDS Compliance Provider
 * Implements the required interfaces for RuleEngine, CalculationEngine, ValidationEngine, etc.
 */
class TDSProvider {
    /**
     * @param {Object} payload - { transactionType, partyInfo, amount, date }
     * @param {Object} connection - Mongoose connection
     */
    async evaluateRules(payload, connection) {
        const { transactionType, partyInfo, amount, date } = payload;
        
        let sectionCode = null;
        if (transactionType === 'INTEREST_PAYMENT') sectionCode = '194A';
        // Extend logic for 194Q, 194C, etc. based on transactionType or partyInfo
        if (!sectionCode) return { isApplicable: false };

        const ComplianceSection = connection.models.ComplianceSection;
        const ComplianceRule = connection.models.ComplianceRule;
        const ComplianceRateHistory = connection.models.ComplianceRateHistory;

        const section = await ComplianceSection.findOne({ sectionCode, isActive: true });
        if (!section) return { isApplicable: false };

        const rules = await ComplianceRule.find({ sectionId: section._id, isActive: true });
        
        for (const rule of rules) {
            // Pseudo Rule DSL Evaluator
            let match = true; // For MVP

            if (match) {
                const rateHistory = await ComplianceRateHistory.findOne({
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
                            amount: amount,
                            _auditInfo: {
                                sectionId: section._id,
                                ruleId: rule._id,
                                rateHistoryId: rateHistory._id,
                                thresholdMatched: rateHistory.thresholdAmount,
                                ruleName: rule.ruleName,
                                sectionDesc: section.description,
                                ruleExpression: rule.ruleExpression
                            }
                        };
                    }
                }
            }
        }
        return { isApplicable: false };
    }

    /**
     * @param {Object} evaluationResult 
     */
    calculate(evaluationResult) {
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
     * Explanation generation for TDS deductions (Audit Trail)
     * @param {Object} evaluationResult 
     */
    explain(evaluationResult) {
        if (!evaluationResult || !evaluationResult.isApplicable) {
            return "No compliance rule was applicable for this transaction.";
        }

        const audit = evaluationResult._auditInfo;
        const explanation = `
=== TDS Deduction Explanation ===
1. Trigger: Transaction matched Section ${evaluationResult.section} (${audit.sectionDesc}).
2. Rule Evaluated: ${audit.ruleName}
3. Condition Met: DSL Expression [${audit.ruleExpression}] evaluated to true.
4. Threshold Check: Transaction amount (₹${evaluationResult.amount}) crossed the threshold of ₹${audit.thresholdMatched}.
5. Rate Applied: ${evaluationResult.rate}% was active on the transaction date.
6. Result: TDS deduced is ₹${evaluationResult.taxAmount}.
=================================
        `.trim();
        return explanation;
    }

    // Placeholder methods for future engines
    async validate(payload, connection) { return { isValid: true }; }
    async generateReturn(parameters, connection) { return { status: 'NOT_IMPLEMENTED' }; }
    async reconcile(booksData, portalData, connection) { return { status: 'NOT_IMPLEMENTED' }; }
    async generateReport(parameters, connection) { return { status: 'NOT_IMPLEMENTED' }; }
}

module.exports = new TDSProvider();
