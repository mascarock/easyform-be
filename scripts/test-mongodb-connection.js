#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * 
 * This script tests the MongoDB connection using the MONGODB_URI from environment variables
 * and verifies that the application can successfully connect to and perform operations on the database.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: ['.env.local', '.env'] });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easyform';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'easyform';

console.log('🔍 MongoDB Connection Test');
console.log('========================');
console.log(`URI: ${MONGODB_URI}`);
console.log(`Database: ${DATABASE_NAME}`);
console.log('');

async function testMongoDBConnection() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Ready State: ${mongoose.connection.readyState} (1 = Connected)`);
    console.log('');
    
    // Test basic database operations
    console.log('🧪 Testing database operations...');
    
    const testCollection = mongoose.connection.db.collection('connection_test');
    
    // Test 1: Insert a document
    console.log('   📝 Testing document insertion...');
    const insertResult = await testCollection.insertOne({
      test: 'connection_test',
      timestamp: new Date(),
      data: {
        message: 'Hello from EasyForm!',
        version: '1.0.0',
      },
    });
    console.log(`   ✅ Document inserted with ID: ${insertResult.insertedId}`);
    
    // Test 2: Find the document
    console.log('   🔍 Testing document retrieval...');
    const foundDoc = await testCollection.findOne({
      _id: insertResult.insertedId,
    });
    console.log(`   ✅ Document found: ${foundDoc ? 'Yes' : 'No'}`);
    if (foundDoc) {
      console.log(`   📄 Document data: ${JSON.stringify(foundDoc.data, null, 2)}`);
    }
    
    // Test 3: Update the document
    console.log('   ✏️  Testing document update...');
    const updateResult = await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true, updateTime: new Date() } }
    );
    console.log(`   ✅ Document updated: ${updateResult.modifiedCount > 0 ? 'Yes' : 'No'}`);
    
    // Test 4: Test aggregation
    console.log('   📊 Testing aggregation pipeline...');
    const aggregationResult = await testCollection.aggregate([
      { $match: { test: 'connection_test' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]).toArray();
    console.log(`   ✅ Aggregation result: ${aggregationResult[0]?.count || 0} documents`);
    
    // Test 5: Test form submission schema
    console.log('   📋 Testing form submission schema...');
    const formSubmissionCollection = mongoose.connection.db.collection('formsubmissions');
    
    const testFormSubmission = {
      formId: 'test-form-123',
      questions: [
        {
          id: 'name',
          type: 'text',
          title: 'What is your name?',
          required: true,
        },
        {
          id: 'email',
          type: 'email',
          title: 'What is your email?',
          required: true,
        },
      ],
      answers: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      userEmail: 'john@example.com',
      submittedAt: new Date(),
      metadata: {
        version: '1.0.0',
        source: 'easyform-frontend',
      },
    };
    
    const formInsertResult = await formSubmissionCollection.insertOne(testFormSubmission);
    console.log(`   ✅ Form submission inserted with ID: ${formInsertResult.insertedId}`);
    
    // Test 6: Query form submissions
    const formQueryResult = await formSubmissionCollection.find({
      formId: 'test-form-123',
    }).toArray();
    console.log(`   ✅ Found ${formQueryResult.length} form submissions`);
    
    // Test 7: Test indexes
    console.log('   🗂️  Testing database indexes...');
    const indexes = await formSubmissionCollection.indexes();
    console.log(`   ✅ Found ${indexes.length} indexes on formsubmissions collection`);
    indexes.forEach((index, i) => {
      console.log(`      ${i + 1}. ${JSON.stringify(index.key)}`);
    });
    
    // Clean up test data
    console.log('   🧹 Cleaning up test data...');
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    await formSubmissionCollection.deleteOne({ _id: formInsertResult.insertedId });
    console.log('   ✅ Test data cleaned up');
    
    console.log('');
    console.log('🎉 All tests passed! MongoDB connection is working correctly.');
    console.log('');
    console.log('📊 Connection Summary:');
    console.log(`   • Connection State: ${getConnectionState(mongoose.connection.readyState)}`);
    console.log(`   • Database Name: ${mongoose.connection.name}`);
    console.log(`   • Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    console.log(`   • Collections: ${(await mongoose.connection.db.listCollections().toArray()).length} found`);
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed!');
    console.error('');
    console.error('Error Details:');
    console.error(`   Type: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error('');
    console.error('Troubleshooting:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Check if the MONGODB_URI is correct');
    console.error('   3. Verify network connectivity to MongoDB');
    console.error('   4. Check MongoDB authentication if required');
    console.error('');
    process.exit(1);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

function getConnectionState(state) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[state] || 'Unknown';
}

// Run the test
testMongoDBConnection()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
