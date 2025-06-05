from enum import IntEnum, StrEnum


class State(StrEnum):
    ENABLED = "enabled"
    DISABLED = "disabled"


class AuthState(IntEnum):
    USERNAME_ERROR = 1
    PASSWORD_ERROR = 2
