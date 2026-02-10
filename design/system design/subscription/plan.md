## Core Features

User & Role Management

Authentication & Security (2FA, permissions, sessions, audit logs)

Organization / Company Profile

Dashboard & Analytics (basic)

Billing System (Subscription + Token Viewer)

Basic Customer Directory (read-only)

Basic Product Directory (read-only)


✅ 2. FEATURE-BASED SUBSCRIPTION (Client Chooses Features They Need)

These should be optional. Many SaaS platforms (Xero, Zoho, Odoo) monetize using similar modular add-ons.

A. Sales & Inventory Features

Full Inventory Management

stock-in / stock-out

warehouses

stock transfers

low stock alerts

Sales Management

sales orders

quotations

invoices

delivery notes

Purchases Management

purchase orders

bills

vendor payments

POS (Point of Sale) Module

POS interface

barcode scanning

counter sales analytics

B. Customer & CRM Features

Advanced Customer Management

customer groups

notes, attachments

custom fields

Leads & Pipelines (CRM)

pipelines

stages

follow-ups

Marketing Automation

SMS campaigns

email campaigns

automation workflow builder

C. Financial / Accounting Features

Full Accounting Module

chart of accounts

journals

ledgers

trial balance

P&L

balance sheet

Expense Management

Banking Integration (Manual or API-Based)

D. Operations Features

Employee & HRM Lite

attendance

leave

payroll basic

Project/Task Management

Document Management Module

Notifications & Activity Logs (Advanced)

E. Integrations

Stripe/PayPal Integration

SSLCOMMERZ Integration

WhatsApp Integration

Email Provider Integration (SMTP/SendGrid)

✅ 3. TOKEN-BASED USAGE FEATURES (Pay-as-you-go)

These are features that cost money every time they are used.
Perfect for token-based billing.

A. Messaging & Communication

SMS sending

WhatsApp message sending

Email marketing (per 1 email = X tokens)

B. Automation

Workflow automation execution

each automation run consumes tokens

Scheduled tasks / Cron runs

charge per run if heavy

C. AI Powered

AI Document Scanning (OCR)

AI Data Entry Suggestions

AI Chat/Assistant inside app

D. Reporting

Advanced Report Generation (PDF)

per report

per dataset size

Export Large Data (CSV/Excel)

cost per export

E. System Extensibility

API Usage (per 1000 API calls)

Webhook deliveries

File Uploads (extra storage beyond plan)

enum Feature {
  INVENTORY
  SALES
  PURCHASES
  POS
  CRM
  ADVANCED_CUSTOMER
  LEADS_PIPELINE
  MARKETING_AUTOMATION
  ACCOUNTING
  EXPENSES
  HRM
  PROJECTS
  DOCUMENTS
  ADVANCED_NOTIFICATIONS
  BANKING_SYNC

  // Integration Modules
  WHATSAPP_INTEGRATION
  EMAIL_INTEGRATION
  PAYMENT_GATEWAY_INTEGRATION

  // Token-based Features
  SMS
  WHATSAPP_MESSAGE
  EMAIL_MARKETING
  WORKFLOW_EXECUTION
  AI_OCR
  DATA_EXPORT
  API_USAGE
  FILE_STORAGE
}
