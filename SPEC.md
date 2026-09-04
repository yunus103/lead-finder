# Yaytech Lead Intelligence
## Product Specification — V1

**Status:** Draft / V1 Scope  
**Product:** Internal lead discovery and sales management tool for Yaytech Studio

---

# 1. Product Overview

Yaytech Lead Intelligence is a private internal web application used by Yaytech Studio to discover potential business clients from multiple online sources, enrich their information, identify businesses with website opportunities, prioritize leads, and manage the sales process.

The application is **not a public SaaS product**.

Its purpose is simple:

> Find businesses that are likely to need a better website, make those businesses easy to evaluate, and make it easy to contact and follow up with them.

The product should prioritize:

- speed
- simplicity
- reliability
- practical usefulness

over feature completeness or technical sophistication.

---

# 2. Problem

Yaytech needs a repeatable way to find potential web-development clients.

Manually searching Google Maps, Google Search, Instagram, checking websites, recording contact information, deciding which businesses are worth contacting, and remembering previous calls is slow and fragmented.

The application centralizes this workflow.

Instead of:

```text
Search Google Maps
        ↓
Open website
        ↓
Check Instagram
        ↓
Write information somewhere
        ↓
Search another business
        ↓
Forget who was contacted
```

the intended workflow is:

```text
Discover
   ↓
Enrich
   ↓
Evaluate
   ↓
Prioritize
   ↓
Contact
   ↓
Follow up
```

---

# 3. Product Objective

The primary objective is:

> **Increase the number of qualified businesses Yaytech can identify and contact every day.**

The application is successful if it makes prospecting significantly faster and more organized.

It is not intended to replace human sales judgment.

The user remains responsible for:

- deciding who to contact
- making calls
- communicating with prospects
- qualifying opportunities
- preparing proposals
- closing deals

The application supports these activities.

---

# 4. Core Workflow

The complete V1 workflow is:

```text
Choose location + sector
        ↓
Select discovery sources
        ↓
Discover businesses
        ↓
Normalize results
        ↓
Deduplicate businesses
        ↓
Save / update businesses
        ↓
Enrich business information
        ↓
Perform lightweight website analysis
        ↓
Calculate lead score
        ↓
Review qualified leads
        ↓
Add to lists / CRM
        ↓
Calling Queue
        ↓
Contact
        ↓
Follow-up
        ↓
Meeting
        ↓
Proposal
        ↓
Won / Lost
```

The system should support discovering approximately **50–100 businesses per day** without unnecessary friction.

---

# 5. V1 Goals

V1 must allow the user to:

1. Discover businesses from Google Maps.
2. Support Google Search as an additional discovery/enrichment source.
3. Support Instagram as an additional discovery/enrichment source.
4. Search using location and sector criteria.
5. Combine multiple discovery sources in a single discovery operation.
6. Store discovered businesses permanently.
7. Avoid duplicate businesses.
8. Track where a business was discovered.
9. Re-run previous searches.
10. Distinguish new businesses from existing businesses.
11. Detect whether a business has a website.
12. Perform lightweight website analysis.
13. Generate a deterministic lead score.
14. Understand why a lead received its score.
15. Manage lead status.
16. Record contact attempts.
17. Record notes and interactions.
18. Schedule follow-ups.
19. Use a prioritized Calling Queue.
20. Create simple lead lists.
21. Exclude businesses from future prospecting.
22. Review previous searches.
23. See useful sales metrics on a dashboard.

---

# 6. V1 Non-Goals

The following are explicitly outside the V1 scope.

## Product / Business

- Public SaaS
- Multi-user support
- Team management
- Roles and permissions
- Billing
- Subscription management
- Customer accounts
- Customer-facing portal

## Automation

- Automated email outreach
- Automated Instagram DM
- Automated calling
- Automated sales sequences
- Automated proposal sending
- Automated follow-up messaging

## AI

- AI lead scoring
- AI qualification
- AI-generated lead summaries
- AI-generated outreach messages
- AI-generated sales strategy
- AI website evaluation

AI may be considered later after real sales data has been collected.

## Advanced Analytics

- Predictive conversion models
- Revenue forecasting
- Advanced sales attribution
- Complex reporting
- Business intelligence infrastructure

## Infrastructure

- Large-scale scraping infrastructure
- Distributed job systems
- Complex event-driven architecture
- Microservices
- Multi-region infrastructure
- Kubernetes or similar orchestration

The application should remain a small internal tool.

---

# 7. Discovery Model

The user should experience discovery as **one unified workflow**.

Example:

