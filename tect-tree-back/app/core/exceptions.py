class AppError(Exception):
    status_code: int = 400
    detail: str = "application error"


class InvalidCredentials(AppError):
    status_code = 401
    detail = "invalid credentials"


class InsufficientRp(AppError):
    status_code = 400
    detail = "insufficient RP balance"


class NodeLocked(AppError):
    status_code = 403
    detail = "node is locked"


class PaymentVerificationFailed(AppError):
    status_code = 400
    detail = "payment verification failed"
