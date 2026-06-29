/**
 * Returns the ComplianceRule Mongoose Schema.
 * Uses a Rule DSL expression string instead of JSON logic.
 */
function getComplianceRuleSchema(mongoose) {
    const { Schema } = mongoose;
    return new Schema({
        sectionId: { type: Schema.Types.ObjectId, ref: 'ComplianceSection', required: true },
        ruleName: { type: String, required: true },
        
        // Rule DSL Expression (e.g., "PartyType == 'NBFC' && Amount > 5000 && hasPAN == true")
        // The engine's evaluators will parse this DSL.
        ruleExpression: { type: String, required: true },
        
        isActive: { type: Boolean, default: true }
    }, {
        timestamps: true
    });
}

module.exports = { getComplianceRuleSchema };