```text
Location
[ Istanbul ]

District
[ Kadıköy ]

Sector
[ Dental Clinic ]

Sources

[x] Google Maps
[x] Google Search
[x] Instagram

[ Discover Leads ]
```

The user should not need to manually perform three separate searches.

Internally, each source is an independent provider.

Conceptually:

```text
                    Discovery
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
      Maps           Search        Instagram
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  Normalization
                       ↓
                  Deduplication
                       ↓
                  Enrichment
                       ↓
                    Storage
```

This architecture allows each source to evolve independently.

---

# 8. Discovery Sources

## 8.1 Google Maps

Google Maps / Places is the primary discovery source.

The system should retrieve useful public business information such as:

- business name
- Google Place ID
- address
- city
- district
- coordinates
- phone
- website
- Google Maps URL
- rating
- review count
- category

The exact provider implementation is an engineering concern and should not affect the rest of the product.

Google Place ID should be treated as the primary external identifier for businesses discovered through Maps.

---

## 8.2 Google Search

Search should serve two purposes.

### Discovery

Find businesses that are not returned through Maps discovery.

### Enrichment

Find missing information about an existing business.

Example:

```text
Maps
ABC Dental
Website: missing

Search
"ABC Dental Kadıköy"

→ website found
→ Instagram found
```

Search results must be normalized into the same business model used by other discovery sources.

---

## 8.3 Instagram

Instagram should serve two purposes.

### Discovery

Find businesses matching a sector and location.

### Enrichment

Find the Instagram presence of an existing business.

Potential information includes:

- username
- profile name
- profile URL
- public bio information
- website link
- available public business/contact information
- relevant public activity indicators where technically available

The exact integration method is an implementation concern.

Instagram-specific logic must remain isolated from the core business model.

---

# 9. Business Identity

A business is a **canonical entity** in the application.

Multiple discoveries of the same business must not create multiple canonical records.

Example:

```text
Google Maps
ABC Dental

Google Search
ABC Dental Clinic

Instagram
@abcdental
```

should become:

```text
ABC Dental
```

with multiple source records.

---

# 10. Deduplication

The system should use progressively weaker identifiers to determine whether two results represent the same business.

Preferred order:

1. Google Place ID
2. normalized phone number
3. normalized website domain
4. Instagram username
5. normalized name + address similarity

Deduplication must happen before creating a new canonical business whenever reasonably possible.

The system should favor avoiding obvious duplicates while avoiding aggressive matching that could incorrectly merge different businesses.

---

# 11. Existing and New Businesses

Every discovery operation should distinguish between:

```text
New businesses
Existing businesses
Updated businesses
```

Example:

```text
Search #42

Raw results:        150
Unique businesses:  112
New:                  73
Existing:             39
```

If a new discovery provides additional information about an existing business, the canonical business should be updated.

Example:

```text
Before:
website = null

After:
website = https://example.com
```

However, automated discovery must not unnecessarily overwrite manually managed CRM information.

The following should be treated as application-owned data:

- CRM status
- notes
- contact history
- follow-up dates
- list membership
- exclusion state

---

# 12. Search History

Every discovery operation should be persisted.

A search should retain information such as:

- location
- district
- sector
- selected sources
- creation time
- completion status
- raw result count
- unique result count
- new result count
- existing result count

Example:

```text
Search #42

Istanbul / Kadıköy
Dental Clinic

Sources:
Maps
Search
Instagram

Results:
150 raw
112 unique
73 new
39 existing
```

Previous searches should remain accessible.

---

# 13. Refresh Behavior

Repeating a search must not blindly recreate businesses.

The application distinguishes between:

### Viewing existing results

Review businesses already stored from previous searches.

### Refreshing

Explicitly query the selected discovery sources again.

A refresh should:

1. query selected providers
2. normalize results
3. deduplicate results
4. identify existing businesses
5. create genuinely new businesses
6. update newly discovered information where appropriate
7. preserve CRM data

Website analysis should not unnecessarily run again for unchanged websites.

---

# 14. Website Intelligence

Website intelligence exists to answer:

> **Does this business have a website, and is there an obvious opportunity for Yaytech to improve it?**

The system should distinguish at minimum:

```text
UNKNOWN
NO_WEBSITE
HAS_WEBSITE
UNREACHABLE
```

---

# 15. Lightweight Website Analysis

V1 should perform lightweight website analysis.

The purpose is not to create a full website auditing product.

The system may evaluate signals such as:

