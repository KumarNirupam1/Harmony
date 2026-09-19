#!/usr/bin/env bash
# Deploy the Aqualign simulation API to AWS using SAM.
# Prereqs: AWS CLI + SAM CLI + Docker. Run once:  ./infra/scripts/deploy-api.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

STACK_NAME="${STACK_NAME:-aqualign-api}"
REGION="${AWS_REGION:-$(aws configure get region || echo us-east-1)}"

echo "==> [1/3] sam build (container image via api/Dockerfile — first build pulls PyTorch, takes a while)"
sam build --use-container

echo "==> [2/3] sam deploy ($STACK_NAME in $REGION)"
sam deploy --stack-name "$STACK_NAME" --region "$REGION" \
  --resolve-image-repos --resolve-s3 \
  --no-confirm-changeset --capabilities CAPABILITY_IAM

echo ""
echo "==> [3/3] Done. API URL:"
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text