#!/usr/bin/env bash
# Deploy the Aqualign simulation API to AWS using SAM.
# Prereqs: AWS CLI + SAM CLI + Docker. Run once:  ./infra/scripts/deploy-api.sh  (creates resources)
# Rebuild only:                    ./infra/scripts/deploy-api.sh --update
set -euo pipefail
cd "$(dirname "$0")/../.."

STACK_NAME="${STACK_NAME:-aqualign-api}"
REGION="${AWS_REGION:-$(aws configure get region || echo us-east-1)}"
ECR_REPO="aqualign-sim"

echo "==> [1/4] Building container image (this pulls PyTorch — takes a while first time)"
docker build -t "$ECR_REPO:latest" -f api/Dockerfile .

echo "==> [2/4] Creating ECR repo if needed"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
R="$(aws ecr describe-repositories --repository-names $ECR_REPO 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPO --region "$REGION" --image-scanning-configuration scanOnPush=true)"
IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:latest"

echo "==> [3/4] Pushing image to ECR"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
docker tag "$ECR_REPO:latest" "$IMAGE_URI"
docker push "$IMAGE_URI"

echo "==> [4/4] Deploying SAM stack ($STACK_NAME in $REGION)"
if [ "${1:-}" == "--update" ]; then
  sam deploy --stack-name "$STACK_NAME" --region "$REGION" \
    --image-repository "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO" \
    --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset
else
  sam deploy --stack-name "$STACK_NAME" --region "$REGION" \
    --image-repository "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO" \
    --resolve-s3 --guided
fi

echo ""
echo "==> Done. API URL:"
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text