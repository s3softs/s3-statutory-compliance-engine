# Developer Manual: S3 Statutory Compliance Engine

Welcome to the Developer Manual for the `s3-statutory-compliance-engine`. This document provides an in-depth guide on how to integrate the engine into a new host application, extend its capabilities via Providers, and adhere to its robust enterprise architecture.

---

## 1. Directory Structure

The library uses a highly scalable **Facade + Provider Pattern**:

```text
s3-statutory-compliance-engine/
├── src/
│   ├── core/                  
│   │   └── Engine.js          # The Facade Orchestrator (No business logic)
│   ├── engines/               # Generic Sub-Engines
│   │   ├── RuleEngine.js      # Thresholds, DSL parsing
│   │   ├── CalculationEngine.js
│   │   ├── ValidationEngine.js
│   │   ├── ReturnEngine.js
│   │   ├── ReconciliationEngine.js
│   │   └── ComplianceReportEngine.js
│   ├── providers/             # Domain Implementations
│   │   ├── gst/
│   │   ├── tds/
│   │   ├── tcs/
│   │   ├── msme/
│   │   └── banking/
│   ├── adapters/              # External API integrations (e.g., GSTN, MCA)
│   ├── schemaFactories/       # Factory functions for Mongoose Schemas
│   └── index.js               # Library entry point
```

---

## 2. The 5 Golden Rules of Development

Before contributing to this repository, you **MUST** understand these rules:
1. **No Business Logic in `Engine.js`**: It is merely a router/facade.
2. **Provider Isolation**: Providers (`gst`, `tds`) MUST NEVER call each other directly. All coordination happens via the Facade.
3. **Configuration-Driven Rules**: Do not use hardcoded `if-else` tax rules in Providers. Rely on the DB-driven Rule DSL.
4. **Stable Public API**: The Facade's API (`Evaluate`, `GenerateEntries`, `Explain`, etc.) must remain stable. Internal provider refactoring must not break host apps.
5. **DB Abstraction Ownership**: `s3-saas-core` owns the DB tenant layer. This engine operates blindly on the Mongoose connection passed to it.

---

## 3. Integration Guide for Host Applications

### Step 3.1: Schema Registration

The engine **does not** compile its own Mongoose models. It provides Schema Factories. This ensures host applications maintain control over their tenant connections.

```javascript
const mongoose = require('mongoose');
const { getComplianceSectionSchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceSection');
const { getComplianceRuleSchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceRule');
const { getComplianceRateHistorySchema } = require('s3-statutory-compliance-engine/src/schemaFactories/ComplianceRateHistory');

module.exports = (connection) => {
    if (!connection.models.ComplianceSection) {
        connection.model('ComplianceSection', getComplianceSectionSchema(mongoose));
    }
    if (!connection.models.ComplianceRule) {
        connection.model('ComplianceRule', getComplianceRuleSchema(mongoose));
    }
    if (!connection.models.ComplianceRateHistory) {
        connection.model('ComplianceRateHistory', getComplianceRateHistorySchema(mongoose));
    }
};
```

### Step 3.2: Engine Initialization & Usage

Initialize the Facade and call it with the appropriate Domain Provider.

```javascript
const ComplianceEngine = require('s3-statutory-compliance-engine');

const engine = new ComplianceEngine({
    connection: req.db, 
    tenantContext: req.tenantContext
});

// Evaluate rules for the TDS domain
const evalResult = await engine.Evaluate('TDS', {
    transactionType: 'INTEREST_PAYMENT',
    partyInfo: { partyType: 'NBFC', hasPAN: true },
    amount: 6000,
    date: new Date()
});

if (evalResult.isApplicable) {
    const entries = engine.GenerateEntries('TDS', evalResult);
    // Output: [{ type: 'TDS_PAYABLE', action: 'CREDIT', amount: 600, section: '194A' }]
    
    // NOTE: HOST application maps 'TDS_PAYABLE' to actual Ledger IDs
}
```

---

## 4. Building a New Provider (e.g., PF / ESI)

To add a new compliance domain without touching core code:

1. Create a new folder `src/providers/pf/`.
2. Create an `index.js` implementing the Sub-Engine interfaces:
   ```javascript
   class PFProvider {
       async evaluateRules(payload, connection) { ... }
       calculate(evaluationResult) { ... }
       async validate(payload, connection) { ... }
       async generateReturn(parameters, connection) { ... }
       async reconcile(books, portal, connection) { ... }
       async generateReport(parameters, connection) { ... }
   }
   module.exports = new PFProvider();
   ```
3. Register it in `src/core/Engine.js`:
   ```javascript
   this.providers = {
       'PF': require('../providers/pf')
   };
   ```

---

## 5. The Explain() API (Auditing)

Transparency is critical. The `Explain()` API provides a clear, human-readable trace.

```javascript
const explanation = await engine.Explain('TDS', evalResult);
console.log(explanation);
```

**Output:**
```text
=== TDS Deduction Explanation ===
1. Trigger: Transaction matched Section 194A (TDS on Interest).
2. Rule Evaluated: 194A - NBFC with PAN
3. Condition Met: DSL Expression [partyType === "NBFC" && hasPAN === true] evaluated to true.
4. Threshold Check: Transaction amount (₹6000) crossed the threshold of ₹5000.
5. Rate Applied: 10% was active on the transaction date.
6. Result: TDS deduced is ₹600.
=================================
```

---

## 6. Adapters (External API Integration)

When a Provider needs to communicate with external APIs (like GSTN, MCA, Income Tax portal), the logic **must** reside in `src/adapters/`. Providers should never hold HTTP call logic directly. This ensures adapters can be mocked easily during testing.