- URL availability
- HTTPS
- response time
- page title
- meta description
- H1
- viewport configuration
- favicon
- robots.txt
- sitemap presence
- basic page size
- image information
- responsive/mobile indicators
- social links
- technology detection where reasonably possible

The analysis should be fast enough to process a useful batch of businesses.

A discovery operation must not become unusable because every website requires a heavy browser audit.

---

# 16. Deep Website Audit

Deep website analysis is secondary to lightweight analysis.

If included in V1, it should be manually triggered for an individual lead.

Example:

```text
Lead Detail

Website
example.com

[ Run Deep Audit ]
```

Possible metrics:

- performance
- SEO
- accessibility
- mobile
- best practices
- technology

Deep audits should not block the normal discovery workflow.

If deep auditing significantly delays V1, it should be deferred.

---

# 17. Lead Scoring

V1 uses deterministic, rule-based scoring.

**AI is explicitly excluded.**

The purpose of the score is:

> **Help the user decide which businesses to contact first.**

Potential signals include:

```text
No website                 positive
Poor website               positive
Active Instagram           positive
Large number of reviews    positive
High rating                positive
Phone available            positive
Email available            positive
Large chain                negative
Excellent modern website   negative
```

The scoring model should produce a simple normalized score, preferably:

```text
0–100
```

Example:

```text
94 / 100
HOT
```

The score should be explainable.

Example:

```text
Why this lead?

✓ No website
✓ 184 Google reviews
✓ Active Instagram
✓ 4.8 rating
```

The exact weights are an implementation/configuration decision and should be centralized.

---

# 18. Lead Priority

Suggested operational categories:

```text
80–100    HOT
60–79     WARM
40–59     COLD
0–39      LOW
```

These categories are prioritization tools.

They are not predictions of whether a business will become a customer.

---

# 19. Lead Detail

Every business should have a dedicated lead detail page.

It should provide a complete picture of the prospect.

### Identity

- business name
- category
- location
- address

### Contact

- phone
- email
- website
- Instagram
- Google Maps

### Google

- rating
- review count

### Website

- website status
- URL
- lightweight audit
- technology
- relevant signals

### Lead Intelligence

- lead score
- priority
- reasons for score

### Sales

- CRM status
- contact attempts
- last contact
- next follow-up

### Notes

Manual notes.

### Activity

Chronological history of relevant events.

---

# 20. CRM Status

V1 should use a simple sales pipeline.

Suggested statuses:

```text
NEW
QUALIFIED
TO_CALL
CONTACTED
FOLLOW_UP
INTERESTED
MEETING
PROPOSAL
WON
LOST
```

The user controls status changes.

The application should not make autonomous sales decisions.

---

# 21. Contact Tracking

The system should remember sales activity.

At minimum:

- contact attempts
- last contacted date
- next follow-up date
- interaction history
- notes

Example:

```text
04 Sep
CALL
No answer

05 Sep
CALL
Owner unavailable

08 Sep
CALL
Interested — requested details
```

This prevents the user from repeatedly contacting the same business without context.

---

# 22. Calling Queue

Calling Queue is a core V1 feature.

It should present the businesses that need attention in priority order.

Example:

```text
TODAY'S CALLS

ABC Dental
94 / 100

0532 XXX XX XX

No website
4.8★ / 184 reviews

[ Call ]

[ No Answer ]
[ Contacted ]
[ Interested ]
[ Not Interested ]
[ Follow Up ]
[ Skip ]
```

The queue should make it possible to process leads quickly without repeatedly navigating between pages.

Priority should consider:

1. high lead score
2. leads marked `TO_CALL`
3. follow-ups due
4. untouched leads

---

# 23. Lead Lists

The user should be able to create simple custom lead lists.

Examples:

```text
September Dental Outreach
Istanbul Architecture
Kadıköy Businesses
High Priority
```

A business may belong to multiple lists.

Lists are organizational tools and do not replace CRM status.

---

# 24. Exclude

Businesses that should not be contacted should be suppressible.

Examples:

- existing client
- large chain
- irrelevant business
- unsuitable project
- already handled elsewhere

Excluded businesses remain in the database for historical integrity but should normally be hidden from discovery/calling workflows.

---

# 25. Dashboard

The dashboard should provide actionable sales information.

Possible metrics:

```text
Total Leads
Hot Leads
To Call
Follow-ups Due

New Leads
Calls Made
Meetings
Proposals
Won
```

The dashboard should prioritize information that helps the user decide:

> **What should I do today?**

It should not become an advanced analytics product.

---

# 26. Main Application Areas

The V1 application should contain:

```text
Dashboard
Discover
Leads
Calling Queue
Lists
Search History
Settings
```

