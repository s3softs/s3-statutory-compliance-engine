/**
 * Returns the ComplianceRateHistory Mongoose Schema.
 */
function getComplianceRateHistorySchema(mongoose) {
    const { Schema } = mongoose;
    const schema = new Schema({
        ruleId: { type: Schema.Types.ObjectId, ref: 'ComplianceRule', required: true },
        ratePercentage: { type: Number, required: true },
        thresholdAmount: { type: Number, default: 0 },
        effectiveFrom: { type: Date, required: true },
        effectiveTo: { type: Date, default: null }
    }, {
        timestamps: true
    });

    schema.index({ ruleId: 1, effectiveFrom: 1, effectiveTo: 1 });
    return schema;
}

module.exports = { getComplianceRateHistorySchema };
