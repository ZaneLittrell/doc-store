import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

const addDocument = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello poster', 
        }),
    };
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
            output += body.read();
        });
        body.on('end', () => {
            resolve(output);
        });
        body.on('error', () => {
            reject('Error occurred');
        });
    });
}