Only areas that support the core workflow should exist.

---

# 27. Leads

The main Leads view should allow the user to find and prioritize businesses.

It should support filtering/sorting by useful fields such as:

- name
- sector
- location
- website status
- lead score
- CRM status
- source
- rating
- review count
- list
- excluded state

The user should be able to perform common actions without opening every lead detail page.

---

# 28. Discovery Results

After discovery, results should be shown clearly.

Example:

```text
112 unique businesses found

73 New
39 Existing

Sort:
Lead Score ↓

Filters:
Website
Score
Rating
Reviews
Status
```

The user should be able to:

- open a lead
- add to list
- change status
- exclude
- perform appropriate bulk actions

---

# 29. Bulk Actions

V1 may support simple bulk actions:

- add to list
- change status
- exclude
- run lightweight website analysis
- refresh selected information

Bulk actions should remain intentionally limited.

---

# 30. Data Model — Conceptual

The application requires persistent entities for:

```text
Business
Business Source
Search
Search Result
Website Audit
Interaction
Lead List
Lead List Member
```

The exact database schema and relationships are an implementation concern.

The conceptual rule is:

> A business is the canonical entity. Everything else describes how that business was discovered, enriched, evaluated, organized, or contacted.

---

# 31. Data Ownership

The application database is the persistent source of truth for:

- businesses
- discovery history
- source relationships
- website analysis
- CRM status
- notes
- interactions
- lists

External providers are sources of information.

They are not the application's source of truth.

Automated enrichment must preserve user-controlled sales information.

---

# 32. User Model

V1 is designed for a single user.

There is no requirement for:

- teams
- roles
- permissions
- organizations
- tenant isolation
- collaboration

The architecture should remain clean enough that multi-user functionality could theoretically be added later, but V1 should not implement it.

---

# 33. Product Boundaries

The application ends at sales workflow support.

It should help answer:

```text
Who should I contact?
Why should I contact them?
How can I contact them?
Have I contacted them?
What happened?
When should I follow up?
```

It does not need to answer:

```text
How do I automatically sell to them?
```

Human interaction remains the core sales mechanism.

---

# 34. Success Criteria

V1 is successful when the user can:

1. Choose a location.
2. Choose a sector.
3. Select one or more discovery sources.
4. Discover businesses.
5. See new and existing businesses.
6. Store businesses without duplicates.
7. Re-run searches safely.
8. Detect website presence.
9. Run lightweight website analysis.
10. See lead scores.
11. Understand why a lead scored highly.
12. Open a detailed lead page.
13. Manage CRM status.
14. Record calls.
15. Add notes.
16. Schedule follow-ups.
17. Process a Calling Queue.
18. Organize leads into lists.
19. Exclude irrelevant businesses.
20. Review previous searches.

If these capabilities work reliably, **V1 is complete.**

---

# 35. V1 Philosophy

The product should follow one fundamental principle:

> **A useful internal tool shipped today is more valuable than a perfect system shipped later.**

The application should continuously optimize for:

```text
Discover more relevant businesses
            ↓
Evaluate them faster
            ↓
Contact more of them
            ↓
Follow up consistently
            ↓
Win more clients
```

Technical sophistication is secondary to this outcome.

---

# 36. Future Possibilities

Only after real usage demonstrates a need, future versions may consider:

- AI-assisted lead summaries
- AI-assisted scoring
- scoring based on historical conversion data
- deeper automated website audits
- advanced enrichment
- email templates
- outreach sequences
- automated reminders
- conversion analytics
- browser extension
- additional discovery providers
- advanced search operators
- proposal generation
- sales automation

None of these are required for V1.

---

# 37. Source of Truth and Related Documentation

This document defines **what the product is, why it exists, and what belongs in V1**.

It does not define detailed implementation steps.

Implementation planning belongs in:

```text
/IMPLEMENTATION.md
```

Detailed implementation instructions belong in:

```text
/docs/implementation/
```

Agent operating rules belong in:

```text
/.agents/rules/
```

Persistent architectural decisions belong in:

```text
/docs/architecture/decisions.md
```

The same information should not be unnecessarily duplicated across these documents.

When documents conflict:

1. Product scope is determined by `SPEC.md`.
2. Implementation order is determined by `IMPLEMENTATION.md`.
3. Detailed implementation is determined by the relevant implementation document.
4. Agent behavior is determined by `.agents/rules/`.
5. Historical architectural decisions are recorded in `decisions.md`.

Changes to product scope must update `SPEC.md` before implementation proceeds.