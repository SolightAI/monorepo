import requests


class WebhookSender:
  _url: str
  _job_id: str
  
  def __init__(self, url: str, job_id: str):
    self._url = url
    self._job_id = job_id
  
  def send_success(self, result: str):
    return requests.post(self._url, json={"status": "success", "job_id": self._job_id, "result": result})
  
  def send_error(self, error: str):
    return requests.post(self._url, json={"status": "error", "job_id": self._job_id, "result": error})