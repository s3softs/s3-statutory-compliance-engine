# S3 Statutory Compliance Engine

An enterprise-grade, business-agnostic Node.js engine for managing Indian Statutory Compliances (TDS, TCS, GST, etc.) across the S3 ecosystem.

## Overview
This library provides a centralized, configuration-driven rule engine to evaluate and calculate taxes dynamically. It is designed to be completely independent of any specific business module (like Sales, Purchase, Payroll, or Loans), meaning it can be plugged into any product in the S3 ecosystem (e.g., SUPER-POS, Medical POS, Future Agro ERP) without duplicating compliance logic.

## Key Features
- **Stateless Architecture:** The engine does not save transactions. It evaluates rules and returns results; the host application owns the audit trails.
- **Accounting-Independent:** The engine has no knowledge of Ledger IDs. It returns generic ledger instructions (e.g., `TDS_PAYABLE`), which the host application maps to actual ledgers.
- **Tenant-Agnostic:** Designed to seamlessly support Shared, Dedicated, and BYOD database strategies by accepting a standard `tenantContext` and the host's Mongoose connection.
- **Configuration-Driven:** Tax laws (like Section 194A) are stored as dynamic, date-versioned rules (Rule DSL). No source code changes are required when government rates change.
- **Explainable AI:** Includes a powerful `Explain()` API that generates a human-readable decision tree outlining exactly why a tax was deducted.

## Installation

Add this library to your host application's `package.json` using the GitHub URL:

```json
"dependencies": {
  "s3-statutory-compliance-engine": "github:s3softs/s3-statutory-compliance-engine"
}
```

## Basic Usage

```javascript
const ComplianceEngine = require('s3-statutory-compliance-engine');

// 1. Initialize the engine with your Mongoose connection and Tenant Context
const engine = new ComplianceEngine({
    connection: mongooseConnection,
    tenantContext: req.tenantContext,
    logger: globalLogger
});

// 2. Evaluate a transaction
const evalResult = await engine.Evaluate({
    transactionType: 'INTEREST_PAYMENT',
    partyInfo: { partyType: 'NBFC', hasPAN: true },
    amount: 6000,
    date: new Date()
});

if (evalResult.isApplicable) {
    console.log(`Tax Amount: ${evalResult.taxAmount}`);
    
    // 3. Generate generic ledger entry instructions
    const entries = engine.GenerateEntries(evalResult);
    console.log(entries); // E.g. [{ type: 'TDS_PAYABLE', action: 'CREDIT', amount: 600 }]
    
    // 4. (Optional) Get an explanation for auditing
    const explanation = await engine.Explain(evalResult);
    console.log(explanation);
}
```

## Architecture Principles
1. **Schema Factories over Models:** The library exports Schema Factories (`getComplianceSectionSchema`, etc.) rather than compiled Mongoose models. The host application must register these on its own connection.
2. **Rule DSL:** Complex compliance conditions are handled via a custom Rule DSL string rather than nested JSON, ensuring 10-15 years of scalability as tax laws evolve.

Please see `developer-manual.md` for in-depth integration instructions, schema overrides, and contribution guidelines.
