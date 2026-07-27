"""
Email provider abstraction.

`OutreachService` (and any future notification feature) depends on this
interface only. Two implementations are provided: `ConsoleEmailClient`
(default — logs the email instead of sending it, so the app is fully
runnable with zero SMTP credentials) and `SMTPEmailClient` (real delivery
via `aiosmtplib`).
"""

from abc import ABC, abstractmethod


class EmailProvider(ABC):
    @abstractmethod
    async def send_email(
        self,
        *,
        to_address: str,
        subject: str,
        body: str,
    ) -> bool:
        """Send a plain-text email. Returns True if accepted for delivery."""
        raise NotImplementedError
