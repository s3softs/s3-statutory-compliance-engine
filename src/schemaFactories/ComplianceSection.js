/**
 * Returns the ComplianceSection Mongoose Schema.
 * The host application is responsible for registering this schema (e.g. connection.model(...)).
 * This allows the host to extend the schema with custom fields if needed.
 */
function getComplianceSectionSchema(mongoose) {
    const { Schema } = mongoose;
    return new Schema({
        sectionCode: { type: String, required: true, unique: true }, // e.g., '194A'
        taxType: { type: String, required: true, enum: ['TDS', 'TCS', 'GST', 'OTHER'] },
        description: { type: String, required: true },
        isActive: { type: Boolean, default: true }
    }, {
        timestamps: true
    });
}

module.exports = { getComplianceSectionSchema };
