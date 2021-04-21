# nodejs-concurrency-observer-extension

The provided code sample is an extension that puts a custom metric into Cloudwatch at init and at shutdown. The purpose of the extension is to measure the number of execution environments that have been initialized by the Lambda service. I wrote it to see how many execution environments actually get initialized through Provisioned Concurrency. 

Answer to my question: PC actually initializes double the number of execution environments requested up to 500 requested (1000 actual) environments. After that the ratio diminishes.

| Requested Provisioned Concurrency	| Actual Provisioned Concurrency (Average of 10 scale outs, IAD) |
|-----------------------------------|--------------------------------------------------------------- |
| 500	                              | 1000                                                           |
| 1000	                             | 1566                                                           |
| 3000	                             | 3686                                                           |
| 4500	                             | 4989                                                           |
	
> Note: This extension requires the Node.js 12 runtime to be present in the Lambda execution environment of your function.

There are two components to this sample:
* `extensions/`: This sub-directory should be extracted to /opt/extensions where the Lambda platform will scan for executables to launch extensions
* `nodejs-concurrency-extension/`: This sub-directory should be extracted to /opt/nodejs-concurrency-extension which is referenced by the `extensions/nodejs-concurrency-extension` executable and includes a nodejs executable along with all of its necessary dependencies.

## Prep Extension Dependencies
Install the extension dependencies locally, which will be mounted along with the extension code.

```bash
$ cd nodejs-concurrency-extension
$ chmod +x index.js
$ npm install
$ cd ..
```

## Layer Setup Process
The extensions .zip file should contain a root directory called `extensions/`, where the extension executables are located and another root directory called `nodejs-concurrency-extension/`, where the core logic of the extension and its dependencies are located.

Creating zip package for the extension:
```bash
$ chmod +x extensions/nodejs-concurrency-extension
$ zip -r extension.zip .
```

Ensure that you have aws-cli v2 for the commands below.
Publish a new layer using the `extension.zip`. The output of the following command should provide you a layer arn.
```bash
aws lambda publish-layer-version \
 --layer-name "nodejs-concurrency-extension" \
 --region <use your region> \
 --zip-file  "fileb://extension.zip"
```
Note the LayerVersionArn that is produced in the output.
eg. `"LayerVersionArn": "arn:aws:lambda:<region>:123456789012:layer:<layerName>:1"`

Add the newly created layer version to a Node.js 12 runtime Lambda function.

**All these instructions were arranged together for convenience in `deploy.sh`**


## Permissions

This extension requires the `cloudwatch:PutMetricData` permission. Example SAM template snippet:

```
    Policies:
    - CloudWatchPutMetricPolicy: {}
```

## Function Invocation and Extension Execution

When invoking the function, you should now see log messages from the concurrency extension similar to the following:
```
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    EXTENSION Name: nodejs-concurrency-extension State: Ready Events: [INVOKE,SHUTDOWN]
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    START RequestId: 9ca08945-de9b-46ec-adc6-3fe9ef0d2e8d Version: $LATEST
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    nodejs-concurrency-extension launching extension
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    [nodejs-concurrency-extension] Registering...
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    [nodejs-concurrency-extension] Registered with ID: 6ec8756c-4830-458b-9dda-156e5dda1cc1
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    [nodejs-concurrency-extension] Waiting for event...
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    [nodejs-concurrency-extension] Received event: {"eventType": "INVOKE", "deadlineMs": 1596217195507, "requestId": "c6702194-cf88-4407-9040-4d524ce0af3b", "invokedFunctionArn": "", "tracing": {"type": "X-Amzn-Trace-Id", "value": ""}}
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    [nodejs-concurrency-extension] Waiting for event...
    ...
    ...
    Function logs...
    ...
    ...
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    END RequestId: 9ca08945-de9b-46ec-adc6-3fe9ef0d2e8d
    XXXX-XX-XXTXX:XX:XX.XXX-XX:XX    REPORT RequestId: 9ca08945-de9b-46ec-adc6-3fe9ef0d2e8d Duration: 80.36 ms Billed Duration: 100 ms Memory Size: 128 MB Max Memory Used: 67 MB Init Duration: 297.83 ms
```
