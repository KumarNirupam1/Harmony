# syntax=docker/dockerfile:1
# Harmony API — runs as an AWS Lambda container image via the Lambda Web Adapter.
# Build from repo root so the ocean dataset can ship inside the image:
#   docker build -t harmony-api -f api/Dockerfile .
# Run locally (Build It / open-source path):
#   docker run -p 9000:9000 harmony-api
#
# References:
#   https://github.com/awslabs/aws-lambda-web-adapter
#   https://docs.aws.amazon.com/lambda/latest/dg/images-create.html

# ---- step 1: Lambda Web Adapter ----
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS adapter

# ---- step 2: runtime ----
# Plain Python image (NOT public.ecr.aws/lambda/python:*): the AWS base image
# forces a Lambda handler as CMD's first arg and conflicts with LWA. LWA talks
# to the Runtime API itself, so any HTTP server image works.
FROM python:3.12

COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /var/task

COPY api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api/harmony ./harmony
COPY api/app ./app

# Ocean field dataset (also mirrored to S3 in production).
COPY data/gulf_stream.npz ./data/gulf_stream.npz

# Lambda Web Adapter starts uvicorn on PORT 8080.
ENV PORT=8080
ENV AWS_LWA_ENABLE_COMPRESSION=false

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]