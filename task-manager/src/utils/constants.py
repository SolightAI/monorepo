import os


SEED = None  # 20250102 (unused for now as don't make things really more deterministic)


AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
if AZURE_OPENAI_ENDPOINT is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')

AZURE_OPENAI_KEY = os.getenv('AZURE_OPENAI_KEY')
if AZURE_OPENAI_KEY is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

TWOCAPTCHA_API_KEY = os.getenv('TWOCAPTCHA_API_KEY')
if TWOCAPTCHA_API_KEY is None:
    raise ValueError('TWOCAPTCHA_API_KEY is not set')
