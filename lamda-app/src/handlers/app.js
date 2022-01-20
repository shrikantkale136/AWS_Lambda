const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = process.env.SAMPLE_TABLE;
const featurePath = "/feature/customer";
exports.customerHandler = async function(event) {
  switch(true) {
    // case event.httpMethod === 'GET' && event.path === featurePath:
    //   console.log('Get Cust: ', event);
    //   response = await getCustomer(event.queryStringParameters.custid);
    //   break;
    case event.httpMethod === 'GET' && event.path === featurePath:
      response = await getAllCustomers();
      break;
    case event.httpMethod === 'PUT' && event.path === featurePath:
      const requestBody = JSON.parse(event.body);
      response = await modifyCustomer(requestBody.custid, requestBody.updateKey, requestBody.updateValue);
      break;
    default:
      response = buildResponse(404, '404 Not Found');
  }
  return response;
}

async function getCustomer(custid) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'custid': custid
    }
  }
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error(`Get Customer ${custid} Error: `, error);
  });
}

async function getAllCustomers() {
  const params = {
    TableName: dynamodbTableName
  }
  const customerData = await scanDynamoRecords(params, []);
  const body = {
    data: customerData
  }
  return buildResponse(200, body);
}

async function modifyCustomer(custId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'custid': custId
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESSFULLY UPDATED',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  })
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  }
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}