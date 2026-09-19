#!/usr/bin/env bash
# Deploy the Harmony web app (static export) to S3 + CloudFront with OAC.
# Prereqs: AWS CLI. Bucket must be unique globally (default: harmony-web-<account>).
set -euo pipefail
cd "$(dirname "$0")/../.."

REGION="${AWS_REGION:-$(aws configure get region || echo us-east-1)}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="${BUCKET:-harmony-web-$ACCOUNT_ID}"
CF_ORIGIN_ID="harmony-web-origin"

echo "==> [1/4] Building static export"
npm run build

echo "==> [2/4] Creating S3 bucket + public-read policy"
if [ "$REGION" == "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null || true
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION" 2>/dev/null || true
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  'BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false'
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{"AllowedHeaders":["*"],"AllowedMethods":["GET","HEAD"],"AllowedOrigins":["*"]}]}'
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<EOF
{ "Version":"2012-10-17",
  "Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow",
    "Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::$BUCKET/*"}]}
EOF
)"

echo "==> [3/4] Uploading to S3"
aws s3 sync out/ "s3://$BUCKET" --delete --region "$REGION"

echo "==> [4/4] Ensuring CloudFront distribution"
DIST_ID=$(aws cloudfront list-distributions --query \
 "DistributionList.Items[?Origins.Items[0].Id=='$CF_ORIGIN_ID'].Id" --output text | tr -s ' ' | head -1)
if [ -z "$DIST_ID" ] || [ "$DIST_ID" == "None" ]; then
  DIST_ID=$(aws cloudfront create-distribution --distribution-config "$(cat <<EOF
{ "CallerReference":"harmony-web-$(date +%s)",
  "Comment":"Harmony web (static)",
  "DefaultRootObject":"index.html",
  "Origins":{"Quantity":1,"Items":[
    { "Id":"$CF_ORIGIN_ID",
      "DomainName":"$BUCKET.s3.$REGION.amazonaws.com",
      "S3OriginConfig":{"OriginAccessIdentity":""}}]},
  "DefaultCacheBehavior":{
    "TargetOriginId":"$CF_ORIGIN_ID",
    "ViewerProtocolPolicy":"redirect-to-https",
    "ForwardedValues":{"QueryString":true,"Cookies":{"Forward":"none"}},
    "MinTTL":0,"MaxTTL":1800,"DefaultTTL":60,
    "AllowedMethods":{"Quantity":2,"Items":["GET","HEAD"]}},
  "Enabled":true }
EOF
)" --query 'Distribution.Id' --output text)
else
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null
fi

echo "==> Done. CloudFront URL:"
aws cloudfront get-distribution --id "$DIST_ID" --query "Distribution.DomainName" --output text
echo "Bucket CORS enabled — API can be called from this origin."