import os
import uuid
import logging
import httpx
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

FLW_SECRET = os.getenv("FLUTTERWAVE_SECRET_KEY")
FLW_BASE = "https://api.flutterwave.com/v3"

PLANS = {
    "monthly": {"amount": 50000, "currency": "TZS", "label": "Monthly Plan — TZS 50,000", "days": 30},
    "annual":  {"amount": 500000, "currency": "TZS", "label": "Annual Plan — TZS 500,000", "days": 365},
}


async def initiate_payment(agent_id: int, agent_name: str, agent_email: str, plan: str, redirect_url: str) -> dict:
    if not FLW_SECRET:
        return {"status": "failed", "message": "Payment service not configured"}
    if plan not in PLANS:
        return {"status": "failed", "message": "Invalid plan. Choose 'monthly' or 'annual'."}
    p = PLANS[plan]
    tx_ref = f"dalali-{agent_id}-{uuid.uuid4().hex[:8]}"
    payload = {
        "tx_ref": tx_ref,
        "amount": p["amount"],
        "currency": p["currency"],
        "redirect_url": redirect_url,
        "customer": {"email": agent_email, "name": agent_name},
        "meta": {"agent_id": agent_id, "plan": plan},
        "customizations": {
            "title": "DalaliKiganjani",
            "description": p["label"],
            "logo": "",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{FLW_BASE}/payments",
                headers={"Authorization": f"Bearer {FLW_SECRET}"},
                json=payload,
            )
        data = res.json()
        if data.get("status") == "success":
            return {"status": "success", "payment_link": data["data"]["link"], "tx_ref": tx_ref}
        return {"status": "failed", "message": data.get("message", "Payment initiation failed")}
    except Exception as e:
        logger.error(f"Flutterwave initiate error: {e}")
        return {"status": "failed", "message": str(e)}


async def verify_transaction(tx_ref: str) -> dict:
    if not FLW_SECRET:
        return {"status": "failed", "message": "Payment service not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"{FLW_BASE}/transactions",
                headers={"Authorization": f"Bearer {FLW_SECRET}"},
                params={"tx_ref": tx_ref},
            )
        data = res.json()
        txns = data.get("data", [])
        if txns and txns[0].get("status") == "successful":
            tx = txns[0]
            meta = tx.get("meta") or {}
            return {
                "status": "success",
                "verified": True,
                "amount": tx.get("amount"),
                "plan": meta.get("plan"),
                "agent_id": meta.get("agent_id"),
                "tx_ref": tx_ref,
            }
        return {"status": "success", "verified": False}
    except Exception as e:
        logger.error(f"Flutterwave verify error: {e}")
        return {"status": "failed", "message": str(e)}
