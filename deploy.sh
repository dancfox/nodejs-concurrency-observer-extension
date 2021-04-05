cd nodejs-concurrency-extension
chmod +x index.js
npm install
cd ..

chmod +x extensions/nodejs-concurrency-extension
zip -r extension.zip .

aws lambda publish-layer-version \
 --layer-name "nodejs-concurrency-extension" \
 --region us-east-1 \
 --zip-file  "fileb://extension.zip"
