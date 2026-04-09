# Canton Network Technical Knowledge Base

> Compiled April 2026 from canton.network whitepapers, docs.sync.global, docs.digitalasset.com, and developer resources.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Consensus Mechanism](#2-consensus-mechanism)
3. [Node Types and Roles](#3-node-types-and-roles)
4. [Network Types](#4-network-types)
5. [Validator Setup and Hardware Requirements](#5-validator-setup-and-hardware-requirements)
6. [Docker Compose Deployment](#6-docker-compose-deployment)
7. [Kubernetes / Helm Deployment](#7-kubernetes--helm-deployment)
8. [Super Validator (SV) Node Architecture](#8-super-validator-sv-node-architecture)
9. [Networking Requirements](#9-networking-requirements)
10. [Authentication and Security](#10-authentication-and-security)
11. [Tokenomics and Canton Coin](#11-tokenomics-and-canton-coin)
12. [Traffic Accounting and Fees](#12-traffic-accounting-and-fees)
13. [Daml Smart Contracts](#13-daml-smart-contracts)
14. [Token Standard (CIP-0056)](#14-token-standard-cip-0056)
15. [Application Development](#15-application-development)
16. [DEX/DeFi on Canton](#16-dexdefi-on-canton)
17. [Polyglot Canton (Solidity/EVM/Wasm)](#17-polyglot-canton-solidityevmwasm)
18. [Scalability](#18-scalability)
19. [Backups and Disaster Recovery](#19-backups-and-disaster-recovery)
20. [Upgrades](#20-upgrades)
21. [Developer Resources and Links](#21-developer-resources-and-links)
22. [Whitepapers Index](#22-whitepapers-index)

---

## 1. Architecture Overview

Canton Network is a **public layer-1 blockchain with privacy**, designed for institutional finance. Launched May 2023 by Digital Asset with Goldman Sachs, BNP Paribas, CBOE, Microsoft, DTCC, Deutsche Borse.

**Production scale (late 2025):** 600K+ daily transactions, $6T tokenized assets under management, $280B daily repo settlements (Broadridge DLR), $1.5T monthly repo transactions.

### Core Design Principle: Decoupled Architecture

Canton separates three functions that are tightly coupled in traditional blockchains:

| Layer | Component | Function |
|-------|-----------|----------|
| Layer 1 | **Participant Node** | Runs private data and contracts |
| Layer 2 | **Sync Domain (Sequencer)** | Orders encrypted transactions for a group |
| Layer 3 | **Global Synchronizer** | Settles transactions across different groups |

### Key Differentiators from Traditional Blockchains

- **Privacy by default**: Validators only get data relevant to their users, NOT a copy of everything
- **Sub-transaction privacy**: Only stakeholders see transaction data
- **Atomic cross-domain composability**: Transactions spanning multiple sync domains settle atomically
- **No global state replication**: Each node only processes its own transactions
- **"Network of networks"**: Each institution maintains its own sub-ledger while connecting via shared synchronization layer

### Governance

The **Global Synchronizer Foundation (GSF)**, a non-profit under the Linux Foundation, governs the Global Synchronizer. Independent from Digital Asset.

---

## 2. Consensus Mechanism

### "Proof-of-Stakeholder" (Two-Layer Consensus)

**Layer 1: Two-Phase Commit Protocol** -- Replicates each contract to stakeholders while concurrently enabling validation.

**Layer 2: Sequencing Protocol** -- Receives encrypted transactions and assigns timestamps.

### Transaction Lifecycle (6 Steps)

1. **Initiation**: Party exercises a choice on a Daml contract, creating a transaction proposal
2. **Stakeholder Definition**: Daml template signatories/observers implicitly define the transaction's stakeholders
3. **Encryption & Submission**: Initiating participant node encrypts transaction for the stakeholder set, submits to sync domain
4. **Sequencing**: Sync domain sequences the transaction and broadcasts to all stakeholder participant nodes
5. **Validation**: Each stakeholder's participant node decrypts and independently validates against local ledger view (deterministic execution guarantees same result)
6. **Confirmation & Commit**: Participant nodes confirm readiness (Phase 1 of 2PC). Sync domain issues final commit (Phase 2). All nodes atomically commit. If any reject, sync domain issues rollback.

### BFT Consensus (Global Synchronizer)

The Global Synchronizer uses **2/3 majority Byzantine Fault Tolerant (BFT) consensus** via **CometBFT** for:
- Message ordering
- Transaction confirmation
- Governance voting

**DSO Party confirmation threshold**: `t = ceiling(numSvNodes * 2.0 / 3.0)`

---

## 3. Node Types and Roles

### Participant Node
- Sovereign, stateful environment operated by an entity (bank, fund, etc.)
- Hosts parties (legal entities/actors)
- Primary data store and execution environment for Daml contracts
- Controls its own data and keys
- Only processes transactions relevant to its hosted parties

### Validator Node
- Operates participant node + validator application layer
- Stores contract data and executes smart contract code
- Validates transactions and records activity
- Connects users and applications to the network
- Maximum 200 parties per validator app (underlying participant supports up to 1M)

### Super Validator (SV) Node
- Infrastructure backbone of the network
- Operates CometBFT consensus node
- Runs sequencer and mediator components
- Validates ALL Canton Coin transactions
- Participates in governance decisions
- Runs Scan service for data aggregation

### Sequencer
- Sets the order of transactions
- Routes encrypted messages between participants
- Is **blind** to transaction content (end-to-end encrypted payloads)
- Provides definitive, monotonic ordering
- Timestamps and routes encrypted blobs

### Mediator
- Collects confirmations of validity from all participants
- Decides whether to finalize operations
- Coordinates the two-phase commit protocol

### Parties
- Core on-ledger identities (like wallet addresses/EOAs)
- Format: `name::fingerprint` (fingerprint = sha256 hash of public key, prefixed with '12')
- Party name: max 185 chars from `[a-zA-Z0-9:-_ ]`, no consecutive colons, must be unique
- **Internal parties**: Key held on validator node (validator has signing control)
- **External parties**: Signing key held externally (prepare -> sign -> submit flow)
- Creating parties has an associated cost (not ephemeral like ETH addresses)

---

## 4. Network Types

### DevNet
- **Open** to any node operator (no approval needed)
- Resets every **3 months**
- Receives version upgrades **first**
- Onboarding secret: self-service via API (`/api/sv/v0/devnet/onboard/validator/prepare`), valid 1 hour
- Ideal for testing updates before production

### TestNet
- Requires **Tokenomics Committee approval** (request via https://sync.global/validator-request/)
- Resets every **3-6 months** (staggered from DevNet)
- Upgrades occur **between DevNet and MainNet** timelines

### MainNet
- Requires **Tokenomics Committee approval + additional requirements**
- **Never resets** -- preserves all historical data
- Receives upgrades **last**
- Onboarding secret: SV-provided, 48-hour validity, one-time use

### Network Requirements (All Networks)
- Validator egress IP must be added to allowlist by SV operators
- **One IP per network** -- IPs must be distinct across DevNet/TestNet/MainNet
- Approval takes **2-7 days**
- Alternative: VPN through SV operator (may be removed in future)
- Must have connectivity to **at least 2/3 of Super Validators**

---

## 5. Validator Setup and Hardware Requirements

### Hardware Specifications

| Metric | Minimal | Production (Low) | Production (Moderate) |
|--------|---------|-------------------|-----------------------|
| **CPU** | 1 | 2 | 2 |
| **RAM** | 6 GB | 8 GB | 16 GB |
| **DB CPU** | 1 | 2 | 2 |
| **DB RAM** | 1 GB | 4 GB | 4 GB |
| **DB Storage** | 1 GB | 10 GB | 100 GB |

### Critical: Database Latency
- Components are **highly sensitive** to database latency
- For managed databases (GCP CloudSQL, AWS RDS): place in **same region AND zone** as cluster
- Monitor CPU, memory, and disk usage continuously in production

### Software Prerequisites (Docker Compose)
- Docker Compose **v2.26.0+**
- `curl` and `jq`
- Architecture: **AMD64 or ARM64**
- Static egress IP or VPN connection

### Software Prerequisites (Kubernetes)
- Kubernetes cluster **v1.26.1+**
- `kubectl` **v1.26.1+**
- `helm` **v3.11.1+**
- Static egress IP
- Admin access to cluster

---

## 6. Docker Compose Deployment

### Setup Steps

```bash
# 1. Extract release bundle
tar xzvf 0.5.16_splice-node.tar.gz
cd splice-node/docker-compose/validator
export IMAGE_TAG=0.5.16

# 2. Start validator
./start.sh -s "<SPONSOR_SV_URL>" -o "<ONBOARDING_SECRET>" \
  -p "<party_hint>" -m "<MIGRATION_ID>" -w

# 3. Stop validator
./stop.sh
```

### Required Network Parameters (from sponsor SV)

| Parameter | Purpose |
|-----------|---------|
| `MIGRATION_ID` | Current network version identifier |
| `SPONSOR_SV_URL` | SV app URL (e.g., `https://sv.sv-1.unknown_cluster...`) |
| `ONBOARDING_SECRET` | One-time credential (48h expiry) |

### Party Hint Format
`<organization>-<function>-<enumerator>` (e.g., `myCompany-myWallet-1`). **Immutable** -- becomes part of validator's party ID.

### Service Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Wallet UI | `http://wallet.localhost` | User asset management |
| CNS UI | `http://ans.localhost` | Domain registration |
| JSON Ledger API | `json-ledger-api.localhost:80` | REST API |
| gRPC Ledger API | `grpc-ledger-api.localhost:80` | Native ledger interface |

### HTTP Proxy Configuration

```yaml
services:
  validator:
    environment:
      JAVA_TOOL_OPTIONS: >-
        -Dhttps.proxyHost=your.proxy.host
        -Dhttps.proxyPort=your_proxy_port
  participant:
    environment:
      JAVA_TOOL_OPTIONS: >-
        -Dhttps.proxyHost=your.proxy.host
        -Dhttps.proxyPort=your_proxy_port
```

### Traffic Configuration

```bash
export TARGET_TRAFFIC_THROUGHPUT=20000  # bytes/second
export MIN_TRAFFIC_TOPUP_INTERVAL="1m"  # minimum interval between top-ups
```

### Limitations (vs. Kubernetes)
- No external ingress support
- No TLS encryption
- No advanced monitoring
- No production-grade reliability
- **Recommended for development/non-critical only**

---

## 7. Kubernetes / Helm Deployment

### Namespace and Secrets Setup

```bash
# Create namespace
kubectl create ns validator

# PostgreSQL credentials
kubectl create secret generic postgres-secrets \
    --from-literal=postgresPassword=${POSTGRES_PASSWORD} \
    -n validator

# Onboarding secret
kubectl create secret generic splice-app-validator-onboarding-validator \
    "--from-literal=secret=${ONBOARDING_SECRET}" \
    -n validator
```

### Helm Values Configuration

Key parameters:
- Network parameters (MIGRATION_ID, SPONSOR_SV_URL, TRUSTED_SCAN_URL)
- OIDC authentication (see Security section)
- PostgreSQL connection
- Ingress hostnames
- HTTP proxy (if needed)

```yaml
additionalJvmOptions: |
  -Dhttps.proxyHost=your.proxy.host
  -Dhttps.proxyPort=your_proxy_port
  -Dhttps.nonProxyHosts=<optional>
```

### Deployment Components
- Validator application backend
- Canton participant node
- PostgreSQL database
- Wallet web UI
- CNS (Canton Name Service) web UI
- Ingress controller for external access

### Ingress Hostnames
- `wallet.validator.YOUR_HOSTNAME`
- `cns.validator.YOUR_HOSTNAME`

---

## 8. Super Validator (SV) Node Architecture

### Components

An SV node runs significantly more components than a regular validator:

1. **CometBFT Consensus Node** -- BFT consensus layer, requires key generation
2. **Sequencer** -- Transaction ordering, requires pruning
3. **Mediator** -- Transaction coordination
4. **Participant Node** -- Standard Canton participant
5. **SV Application** -- Governance and operations
6. **Scan Service** -- Data aggregation, tracks mining rounds and conversion rates

### PostgreSQL Instances

SVs require **multiple separate PostgreSQL databases**:
- Sequencer database
- Participant database
- Mediator database
- SV application database

Options: in-cluster or cloud-hosted (managed).

### SV Identity

Operators identified by:
- Human-readable name
- EC public key (prime256v1 / P-256)
- Generated via OpenSSL, stored as base64

Joining requires approval from a **threshold of active SVs**.

### Three Identity Layers
1. SV identity (governance)
2. Participant identities (transaction processing)
3. CometBFT node identities (consensus)

### SV Kubernetes Deployment

```bash
kubectl create ns sv
```

Required configuration:
- CometBFT node keys
- BFT Sequencer connections
- Multiple PostgreSQL instances
- Cluster ingress for multiple UIs (wallet, CNS, SV UI, Scan UI)
- OIDC for validator + SV backends + 3 UI apps

### SV Exposed UIs
- Wallet UI
- CNS UI
- SV Operations UI
- Canton Coin Scan UI
- Amulet Conversion Rate Feed

### Monitoring Metrics
- `splice.sv_cometbft.earliest_block_height`
- `splice.sv_cometbft.latest_block_height`
- `splice.scan_store.earliest-aggregated-round`
- `splice.scan_store.latest-aggregated-round`
- `splice.sequencer_pruning.latency`

---

## 9. Networking Requirements

### Validator Networking

**Ingress: NONE required.** Validators have NO external ingress requirements. No need to whitelist other SVs or validators.

**Egress:**
- Port **443** (HTTPS/TLS) to all Super Validator IPs
- All SV IPs must be whitelisted for outbound connections
- "Egress is often allowed by default, so in many cases this requires no action"

**Architecture: Pull-based.** Validators connect outbound to SVs, not the other way around. Simplifies firewall config.

### SV Networking

More complex -- SVs require:
- **Ingress**: Expose multiple UIs and API endpoints
- **Egress**: Connect to external sequencers, other SVs
- CometBFT peer-to-peer networking between SV nodes

---

## 10. Authentication and Security

### OIDC Requirements

All production deployments require an OpenID Connect provider supporting:
- **RS256** JWT signing algorithm
- OAuth 2.0 **Client Credentials** flow (machine-to-machine)
- OAuth 2.0 **Authorization Code** flow (user-facing)
- Discovery at `/.well-known/openid-configuration`
- JWK Set at `/.well-known/jwks.json`

### Auth0 Configuration (Recommended Path)

**API Setup:**
1. Create "Daml Ledger API" with identifier `https://canton.network.global`
2. Add `daml_ledger_api` permission scope
3. Enable offline access

**Applications Required:**
| App | Type | Purpose |
|-----|------|---------|
| Validator Backend | Machine-to-Machine | Backend auth |
| Wallet UI | Single Page Web App | User wallet |
| CNS UI | Single Page Web App | Name service |
| SV Backend (SV only) | Machine-to-Machine | SV operations |
| SV UI (SV only) | Single Page Web App | SV management |

### External KMS Integration

Supported providers:
- **Google Cloud KMS**: Requires `cloudkms.cryptoKeyVersions.create`, `.useToDecrypt`, `.useToSign` + viewing permissions
- **AWS KMS**: Requires `kms:CreateKey`, `kms:TagResource`, `kms:Decrypt`, `kms:Sign`, `kms:DescribeKey`, `kms:GetPublicKey`

**Limitations:**
- Only available for **Helm/Kubernetes** deployments (not Docker Compose)
- Cannot migrate from non-KMS to KMS-based operation
- Cannot migrate between KMS providers
- Recommended: start fresh with desired KMS, transfer assets from legacy

### Session Keys
- Session encryption keys with **1-hour lifetime** by default
- Reduces asymmetric crypto operations
- Theoretical exposure window for memory snapshots

### Key Safety
**"If you lose your keys, you lose access to your coins."** Regular backups strongly recommended. SVs retain only CC recovery data.

---

## 11. Tokenomics and Canton Coin

### Overview

Canton Coin (CC) is the network's native utility token. It uses a **burn-mint equilibrium** model.

### Burn Mechanism
- Users pay **USD-denominated fees** via CC burning
- Fees paid for: transfers, traffic creation, CNS entry purchases, transfer preapproval creation
- Burned coins are removed from circulation (NOT paid to central authority)
- CIP-0078: Eliminated almost all fees for CC transfers and locks

### Mint Mechanism -- Minting Rounds

**Round duration**: Every **10 minutes** (configurable by SV governance vote)

**5 Phases per Round:**
1. Fee values written to ledger
2. Activity recording phase
3. Calculation of CC-issuance-per-activity-weight
4. Minting phase (owners mint proportional to weight)
5. Round completion

**Target**: ~2.5 billion coins issued and burned annually

### Activity Record Types

| Template | Category |
|----------|----------|
| `FeaturedAppActivityMarker` | Application |
| `AppRewardCoupon` | Application |
| `ValidatorRewardCoupon` | Infrastructure |
| `ValidatorLivenessActivityRecord` | Infrastructure |
| `SvRewardCoupon` | Infrastructure |

### Reward Distribution (as of 2026)

| Recipient | Share | Notes |
|-----------|-------|-------|
| Featured Applications | **62%** (~516M CC/month) | Until mid-2029 |
| Super Validators | **20%** | Decreasing from initial 80% |
| Validators | Proportional | Based on burned fees + liveness bonus |
| Infrastructure | Remaining | Based on participation |

**Featured App Rewards**: ~$1 USD equivalent per activity marker. Featured apps can mint up to **100x more CC** than fees burned. First featured app earns minimum $100 per CC transfer.

### Holding Fees
- Fixed fee per coin contract (UTXO) per unit of time
- SVs may expire a coin contract when accrued holding fees exceed coin value

### Conversion Rate
- Dynamic burn-mint equilibrium
- High usage = more burning = higher conversion rate
- Low usage = more supply = lower conversion rate
- Self-regulating toward network utility value

---

## 12. Traffic Accounting and Fees

### What Counts as Traffic

All messages from participants sequenced by the synchronizer:
- Daml workflow confirmation requests/responses
- Built-in automated workflows (reward collection)
- Topology transactions (party allocation, DAR package vetting)
- ACS commitments (periodic sync between participants)

Traffic tracked **per validator participant** -- all parties on same participant share one balance.

### Traffic Parameters (from `AmuletRules` contract)

```json
{
  "baseRateTrafficLimits": {
    "burstAmount": "400000",
    "burstWindow": {"microseconds": "1200000000"}
  },
  "extraTrafficPrice": "60.0",
  "readVsWriteScalingFactor": "4",
  "minTopupAmount": "200000"
}
```

### Parameter Details

| Parameter | Value | Meaning |
|-----------|-------|---------|
| **Free Tier (Base Rate)** | 400,000 bytes / 1,200 sec | No fees. Recovers linearly. |
| **Extra Traffic Price** | $60 USD/MB | Charged in CC at current exchange rate |
| **Read vs Write Factor** | 4 (basis points) | 1 MB msg with 10 recipients = 1,040,000 bytes |
| **Min Top-up Amount** | 200,000 bytes | Minimum purchase to prevent overhead |

### Read vs Write Formula
```
traffic = message_size_bytes * (1 + num_recipients * factor / 10000)
```
Example: 1 MB with 10 recipients = `1,000,000 * (1 + 10 * 0.004)` = **1,040,000 bytes**

### Submission Processing (7 Steps)

1. Transaction submitted
2. Sequencer checks base rate + purchased traffic
3. Base rate accrues linearly since last submission
4. If sufficient base rate: deduct and sequence
5. If insufficient base rate but adequate extra traffic: deplete base rate, draw extra traffic
6. If neither available: **submission fails**
7. After `burstWindow` inactivity: base rate fully replenishes

### Automatic Traffic Top-ups

Triggers when:
- Extra traffic balance < preconfigured total top-up amount AND
- Minimum top-up interval elapsed since last purchase

Amount = `target_throughput * min_topup_interval` bytes

### Wasted Traffic

Sequenced but undelivered events. Causes:
- Submission request amplification from retries
- Message duplication in ordering layer
- Participant-side duplication after restarts

Monitor via Grafana "Rejected Event Traffic" dashboards.

---

## 13. Daml Smart Contracts

### Language Characteristics
- **Strongly typed, functional language**
- Designed for modeling multi-party rights and obligations
- Deterministic execution (same inputs = same output, always)
- Permission model enforced at **compile time**
- Reads more like a legal contract than code

### Template Model
- **Templates** define contract data, signatories, observers, and choices
- **Signatories**: Parties who must agree to creation
- **Observers**: Parties with read-access
- **Choices**: Actions that can be exercised on the contract + who is authorized
- **Contract Keys**: Business-defined primary keys (e.g., trade ID) for efficient lookup

### Core Splice Daml Packages

| Package | Purpose |
|---------|---------|
| `splice-util` | Foundational utilities |
| `splice-amulet` | Canton Coin (CC) implementation |
| `splice-amulet-name-service` | Canton Name Service (CNS) |
| `splice-dso-governance` | Global Synchronizer governance |
| `splice-validator-lifecycle` | Validator onboarding |
| `splice-wallet-payments` | Subscription and payment workflows |
| `splice-wallet` | P2P transfers and automation delegation |
| `splice-token-standard` | CIP-0056 token interfaces |

### Decentralized Transaction Validation

Three mechanisms for BFT across SV nodes:
1. **DSO Party Structure**: Threshold `t = ceiling(numSvNodes * 2.0 / 3.0)`
2. **On-Ledger Confirmations**: `t` SV nodes must explicitly confirm
3. **Distributed Automation**: All SV nodes run synchronized automation
4. **Median-Based Voting**: Configuration parameters use median of SV-published values

---

## 14. Token Standard (CIP-0056)

### Template Modules

| Module | Daml Reference | Purpose |
|--------|---------------|---------|
| Token Metadata V1 | `Splice.Api.Token.MetadataV1` | Token identity/properties |
| Holding V1 | `Splice.Api.Token.HoldingV1` | Ownership and balances |
| Transfer Instruction V1 | `Splice.Api.Token.TransferInstructionV1` | Token movement |
| Allocation V1 | `Splice.Api.Token.AllocationV1` | Core allocation contracts |
| Allocation Instruction V1 | `Splice.Api.Token.AllocationInstructionV1` | Instruction-based allocation |
| Allocation Request V1 | `Splice.Api.Token.AllocationRequestV1` | Request management |

### UTXO / MergeDelegation System
- Tokens use UTXO model
- MergeDelegations consolidate UTXOs to prevent fragmentation
- `splice-util-token-standard-wallet` package for wallet integration
- Supports factory and non-factory choice execution

### Access Layers
- **Daml APIs**: Direct smart contract interfaces
- **HTTP APIs**: REST endpoints
- **Ledger API**: Standard Canton ledger interface

---

## 15. Application Development

### API Surfaces

**Scan APIs:**
- Bulk Data API (updates, events, ACS snapshots)
- Global Synchronizer Connectivity API (list SVs, sequencers, validators, party hosting)
- Global Synchronizer Operations API (validator liveness, DSO info)
- Canton Coin Reference Data API (DSO party identification)
- Current State API (traffic credits, mining rounds, conversion rates)
- Aggregates API (amulet summaries, holdings, ANS lookups)

**Validator APIs:**
- User wallet API
- Traffic purchasing API
- User management API
- ANS API (name service)
- External signing API
- Scan proxy API

**Ledger API:**
- gRPC and REST interfaces
- Transaction submission
- Contract queries
- Streaming updates

### Featured App Rewards (CIP-0047)

Applications earn rewards through activity markers:
- `WalletUserProxy` and `DelegateProxy` templates
- Batched marker aggregation reduces on-ledger transaction volume
- Featured apps: 62% of reward pool (~516M CC/month)

### Local Development

Docker-Compose based local network:
- Pre-configured default wallet users
- Swagger UI for API exploration
- Canton Admin Console access
- Full participant nodes, sequencer, mediator, wallet, CNS, PostgreSQL

### Development Workflow
1. Develop locally with Docker Compose localnet
2. Test on **DevNet** (open, resets every 3 months)
3. Stage on **TestNet** (approval required, resets 3-6 months)
4. Deploy to **MainNet** (approval required, never resets)

### Key Developer Resources

| Resource | URL |
|----------|-----|
| **Quickstart** | https://docs.digitalasset.com/build/3.4/quickstart/ |
| **Canton Docs** | https://docs.digitalasset.com/overview/3.3/ |
| **Splice Docs** | https://docs.sync.global/ |
| **Build Docs** | https://docs.digitalasset.com/build/3.3/ |
| **Operate Docs** | https://docs.digitalasset.com/operate/3.3/ |
| **Subnet Docs** | https://docs.digitalasset.com/subnet/3.3/ |
| **Integrate Docs** | https://docs.digitalasset.com/integrate/devnet/ |
| **Daml Training** | https://www.digitalasset.com/training-and-certification |
| **GitHub** | https://github.com/digital-asset/ |
| **Forum** | https://discuss.daml.com/ |
| **Discord** | https://discord.com/invite/canton |
| **Telegram** | https://t.me/cantonnetwork1 |

---

## 16. DEX/DeFi on Canton

### Institutional DeFi Capabilities

Canton enables compliant institutional DeFi through:

- **Permissioned Liquidity Pools**: AMM (like Uniswap) within permissioned environments. Only KYC/AML-cleared participants can trade.
- **Institutional Yield Farming**: Tokenized money market fund shares as collateral to borrow stablecoins, fully auditable
- **Complex Structured Products**: Derivatives tied to multiple assets across different ledgers, settled atomically
- **Atomic DvP/PvP**: Delivery vs. Payment and Payment vs. Payment as single atomic transactions
- **Cross-Domain Composability**: Global Synchronizer coordinates 2PC across different sync domains

### Existing DeFi Projects on Canton

- **ACME**: Decentralized overcollateralized lending platform
- **Denex**: Gas station / traffic on-ramp for validators
- **Zenith**: Atomic swaps linking Canton and Ethereum
- **Loop Wallet** (Five North): Self-custodial wallet with SDK, $3M revenue in 2 months
- **RedStone**: Institution-grade RWA oracles

### USDCx
- USDC support for wallets documented at `docs.digitalasset.com/integrate/devnet/usdcx-support/`

---

## 17. Polyglot Canton (Solidity/EVM/Wasm)

### Vision (from whitepaper, published Feb 2025)

Canton is expanding beyond Daml-only to support multiple smart contract languages.

### Technical Approach
- **General-purpose WASM-hosted languages** (e.g., Rust) supported
- **EVM-based languages** (Solidity) via:
  - **Hyperledger Solang compiler**: Converts Solidity to Wasm
  - **Wasm-based EVM**: Hosting Rust-EVM in Wasm runtime
- EVM ledger model mapped to Canton ledger model

### Advantages Over Standard EVM
- Atomic transactions between **two private Solidity contracts**
- Privacy-preserving Solidity execution
- Canton's sub-transaction privacy applies to EVM contracts

### Challenges
- Contention model differences between EVM global state and Canton UTXO
- Mapping EVM account model to Canton's participant-based architecture

---

## 18. Scalability

### Party Limits

- **Validator app limit**: 200 parties per node
- **Underlying Canton participant**: Up to 1,000,000 parties
- The 200-party limit applies to parties onboarded via validator APIs or with `WalletAppInstall` contracts

### Bypassing the 200-Party Limit

- Set up external parties through Canton APIs or validator topology endpoints
- Avoid `/v0/admin/external-party/setup-proposal`
- Use `TransferPreapprovalProposal` contracts instead of `ValidatorRight` contracts
- **Tradeoff**: Lose reward minting automation and some validator endpoints

### Topology Batching

- **Default**: Disabled (individual topology transactions submitted separately)
- **Purpose**: Prevents bootstrap issues where oversized batches exceed free traffic
- **Post-bootstrap**: Increase `canton.participants.participant.topology.broadcast-batch-size` via env vars
- **Maximum recommended batch size**: 20

### Scaling Approach
- Network scales by adding more nodes (each node only processes own transactions)
- Light node footprint (no global state replication)
- Each sync domain can be scaled independently

---

## 19. Backups and Disaster Recovery

### What to Backup

**1. Node Identities** (highly sensitive -- contain private keys):
```bash
curl "https://wallet.validator.YOUR_HOSTNAME/api/validator/v0/admin/participant/identities" \
  -H "authorization: Bearer <token>"
```
Store in secure external location (Secret Manager), outside the cluster.

**2. PostgreSQL Instances** (every 4 hours minimum):

**Critical ordering**: Validator app backup must be taken **strictly earlier** than participant backup.

```bash
# Validator app database
docker exec -i splice-validator-postgres-splice-1 pg_dump -U cnadmin validator \
  > "${backup_dir}"/validator-"$(date -u +"%Y-%m-%dT%H:%M:%S%:z")".dump

# Participant database
active_participant_db=$(docker exec splice-validator-participant-1 bash \
  -c 'echo $CANTON_PARTICIPANT_POSTGRES_DB')
docker exec splice-validator-postgres-splice-1 pg_dump -U cnadmin \
  "${active_participant_db}" > "${backup_dir}"/"${active_participant_db}"\
  -"$(date -u +"%Y-%m-%dT%H:%M:%S%:z")".dump
```

### Backup Methods
- `pg_dump`
- Persistent Volume snapshots
- Cloud provider backup tools

### SV Additional Backups
- CometBFT storage layer
- Separate backup procedures for node identities, PostgreSQL, and CometBFT

### Disaster Recovery Scenarios
- Restoring from data corruption
- Re-onboarding and Amulet recovery
- CometBFT layer loss recovery with migration procedures

---

## 20. Upgrades

### Minor Upgrades (0.A.X -> 0.A.Y)
- Performed independently by each node
- Update docker-compose files or `helm upgrade`
- **Do NOT**: Delete Postgres, change migration ID, use "migrating" flag
- Review release notes for config adjustments

### Major Upgrades (0.B.X -> 0.C.Y)
- Require **network-wide coordination**
- Coordinated downtime
- Migration dumps, state validation
- Coordinated Canton component deployment across nodes

### Docker Compose Upgrade
- Must update **entire bundle**, not just IMAGE_TAG
- Old docker-compose files may be incompatible with new version

---

## 21. Developer Resources and Links

### Ecosystem Tools

| Tool | Provider | Purpose |
|------|----------|---------|
| **Canton Network Utilities** | Digital Asset | Accelerate tokenization solutions |
| **Catalyst Blockchain Manager** | IntellectEU | Node-as-a-Service |
| **Denex Gas Station** | Denex | Traffic on-ramp for validators |
| **Noves Data API** | Noves | Standardized data API (transactions, rewards, balances) |
| **Go Daml SDK** | Noders | Native Go support for Daml SDK |
| **Loop Wallet SDK** | Five North | Self-custodial wallet integration |
| **Canton RPC/API** | Proof Group | Professional-grade RPC for exchanges |

### Documentation Sites

| Site | Content |
|------|---------|
| https://docs.sync.global/ | Splice docs (validator/SV operations, Daml APIs) |
| https://docs.digitalasset.com/ | Canton Platform docs (overview, build, operate, integrate) |
| https://www.canton.network/developer-resources | Developer hub |

### Community

- **Slack**: `#validator-operations` channel
- **Discord**: https://discord.com/invite/canton
- **Telegram**: https://t.me/cantonnetwork1
- **Forum**: https://discuss.daml.com/
- **Mailing Lists** (groups.io): main, cip-announce, tokenomics-announce, validator-announce

---

## 22. Whitepapers Index

| Title | URL | Key Content |
|-------|-----|-------------|
| **Canton Network Whitepaper** | [PDF](https://www.canton.network/hubfs/Canton/Canton%20Network%20-%20White%20Paper.pdf) | Network architecture, privacy, governance, scaling |
| **The Canton Blockchain Protocol** | [PDF](https://www.canton.network/hubfs/Canton/canton-whitepaper.pdf) | Core protocol spec, Daml integration, cryptographic primitives |
| **Polyglot Canton** | [PDF](https://www.canton.network/hubfs/Canton%20Network%20Files/whitepapers/Polyglot_Canton_Whitepaper_11_02_25.pdf) | Multi-language support, Solidity/Wasm/EVM compatibility |
| **Canton Coin: Responsible Approach** | [PDF](https://www.canton.network/hubfs/Canton%20Coin%20A%20Responsible%20Approach%20to%20Digital%20Tokens.pdf) | Token design, traffic fees, minting, validator incentives |
| **Canton Coin: Payment Application** | [PDF](https://www.canton.network/hubfs/Canton%20Network%20Files/Documents%20(whitepapers,%20etc...)/Canton%20Coin_%20A%20Canton-Network-native%20payment%20application.pdf) | Payment app design, cross-app connections |
| **Canton Coin: MiCA Whitepaper** | [PDF](https://www.canton.network/hubfs/Canton%20Network%20Files/whitepapers/Canton%20Coin%20%20-%20MiCA%20Whitepaper.pdf) | EU MiCA regulatory compliance |

---

## 23. Fee Structure (from Canton Coin Payment Whitepaper)

### Transfer Fees (regressive)
| Amount Range | Fee Rate |
|-------------|----------|
| First $100 | 1.0% |
| $100-$1,000 | 0.1% |
| $1,000-$1M | 0.01% |
| Above $1M | 0.001% |

- **Base transfer fee**: $0.03 per output coin UTXO
- **Lock holder fee**: $0.005 per lock holder
- **Holding fee**: $1/year per coin UTXO (regardless of amount)
- **Traffic price**: $60/MB beyond free tier (updated from $17)

### Minting Curve (first 10 years: 100B CC total)
| Period | Rate/Year | App % | Validator % | SV % |
|--------|-----------|-------|-------------|------|
| 0-0.5 yr | 40B | 15% | 5% | 80% |
| 0.5-1.5 yr | 20B | 40% | 12% | 48% |
| 1.5-5 yr | 10B | 62% | 18% | 20% |
| 5-10 yr | 5B | 69% | 21% | 10% |
| 10+ yr | 2.5B | 75% | 20% | 5% |

### CC-to-USD Conversion
- Default at launch: $0.005/CC
- Dynamic burn-mint equilibrium adjusts over time
- Median of SV-proposed rates

---

## 24. DevNet Self-Service Onboarding

### Steps
1. IP must be whitelisted by SV operators (done for 77.42.49.65)
2. Get onboarding secret via POST to SV sponsor URL:
   ```
   POST https://sv.sv-1.dev.global.canton.network.sync.global/api/sv/v0/devnet/onboard/validator/prepare
   ```
   Secret valid for 1 hour only.
3. Get MIGRATION_ID from https://sync.global/sv-network/ or SV API
4. Start validator with `./start.sh`

### Key Differences from TestNet/MainNet
- No committee approval needed
- Self-service onboarding secret (1hr validity vs 48hr)
- Resets every 3 months
- Gets upgrades first

---

## 25. JFrog Artifactory Access

- URL: https://digitalasset.jfrog.io/ui/login/ (Auth0 login)
- Victor onboarded July 2024 via Wayne Collier (DA Canton Network)
- Romain (romain@xventures.de) also has access
- Contains Docker images and release bundles (splice-node tar.gz)

---

## 26. ClearPortX Architecture

ClearPortX = Institutional DEX on Canton Network
- Validator nodes for each network (devnet/testnet/mainnet)
- Participant node for hosting DEX application
- Daml smart contracts for trading logic (permissioned AMM)
- Party hint format: clearportx-validator-{D|T|M}

### Server: Hetzner AX102 #2950825
- Primary IP: 65.109.113.56
- Devnet: 77.42.49.65 (whitelisted)
- Testnet: 77.42.49.80
- Mainnet: 77.42.49.82

---

## Quick Reference: Validator Deployment Checklist

1. [ ] Decide deployment type: Docker Compose (dev) or Kubernetes (production)
2. [ ] Choose network: DevNet (open) / TestNet (approval) / MainNet (approval)
3. [ ] Obtain static egress IP (one per network, all must be different)
4. [ ] Submit IP for whitelisting (2-7 days)
5. [ ] Provision hardware (min: 1 CPU, 6GB RAM, 1GB DB storage)
6. [ ] Install prerequisites (Docker Compose v2.26+ OR K8s v1.26.1+ with helm v3.11.1+)
7. [ ] Obtain network parameters from sponsor SV (MIGRATION_ID, SPONSOR_SV_URL, ONBOARDING_SECRET)
8. [ ] Configure OIDC provider (Auth0, Keycloak, or similar)
9. [ ] Deploy validator node
10. [ ] Configure traffic auto-purchase
11. [ ] Set up backups (identities + PostgreSQL every 4h)
12. [ ] Monitor via Grafana dashboards
13. [ ] Join Slack `#validator-operations` and mailing lists
