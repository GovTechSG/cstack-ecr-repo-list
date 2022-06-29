# Introduction

This application is built on top of [rk295/ecr-repo-list](https://github.com/rk295/ecr-repo-list), which was primarily written to allow people to view the list of different types of containers held in their registry and what tags there are for a given container.

In CStack, our users, tenants, CI pipeline images is stored in CStack image registry (AWS ECR) which tenants do not have access to. Thus they require a way to manage, view and cleanup images they do not want or are not in use anymore. Thus, an interface is developed where tenants can fork and spin up by themselves within their namespaces with access to their images.

We used ecr-repo-list as a base and added additional features on top of the existing features it have such as:

1. Deleting images
2. Authentication
3. Search repos by name
4. Sorting & search images within all columns

# Getting Started

Some basic set up steps are required to run the application.

## Soft Pre-Requisites

1. Some knowledge of Git
2. Some knowledge of GitLab
3. Some knowledge of building containers from Dockerfiles
4. A general understanding of Docker in general

## Hard Pre-Requisites

1. You must be onboarded on our Container Stack clusters
2. You must have namespaces provisioned for you

## Steps

1. Fork cstack-image-manager repository into your namespace repo, if you are unsure if your namespace is provisioned, contact a CSTACK admin.
2. Grab the latest image of the application and update in the deployment in cstack-manifests repo.
3. Set up your access and secret keys via Sealed Secrets as instructed [here](https://docs.developer.tech.gov.sg/docs/container-stack-user-guide/#/configuration/sealed-secrets/). Use the variables 'APP_ACCESS_KEY' and 'APP_SECRET_KEY'. Do use the files in cstack-manifests repo for reference. Your access and secret keys must be at least 16 and 32 characters long respectively. If it does not meet the requirements, temporary credentials will be created. You may retrieve the temporary credentials through the ArgoCD application logs.
4. Retrieve and update the manifests accordingly from the cstack-manifest repository. Ensure that the placeholder parameters are replaced with valid parameters. For this application, as the images are the same irregardless of the app being deployed in dev, stg and prd environments, we only deploy it in dev for developers to manage the images to limit the access.
5. After doing all of the above, test the application by accessing it via the Ingress link you set up for this application.
