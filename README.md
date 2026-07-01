# S3 Statutory Compliance Engine

An enterprise-grade, platform-based Node.js library for managing comprehensive Indian Statutory Compliances (GST, Income Tax, TDS, TCS, MSME, Banking, etc.) across the entire S3 ecosystem.

## 🌟 Overview
This library provides a highly modular, decoupled, and configuration-driven compliance engine. Designed with a **Facade + Provider Pattern**, it serves as a central statutory authority independent of any specific business module (Sales, Purchase, Payroll, Loans). It can be plugged into any host product (e.g., SUPER-POS, Medical POS, Agro ERP).

## 🏗️ Architecture

The library is strictly architected on a **Facade + Provider + Sub-Engine** pattern to ensure 10-15 years of scalability.

1. **Facade (`Engine.js`)**: The single entry point. Contains NO business logic. It orchestrates communication between the host application and the underlying providers.
2. **Sub-Engines**: Generic, logic-agnostic engines that process compliance workflows:
   - `RuleEngine`: Thresholds, dates, limits.
   - `CalculationEngine`: Financial math and deductions.
   - `ValidationEngine`: PAN/GSTIN structure, E-Way Bill distance limits.
   - `ReturnEngine`: Government structured outputs (JSON/FVU).
   - `ReconciliationEngine`: GSTR-2B vs Books mapping.
   - `ComplianceReportEngine`: CA and Management Registers.
3. **Providers (`providers/gst`, `tds`, `msme`, etc.)**: Domain-specific implementations that supply rules to the Sub-Engines.
4. **Adapters (`adapters/`)**: Modules for external communication (GSTN APIs, Income Tax Portals).

## 🛡️ Core Principles (The 5 Golden Rules)
- **No Business Logic in Facade**: `Engine.js` acts only as a router.
- **Provider Isolation**: Providers (e.g., GST, TDS) never call each other directly. Coordination happens through the Facade.
- **Configuration-Driven Rules**: No hardcoded `if-else` tax rules. Rules are dynamically parsed.
- **Stable Public API**: Internal refactoring must never break the host application's integration.
- **Tenant-Agnostic**: `s3-saas-core` owns the DB abstraction (Shared, Dedicated, BYOD). The engine operates blindly on the injected Mongoose connection.

## 📦 Installation

```json
"dependencies": {
  "s3-statutory-compliance-engine": "github:s3softs/s3-statutory-compliance-engine"
}
```

## 🚀 Basic Usage

```javascript
const ComplianceEngine = require('s3-statutory-compliance-engine');

// 1. Initialize the Facade
const engine = new ComplianceEngine({
    connection: req.db, // Mongoose connection
    tenantContext: req.tenantContext
});

// 2. Evaluate using a specific Domain Provider
const evalResult = await engine.Evaluate('TDS', {
    transactionType: 'INTEREST_PAYMENT',
    partyInfo: { partyType: 'NBFC', hasPAN: true },
    amount: 6000,
    date: new Date()
});

if (evalResult.isApplicable) {
    // 3. Generate generic ledger entry instructions
    const entries = engine.GenerateEntries('TDS', evalResult);
    console.log(entries);
}
```

For detailed integration guides, schema documentation, and provider implementation steps, please read the `developer-manual.md`.
