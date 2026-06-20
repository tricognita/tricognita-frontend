# System Overview

> The 15-minute version: what Tricognita is, how the pieces fit, and why the architecture looks like it does.

## What you're looking at

Tricognita is a multi-tenant cloud security posture management (CSPM) platform with AI-assisted remediation. This repository is the **public frontend** — a Next.js dashboard and BFF (backend-for-frontend) that fronts a separate Go API.

## High-level architecture

```mermaid
flowchart TB
    User[Security Operator<br/>Browser]

    subgraph Edge["Edge Layer (Vercel)"]
        MW[middleware.ts<br/>Session verify · RBAC · CSRF · CSP]
    end

    subgraph BFF["BFF Layer (Vercel · Node runtime)"]
        Routes[app/api/**/route.ts<br/>Per-handler auth + tenant scope<br/>JIT token minting]
    end

    subgraph Frontend["Frontend (Vercel · React 19)"]
        Pages[Dashboard pages<br/>+ guarded by PageRestrictedGuard]
        UI[lib/ui/ primitives<br/>+ SWR client cache]
    end

    subgraph External["External Services"]
        GoAPI[Go API<br/>Separate private repo]
        Redis[(Upstash Redis<br/>Sessions · Queue · Telemetry · Feedback)]
        Postgres[(Neon Postgres<br/>Users · Audit · Findings)]
        AWS[AWS Bedrock + SageMaker<br/>ARIA remediation]
        Cloud[Customer AWS / Azure / GCP<br/>Read-only via STS]
    end

    User -->|HTTPS + signed cookie| MW
    MW -->|verified session| Routes
    MW -->|verified session| Pages
    Routes -->|JIT Bearer + tenant scope| GoAPI
    Routes -->|REST + token| Redis
    Routes -.->|via Go API| Postgres
    Pages -->|SWR fetch| Routes
    Pages -->|render| UI
    GoAPI -->|STS AssumeRole| Cloud
    GoAPI -->|invoke| AWS
    GoAPI -->|read/write| Postgres

    classDef edge fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef bff fill:#065f46,stroke:#10b981,color:#fff
    classDef ext fill:#1f2937,stroke:#6b7280,color:#d1d5db

    class MW edge
    class Routes,Pages,UI bff
    class GoAPI,Redis,Postgres,AWS,Cloud ext
```

### Reading the diagram

- **Edge layer** runs on every request. Session verification + role check happen here, before any application code.
- **BFF layer** is where tenant-scoped business logic lives. Routes mint short-lived JIT tokens to call the Go API.
- **Frontend** is React components rendered server-side then hydrated. SWR handles the client cache.
- **External services** are deliberate boundaries — the Go API, the customer's cloud, the AWS AI services. The frontend repo never reaches across them directly.

## Runtime topology

```mermaid
flowchart LR
    subgraph Region1["Primary region (Asia-Pacific)"]
        direction TB
        VercelEdge[Vercel Edge Network<br/>Global CDN + Edge Middleware]
        VercelBFF[Vercel Functions<br/>Node.js BFF routes]
        Fly[Fly.io<br/>Go API · Single machine]
        Neon[(Neon Postgres<br/>Regional)]
        Upstash[(Upstash Redis<br/>Regional REST)]
    end

    subgraph Vendor["Vendor services"]
        AWSBedrock[AWS Bedrock]
        AWSSageMaker[AWS SageMaker]
        AWSSES[AWS SES]
        AWSS3[AWS S3]
    end

    VercelEdge --> VercelBFF
    VercelBFF --> Fly
    VercelBFF --> Upstash
    Fly --> Neon
    Fly --> AWSBedrock
    Fly --> AWSSageMaker
    Fly --> AWSSES
    Fly --> AWSS3

    classDef primary fill:#0f766e,stroke:#14b8a6,color:#fff
    classDef vendor fill:#374151,stroke:#9ca3af,color:#d1d5db

    class VercelEdge,VercelBFF,Fly,Neon,Upstash primary
    class AWSBedrock,AWSSageMaker,AWSSES,AWSS3 vendor
```

## Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | File-system routing matches the security model; edge middleware enables auth at the edge |
| UI library | React 19 + React Compiler | Compiler purity catches render bugs at lint time |
| Type safety | TypeScript strict | No `any`, contract drift caught at build |
| Styling | Tailwind v4 + CSS-variable tokens | Theme as data; dark mode + brand customization without code branches |
| Client cache | SWR | Per-key cache + focus/reconnect revalidation matches operator dashboard patterns |
| Server runtime | Node.js (Vercel Functions) | Stable, broad library support, fast enough for BFF needs |
| Edge runtime | Vercel Edge | Sub-millisecond session verification |
| Session signing | HMAC-SHA256 | Stateless verification; revocation handled in Redis |
| Webhook signing | HMAC-SHA256 (Stripe-style) | Industry-standard customer verification flow |
| Cache + queue | Upstash Redis REST | Edge-compatible; no connection pooling complexity |
| Primary database | Neon Postgres | Serverless with branching; regional |
| AI inference | AWS Bedrock + SageMaker | Managed; no model hosting on our side |
| Customer cloud access | AWS STS AssumeRole | Read-only; no long-lived credentials cross the boundary |

## Three load-bearing patterns

These three are how every other design choice flows. If you understand only three things about the architecture, understand these.

### 1. Tenant isolation at four layers

```mermaid
flowchart LR
    Cookie[Session cookie<br/>tenant_id signed claim]
    BFF[BFF route<br/>session.tenantId only]
    Go[Go API<br/>JIT token tenant claim]
    DB[Postgres<br/>WHERE tenant_id = $1]

    Cookie --> BFF --> Go --> DB

    classDef layer fill:#1e3a8a,stroke:#3b82f6,color:#fff
    class Cookie,BFF,Go,DB layer
```

A bug in any **one** layer is contained by the other three. A cross-tenant leak would require simultaneous failures in all four.

### 2. Three-layer RBAC

```mermaid
flowchart LR
    M[Edge middleware<br/>Path-prefix to roles]
    R[BFF handler<br/>Per-request role check]
    G[Page guard<br/>Capability + entitlement]

    M --> R --> G

    classDef layer fill:#065f46,stroke:#10b981,color:#fff
    class M,R,G layer
```

`ROLE_ROUTES` in `lib/auth.ts` is the single declarative source for dashboard route permissions.

### 3. Plans-as-data, capabilities-as-data

```mermaid
flowchart LR
    Plans[lib/plans.ts<br/>Plan catalog as const]
    RBAC[lib/rbac.ts<br/>Capability matrix per role]
    UI[Dashboard UI<br/>Reads catalog · renders comparison]

    Plans --> UI
    RBAC --> UI

    classDef data fill:#7c2d12,stroke:#ea580c,color:#fff
    class Plans,RBAC data
```

Adding a plan tier or capability is one object edit. The UI renders comparison + upgrade prompts from the catalog without bespoke per-tier code.

## What lives where

```mermaid
graph LR
    subgraph Repo["This repository"]
        App[app/<br/>Routes + pages]
        Lib[lib/<br/>Shared TypeScript]
        UIDir[lib/ui/<br/>Design primitives]
        Docs[docs/<br/>Public docs]
        DocsInt[docs/internal/<br/>Internal-only]
        MW[middleware.ts]
        Cfg[next.config.ts]
    end

    subgraph Other["Other repos (private)"]
        GoRepo[Go API repo]
        InfraRepo[Infrastructure repo]
    end

    App --> Lib
    Lib --> UIDir
    App -.calls.-> GoRepo
    GoRepo -.deploys via.-> InfraRepo
```

The frontend is intentionally self-contained. It can run end-to-end against synthetic demo data in `lib/demo-data.ts` with no real cloud connection.

## What you can do from here

- Read [`FRONTEND_MAP.md`](./FRONTEND_MAP.md) for how the app/ + lib/ directories are organized.
- Read [`AUTH_AND_TENANT.md`](./AUTH_AND_TENANT.md) for the security model in detail.
- Read [`TELEMETRY_AND_WORKFLOWS.md`](./TELEMETRY_AND_WORKFLOWS.md) for how workflows execute.
- Read [`DEPENDENCY_MAP.md`](./DEPENDENCY_MAP.md) for how modules depend on each other.

Last reviewed: 2026-05-23 (Phase 23).
