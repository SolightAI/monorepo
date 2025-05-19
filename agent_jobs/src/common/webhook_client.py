import requests


class WebhookClient():
    _url: str

    def __init__(self, url: str):        
        self._url = url

    def send_success(self, job_id: str,result: str):
        return requests.post(
            self._url,
            json={"status": "success", "job_id": job_id, "result": result},
        )

    def send_error(self, job_id: str, error: str):
        return requests.post(
            self._url, json={"status": "error", "job_id": job_id, "result": error}
        )
