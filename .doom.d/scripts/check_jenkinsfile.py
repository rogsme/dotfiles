#!/usr/bin/env python3

import os
import requests

from dotenv import load_dotenv

load_dotenv()

JENKINS_URL = os.environ.get("JENKINS_URL")
JENKINS_USER = os.environ.get("JENKINS_USER")
JENKINS_PASS = os.environ.get("JENKINS_PASS")

files = {
    "jenkinsfile": (None, open("Jenkinsfile", "rb")),
}

try:
    response = requests.post(
        f"{JENKINS_URL}/pipeline-model-converter/validate",
        files=files,
        auth=(JENKINS_USER, JENKINS_PASS))
    print(response.text)
except requests.exceptions.ConnectionError:
    print("Jenkins can't be found. Is the VPN on?")
