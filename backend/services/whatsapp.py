import os
import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def _normalize_phone(phone: str) -> str:
    clean = phone.strip().replace(" ", "").replace("-", "")
    if not clean.startswith("+"):
        clean = "+255" + clean.lstrip("0")
    return clean


def send_whatsapp(to_phone: str, message: str):
    if not TWILIO_SID or not TWILIO_TOKEN:
        logger.warning("Twilio credentials not set — WhatsApp skipped")
        return
    try:
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(
            from_=TWILIO_FROM,
            body=message,
            to=f"whatsapp:{_normalize_phone(to_phone)}",
        )
        logger.info(f"WhatsApp sent to {to_phone}")
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")


def notify_new_booking(agent_phone: str, client_name: str, property_name: str, visit_date: str):
    send_whatsapp(
        agent_phone,
        f"*New Booking — DalaliKiganjani*\n\n"
        f"Client: {client_name}\n"
        f"Property: {property_name}\n"
        f"Visit Date: {visit_date}\n\n"
        f"Open your dashboard to manage this booking.",
    )


def notify_new_offer(agent_phone: str, client_name: str, property_name: str, offer_price: float):
    send_whatsapp(
        agent_phone,
        f"*New Offer — DalaliKiganjani*\n\n"
        f"Client: {client_name}\n"
        f"Property: {property_name}\n"
        f"Offer: TZS {offer_price:,.0f}\n\n"
        f"Open your dashboard to review and respond.",
    )
