#!/usr/bin/env python

import boto3
from flask import Flask, jsonify, request, send_from_directory, render_template, redirect, url_for, flash
import logging
import urllib.request
import json
import os
import random
import string
from dotenv import load_dotenv
from flask_login import (
    login_user,
    LoginManager,
    logout_user,
    login_required,
)
import secrets
load_dotenv()

CLOUD_PROXY_LINK = "http://cloud-proxy.cstack-cloud-proxy.svc.cluster.local:8080/"

app = Flask(__name__, static_url_path='/')

client = boto3.client('ecr')

NAMESPACE = os.environ.get("NAMESPACE")
APP_ACCESS_KEY = os.environ.get("APP_ACCESS_KEY")
APP_SECRET_KEY = os.environ.get("APP_SECRET_KEY")

# Validate
if not APP_ACCESS_KEY or len(APP_ACCESS_KEY.strip()) < 16:
    print("Access key not found or does not meet the minimum requirement of 16 characters, creating temporary access key.")
    APP_ACCESS_KEY = result_str = ''.join(random.choice(
        string.ascii_letters) for i in range(16))
    print("Temporary Access Key: " + APP_ACCESS_KEY)
else:
    APP_ACCESS_KEY = APP_ACCESS_KEY.strip()


if not APP_SECRET_KEY or len(APP_SECRET_KEY.strip()) < 32:
    print("Secret key not found or does not meet the minimum requirement of 32 characters, creating temporary secret key.")
    APP_SECRET_KEY = result_str = ''.join(random.choice(
        string.ascii_letters) for i in range(32))
    print("Temporary Secret Key: " + APP_SECRET_KEY)
else:
    APP_SECRET_KEY = APP_SECRET_KEY.strip()


app.config['SECRET_KEY'] = secrets.token_urlsafe(16)
login_manager = LoginManager(app)
login_manager.session_protection = "strong"
login_manager.login_view = "login"

# User class for flask-login


class User():
    def __init__(self, namespace):
        self.namespace = namespace

    def is_authenticated(self):
        return True

    def is_active(self):
        return True

    def get_id(self):
        return self.namespace


@login_manager.user_loader
def load_user(userid):
    return User(NAMESPACE)


# health check by readinessProbe
@app.route('/api/v1.0/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


@app.route('/api/v1.0/<string:registry_id>/repositories', methods=['GET'])
@login_required
def get_tasks(registry_id):
    return get_repositories(registry_id)


@app.route('/api/v1.0/<string:registry_id>/repository/<path:repository_name>', methods=['GET'])
@login_required
def get_task(registry_id, repository_name):
    return list_repository(registry_id, repository_name)


@app.route('/api/v1.0/<string:registry_id>/repository/<path:repository_name>/image', methods=['POST'])
@login_required
def guide_delete(registry_id, repository_name):
    return batch_delete_image(registry_id, repository_name)


@app.route('/static/<path:path>')
def send_template(path):
    return send_from_directory('static/', path)


@app.route('/lib/<path:path>')
def send_library(path):
    return send_from_directory('lib/', path)


@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/login', methods=['POST'])
def login_post():
    accessInput = request.form.get('accessInput')
    secretInput = request.form.get('secretInput')

    # send error message if incorrect credentials
    if not accessInput == APP_ACCESS_KEY or not secretInput == APP_SECRET_KEY:
        flash('Please check your login details and try again.')
        return redirect(url_for('login'))

    login_user(User(NAMESPACE))
    return redirect(url_for('index'))


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/')
@login_required
def index():
    return render_template('index.html')


def get_repositories(registry_id):

    url = CLOUD_PROXY_LINK + 'cstack/aws/ecr/repositories/' + NAMESPACE
    response = urllib.request.urlopen(url)
    data = response.read()
    dict = json.loads(data)

    if not dict["ResourceTagMappingList"]:
        return jsonify({"message": "No repositories found."})

    repositoryNames = []
    for resource in dict["ResourceTagMappingList"]:
        name = resource["ResourceARN"].split("/")
        repositoryNames.append('/'.join(name[1:]))

    paginator = client.get_paginator('describe_repositories')
    page_iterator = paginator.paginate(
        registryId=registry_id, repositoryNames=repositoryNames
    )

    response = {'repositories': []}

    for page in page_iterator:
        response['repositories'].extend(page['repositories'])

    return jsonify(response)


def list_repository(registry_id, repository_name):

    paginator = client.get_paginator('describe_images')
    page_iterator = paginator.paginate(
        registryId=registry_id, repositoryName=repository_name)

    response = {'imageDetails': []}

    for page in page_iterator:
        response['imageDetails'].extend(page['imageDetails'])

    return jsonify(response)


def batch_delete_image(registry_id, repository_name):
    imageDigests = json.loads(request.data)

    response = client.batch_delete_image(
        registryId=registry_id,
        repositoryName=repository_name,
        imageIds=imageDigests
    )

    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True)


# If we are running under gunicorn wire up the flask and gunicorn loggers
if __name__ != '__main__':
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)
