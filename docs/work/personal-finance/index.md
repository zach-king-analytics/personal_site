---
title: Personal Finance — Portfolio Project
summary: Privacy-first financial analytics: clean ingest, staging, and insights.
tags: [finance, data-modeling, privacy]
---

!!! warning "Under Construction"
    This section is coming soon. Check back soon for updates!

# Personal Finance

A privacy-first, end-to-end pipeline for personal finance data.

- Sources: bank CSVs, credit cards, brokerage
- Ingest → staging → curated models → dashboards
- Emphasis on reproducible transformations and PII safety

## Goals (MVP)
- Fast, idempotent imports from raw CSVs
- Clear account + category model
- Month-over-month insights & burn rate

## Current Status
- Ingest/staging scripts live in `Personal Finance/`
- Placeholder site content — this section is password-protected in production.

---

### Architecture (overview)
- Raw → staging → curated → dashboards
- Auditable transforms, schema drift detection
- Local dev with test fixtures

---

### Next
- Fill in ERD, sample queries, and screenshots
- Document CSV contract and edge cases
