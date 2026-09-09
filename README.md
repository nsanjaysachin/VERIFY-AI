# VERIFY — AI Exit Verification

> **Your home. Your rules. Verified.**

VERIFY is a phone-first AI-powered home exit verification system that helps users determine whether their home is actually ready to leave.

Instead of simply reminding users to check appliances, doors, windows, and other important items, VERIFY uses **multimodal AI + smartphone camera + location intelligence** to help verify their physical state.

🌐 **Live Prototype:** https://verify-ai-nu.vercel.app/

---

## 🚨 The Problem

Every day, people leave home with the same doubt:

> **"Did I turn it off?"**

A forgotten stove, AC, heater, iron, light, open window, or unlocked door can lead to:

- 🔥 Safety risks
- ⚡ Unnecessary energy consumption
- 🔐 Security concerns
- 🧠 Stress caused by uncertainty and human forgetfulness

Traditional checklist and reminder apps depend on the user remembering what to check and manually confirming that everything is fine.

**VERIFY goes one step further — it helps verify the physical state.**

---

# 💡 Our Solution

VERIFY creates a personalized understanding of the user's home.

The user scans their home once using the smartphone camera. Multimodal AI identifies relevant objects and appliances, and the user confirms which items matter and what their expected safe state should be.

For example:

| Item | Expected State |
|---|---|
| 🔥 Gas Stove | OFF |
| ❄️ AC | OFF |
| 💡 Lights | OFF |
| 🪟 Window | CLOSED |
| 🚪 Door | LOCKED |
| 🔥 Heater | OFF |

When the user leaves their configured home radius, VERIFY activates the **Exit Verification** workflow.

The user can then use the smartphone camera to verify the selected items.

---

# 🔄 How VERIFY Works

```text
        🏠 HOME
           │
           ▼
    ┌───────────────┐
    │   01 LEARN    │
    │ Scan your home│
    │ with camera   │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │  PERSONALIZE  │
    │ User confirms │
    │ important     │
    │ objects/states│
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │  02 DETECT    │
    │ Location      │
    │ detects exit  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ 03 VERIFY     │
    │ Camera +      │
    │ Multimodal AI │
    └───────┬───────┘
            │
            ▼
   ┌─────────────────────┐
   │ Expected vs Observed│
   │       State         │
   └──────────┬──────────┘
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
    ✓ SAFE    ⚠      ?
   VERIFIED  ATTENTION  UNABLE
                       TO VERIFY
