# SANGINI V2 - TASK OVERVIEW

## Team
- **Contract Dev**: Smart contracts (Rust/Soroban)
- **Full Stack Dev**: Backend APIs, Auth, Database
- **Frontend Dev**: UI/UX, React components

## Task Files
- `TASKS-CONTRACTS.md` - Contract dev tasks
- `TASKS-FULLSTACK.md` - Full stack dev tasks
- `TASKS-FRONTEND.md` - Frontend dev tasks

---

# TIMELINE (2 Weeks)

## Week 1: Core Features

| Day | Contract Dev | Full Stack Dev | Frontend Dev |
|-----|--------------|----------------|--------------|
| 1 | Cleanup + Partial Funding | DB Setup + Env vars | Cleanup + Remove demo |
| 2 | Partial Funding + Tests | Auth system | Auth UI (Login/Register) |
| 3 | Dutch Auction | Auth + Meta-tx relayer | Invoice flows |
| 4 | Dutch Auction + Tests | Invoice APIs | Auction UI |
| 5 | Insurance Pool | Order APIs + IPFS | Auction UI + Invest modal |

## Week 2: Advanced Features + Polish

| Day | Contract Dev | Full Stack Dev | Frontend Dev |
|-----|--------------|----------------|--------------|
| 1 | Secondary Market | Order APIs | Order book UI |
| 2 | Secondary Market + Tests | Settlement APIs | Portfolio + Orders pages |
| 3 | IPFS hash + Final tests | Insurance APIs | Insurance + Settlement UI |
| 4 | Deploy to testnet | KYC APIs | KYC UI |
| 5 | Integration testing | Bug fixes | Polish + Responsive |

---

# FEATURES SHIPPING

## P0 - Must Have
- [x] Smart contracts (existing)
- [ ] Remove demo mode
- [ ] Auth (wallet + email)
- [ ] Custodial wallets for buyers
- [ ] Meta-tx (gasless for buyers)
- [ ] Partial funding
- [ ] Dutch auction
- [ ] Data persistence (DB)

## P1 - Should Have
- [ ] Secondary market (order book)
- [ ] Insurance pool
- [ ] IPFS document upload
- [ ] Settlement flow

## P2 - Nice to Have
- [ ] World ID KYC
- [ ] Mobile responsive
- [ ] Transaction history

---

# DEPENDENCIES GRAPH

```
Contract Deploy
      ↓
Full Stack gets contract address
      ↓
Full Stack builds APIs ←→ Frontend builds UI
      ↓
Integration Testing
      ↓
Ship 🚀
```

---

# DAILY STANDUPS

Quick sync each morning:
1. What did you finish yesterday?
2. What are you working on today?
3. Any blockers?

---

# DEFINITION OF DONE

Feature is done when:
1. Code written and working
2. Tested (unit tests for contracts, manual for UI)
3. Integrated with other parts
4. No console errors
5. Works on testnet

---

# COMMUNICATION

- Share contract address immediately after deploy
- Share API endpoints as they're ready
- Flag blockers immediately
- Test together at end of each day
