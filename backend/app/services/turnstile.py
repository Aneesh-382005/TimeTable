import httpx
from app.config import settings
import logging
from typing import Dict, Optional, Tuple
import json

logger = logging.getLogger(__name__)

class TurnstileVerificationResult:
    def __init__(self, success: bool, errorCodes: list = None, 
                 challenge_ts: str = None, hostname: str = None):
        self.success = success
        self.errorCodes = errorCodes or []
        self.challenge_ts = challenge_ts
        self.hostname = hostname

    def __bool__(self):
        return self.success
    
    def __str__(self):
        return f"TurnstileResult(success = {self.success}, errors = {self.errorCodes})"
    
async def verifyTurnstileToken(token: str, userIP: str = None) -> TurnstileVerificationResult:
    """
    Verify Cloudflare Turnstile token on the server side.
    """

    if not token or len(token.strip()) == 0:
        logger.warning("Empty or missing Turnstile token")
        return TurnstileVerificationResult(success=False, errorCodes=["missing-token"])
    
    if len(token) > 2048:
        logger.warning(f"Turnstile token too long: {len(token)} characters")
        return TurnstileVerificationResult(success=False, errorCodes=["token-too-long"])
    
    try:
        verificationData = {
            "secret": settings.turnstile_secret_key,
            "response": token
        }

        if userIP:
            verificationData["remoteip"] = userIP
            logger.info(f"Verifying Turnstile token for IP: {userIP}")

        async with httpx.AsyncClient(timeout = 10.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=verificationData,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if response.status_code != 200:
                logger.error(f"Turnstile verification failed with status {response.status_code}")
                return TurnstileVerificationResult(success=False, errorCodes = ["api-error"])
            
            try:
                result = response.json()
            except json.JSONDecodeError as e:
                logger.error(f"invalid JSON response from Turnstile API: {e}. Response: {response.text}")
                return TurnstileVerificationResult(success=False, errorCodes=["invalid-api-response"])
            
            logger.info(f"Turnstile verification result: success = {result.get('success')}, errors = {result.get('error-codes', [])}")
            
            verificationResult = TurnstileVerificationResult(
                success = result.get('success', False),
                errorCodes = result.get('error-codes', []),
                challenge_ts = result.get('challenge-ts'),
                hostname = result.get('hostname')
            )

            if verificationResult.success:
                expectedHostnames = ["localhost", "127.0.0.1", "timetable.acmthapar.in"]
                if verificationResult.hostname  and verificationResult.hostname not in expectedHostnames:
                    logger.warning(f"Unexpected hostname in Turnstile response: {verificationResult.hostname}")
                    verificationResult.success = False
                    verificationResult.errorCodes.append("unexpected-hostname")

                logger.info(f"Turnstile verification successful: {verificationResult}")

            else:
                logger.warning(f"Turnstile verification failed: {verificationResult.errorCodes}")

            return verificationResult

    except httpx.TimeoutException:
        logger.error("Turnstile verification request timed out")
        return TurnstileVerificationResult(success=False, errorCodes=["timeout"])
    
    except httpx.RequestError as e:
        logger.error(f"Network error during Turnstile verification: {e}")
        return TurnstileVerificationResult(success=False, errorCodes=["network-error"])
    
    except Exception as e:
        logger.error(f"Unexpected error during Turnstile verification: {e}")
        return TurnstileVerificationResult(success=False, errorCodes=["internal-error"])
    
def getErrorMessage(errorCodes: list) -> str:
    """
    Get a user-friendly error message based on Turnstile error codes.
    """
    if not errorCodes:
        return "Security verification failed. Please try again."

    errorMessages = {
        "missing-token": "Server configuration error. Please try again later.",
        "invalid-token": "Server configuration error. Please try again later.",
        "token-too-long": "Server configuration error. Please try again later.",
        "api-error": "Server configuration error. Please try again later.",
        "bad-request": "Invalid request. Please refresh and try again.",
        "invalid-api-response": "Server configuration error. Please try again later.",
        "unexpected-hostname": "Server configuration error. Please try again later.",
        "timeout": "Verification service timed out. Please try again.",
        "network-error": "Network error occurred. Please try again later.",
        "internal-error": "Internal server error occurred. Please try again later.",
    }

    for code in errorCodes:
        if code in errorMessages:
            return errorMessages[code]

    return errorMessages.get(errorCodes[0], "Security verification failed. Please try again.")

async def testTurnstileVerification():
    testToken = "test-token-replace-with-actual-token"
    result = await verifyTurnstileToken(testToken, "127.0.0.1")
    print(f"Test result: {result}")
    print(f"Error message: {getErrorMessage(result.errorCodes)}")