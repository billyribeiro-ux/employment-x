# Local Development Setup

## Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Rust toolchain (for api-rust)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/billyribeiro-ux/employment-x.git
cd employment-x
pnpm install

# 2. Environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET

# 3. Database
createdb employmentx
cd apps/web && pnpm exec prisma migrate dev && cd ../..

# 4. Start dev servers
pnpm turbo dev
```

## Services
| Service | Port | URL |
|---------|------|-----|
| Next.js web | 3000 | http://localhost:3000 |
| Rust API | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

## Verify
```bash
pnpm turbo build        # Full build
pnpm turbo test         # Unit tests
pnpm turbo typecheck    # Type checking
pnpm turbo lint         # Linting
```
