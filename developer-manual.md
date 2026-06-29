# Developer Manual: S3 Statutory Compliance Engine

Welcome to the Developer Manual for the `s3-statutory-compliance-engine`. This document provides an in-depth guide on how to integrate the engine into a new host application, extend its capabilities, and understand the internal architecture.

---

## 1. Directory Structure

```text
s3-statutory-compliance-engine/
├── src/
│   ├── core/                  # Contains the main Engine.js class
│   ├── schemaFactories/       # Contains factory functions for Mongoose Schemas
│   ├── evaluators/            # (Future) Rule DSL Parsers
│   ├── calculators/           # (Future) Complex tax mathematical calculators
│   ├── explainers/            # Logic for the Explain() auditing API
│   └── index.js               # Library entry point
├── package.json
├── README.md
└── developer-manual.md
```

---

## 2. Integration Guide

To use this engine in any S3 product (e.g., SUPER-POS, Medical POS), you must complete two steps: Schema Registration and Engine Initialization.

### Step 2.1: Schema Registration

The engine **does not** compile its own Mongoose models. It provides Schema Factories. This ensures that the host application maintains absolute control over its database connection, which is vital for `s3-saas-core`'s Shared, Dedicated, and BYOD strategies.

In your host application's models folder (e.g., `StatutoryComplianceModels.js`), register the schemas like this:

```javascript
const mongoose = require('mongoose');
const { getComplianceSectionSchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceSection');
const { getComplianceRuleSchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceRule');
const { getComplianceRateHistorySchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceRateHistory');

module.exports = (connection) => {
    if (!connection.models.ComplianceSection) {
        // 1. Get the raw Schema
        const sectionSchema = getComplianceSectionSchema(mongoose);
        
        // 2. (Optional) Extend the schema with host-specific fields
        // sectionSchema.add({ isMedicalSpecific: { type: Boolean, default: false } });
        
        // 3. Register the model on the host connection
        connection.model('ComplianceSection', sectionSchema);
    }

    if (!connection.models.ComplianceRule) {
        connection.model('ComplianceRule', getComplianceRuleSchema(mongoose));
    }

    if (!connection.models.ComplianceRateHistory) {
        connection.model('ComplianceRateHistory', getComplianceRateHistorySchema(mongoose));
    }
};
```

### Step 2.2: Engine Initialization & Usage

When you need to evaluate compliance (e.g., during a Loan EMI Payment or a Purchase Invoice Save), initialize the engine and call its methods.

```javascript
const ComplianceEngine = require('s3-statutory-compliance-engine');

// Initialize inside your controller
const engine = new ComplianceEngine({
    connection: req.db, // The current tenant's Mongoose connection
    tenantContext: req.tenantContext, // Tenant details from s3-saas-core
    logger: console
});

// Evaluate
const evalResult = await engine.Evaluate({
    transactionType: 'INTEREST_PAYMENT',
    partyInfo: { partyType: 'NBFC', hasPAN: true },
    amount: 6000,
    date: new Date()
});

if (evalResult.isApplicable) {
    // Generate generic ledger entries
    const entries = engine.GenerateEntries(evalResult);
    
    // Output: [{ type: 'TDS_PAYABLE', action: 'CREDIT', amount: 600, section: '194A' }]
    
    // NOTE: It is the HOST application's responsibility to map 'TDS_PAYABLE' 
    // to an actual Ledger ID (e.g., via a StatutoryLedgerMapping table) and 
    // post the final Journal Voucher.
}
```

---

## 3. The Rule DSL (Domain Specific Language)

To avoid deeply nested and unmaintainable JSON conditions, `ComplianceRule.ruleExpression` uses a string-based DSL.

**Example DSL string stored in the database:**
`partyType === "NBFC" && hasPAN === true && isResident === true`

The engine parses this string dynamically against the `partyInfo` payload passed to `.Evaluate()`.

---

## 4. The Explain() API (Auditing)

Transparency is critical in ERP systems. If an auditor asks why TDS was deducted, the `Explain()` API provides a clear, human-readable trace.

```javascript
const explanation = await engine.Explain(evalResult);
console.log(explanation);
```

**Sample Output:**
```text
=== Compliance Deduction Explanation ===
1. Trigger: Transaction matched Section 194A (TDS on Interest).
2. Rule Evaluated: 194A - NBFC with PAN
3. Condition Met: DSL Expression [partyType === "NBFC" && hasPAN === true] evaluated to true based on party details.
4. Threshold Check: Transaction amount crossed the threshold of ₹5000.
5. Rate Applied: 10% was active on the transaction date.
6. Result: Tax amount deduced is ₹600.
========================================
```

---

## 5. Adding Support for New Taxes (e.g., GST / TCS)

Because the engine is generic, adding support for a new compliance type (like E-Way Bill rules or Professional Tax) does NOT require changing the engine's core code.

1. Add a new `ComplianceSection` record (e.g., `sectionCode: 'GST_INPUT'`).
2. Add a `ComplianceRule` with the specific conditions.
3. Add a `ComplianceRateHistory` for the applicable rate.
4. The host application will now automatically evaluate this rule when a relevant transaction is processed.

---

## 6. Development Best Practices

1. **Never Hardcode Ledger IDs:** The engine must remain accounting-agnostic. Always return generic constants like `TDS_PAYABLE` or `TCS_RECEIVABLE`.
2. **Never Save Transactions:** The engine must remain stateless. Do not create tables like `ComplianceTransaction` inside the engine. Audit logging is strictly the responsibility of the host application.
3. **Pass Mongoose Instances:** Because the library might run in environments with different Mongoose versions, always pass the host's `mongoose` instance into the Schema Factories.
