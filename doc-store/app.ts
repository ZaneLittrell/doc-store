import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/** S3 client object. */
const client = new S3Client({});

const S3_BUCKET = 'doc-store-documents';
const S3_KEY = 'list.txt';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'GET') {
        return await getDocument(event);
    } else if (event.httpMethod === 'POST') {
        return await addDocument(event);
    }
    return {
        statusCode: 500,
        body: JSON.stringify({
            message: 'some error happened',
        }),
    };
};

/**
 * Get document from S3 bucket.
 */
const getDocument = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const input = {
            'Bucket': S3_BUCKET,
            'Key': S3_KEY,
        };
        const command = new GetObjectCommand(input);
        const response = await client.send(command);
        if (response != null) {
            const bodyStr = await readBody(response.Body);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    length: response.ContentLength,
                    type: response.ContentType,
                    message: bodyStr
                }),
            };
        }
        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'File does not exist in bucket.'
            }),
        };
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal error occurred, check logs.',
            }),
        };
    }
}

/**
 * Add new line to the existing document.
 */
const addDocument = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { body } = event;
    // TODO Validate body with JSON schema
    try {
        const input = {
            Bucket: S3_BUCKET,
            Key: S3_KEY,
            ContentType: 'text/plain',
        };
        const command = new GetObjectCommand(input);
        const response = await client.send(command);
        if (response == null) {
            throw new Error('No file found in bucket');
        }
        let bodyStr = await readBody(response.Body);
        // Append body to the file
        bodyStr = `${bodyStr}${body}\n`;
        const putInput = {
            Bucket: S3_BUCKET,
            Key: S3_KEY,
            Body: bodyStr,
        };
        const putCommand = new PutObjectCommand(putInput);
        await client.send(putCommand);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Appended ${body} to the file.`,
            }),
        };
    } catch(e) {
        console.error(e);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal error occurred, check logs.',
            }),
        };
    }
}

/**
 * Read the contents of the body from S3 into a string.
 *
 * @param body {Readable} Readable stream from the S3 object.
 * @returns Promise resolving into a string.
 */
const readBody = async (body: Readable): Promise<string> => {
    return new Promise((resolve, reject) => {
        let output = '';
        body.on('readable', () => {
            const chunk = body.read();
            if (chunk != null) {
                output += chunk;
            }
        });
        body.on('end', () => {
            resolve(output);
        });
        body.on('error', () => {
            reject('Error occurred');
        });
    });
}
