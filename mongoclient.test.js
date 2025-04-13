const { MongoClient, MongoConfiguration, SchemaBuilder, Repository } = require('./mongobuddy');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');


let mongoServer;
let connectionString;
let client;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  connectionString = mongoServer.getUri();
  client = new MongoClient(connectionString);
  await client.connect();
});

afterAll(async () => {
  await client.disconnect();
  await mongoServer.stop();
  await mongoose.disconnect();
});

/**
 * Tests for MongoConfiguration
 */

describe('MongoConfiguration', () => {
  test('should create a configuration with default values', () => {
    const config = new MongoConfiguration();
    expect(config.dbName).toBe('default');
    expect(config.connectionOptions).toHaveProperty('useNewUrlParser', true);
    expect(config.connectionOptions).toHaveProperty('useUnifiedTopology', true);
  });

  test('should create a configuration with custom values', () => {
    const config = new MongoConfiguration('test-db', { retryWrites: true });
    expect(config.dbName).toBe('test-db');
    expect(config.connectionOptions).toHaveProperty('retryWrites', true);
  });

  test('should generate a connection string without credentials', () => {
    const config = new MongoConfiguration('test-db');
    const connStr = config.getConnectionString('testhost', 12345);
    expect(connStr).toBe('mongodb://testhost:12345/test-db');
  });

  test('should generate a connection string with credentials', () => {
    const config = new MongoConfiguration('test-db');
    const connStr = config.getConnectionString('testhost', 12345, 'user', 'pass');
    expect(connStr).toBe('mongodb://user:pass@testhost:12345/test-db');
  });

  test('should generate an Atlas connection string', () => {
    const config = new MongoConfiguration('test-db');
    const connStr = config.getAtlasConnectionString('user', 'pass', 'cluster0.example.mongodb.net');
    expect(connStr).toBe('mongodb+srv://user:pass@cluster0.example.mongodb.net/test-db');
  });

  test('should generate an Atlas connection string with options', () => {
    const config = new MongoConfiguration('test-db');
    const connStr = config.getAtlasConnectionString('user', 'pass', 'cluster0.example.mongodb.net', {
      retryWrites: true,
      w: 'majority'
    });
    expect(connStr).toMatch(/mongodb\+srv:\/\/user:pass@cluster0\.example\.mongodb\.net\/test-db\?/);
    expect(connStr).toMatch(/retryWrites=true/);
    expect(connStr).toMatch(/w=majority/);
  });
});

/**
 * Tests for MongoClient
 */
describe('MongoClient', () => {
  test('should connect to MongoDB', async () => {
    expect(client.isConnected).toBe(true);
  });

  test('should get connection status', () => {
    const status = client.getConnectionStatus();
    expect(status).toHaveProperty('isConnected', true);
    expect(status).toHaveProperty('connectionString');
  });

  test('should create and get a model', () => {
    const testSchema = { name: { type: String } };
    const model = client.createModel('Test', testSchema);
    
    expect(model).toBeDefined();
    expect(client.getModel('Test')).toBe(model);
  });

  test('should return cached model if already exists', () => {
    const testSchema = { name: { type: String } };
    const model1 = client.createModel('TestCache', testSchema);
    const model2 = client.createModel('TestCache', { different: { type: Boolean } });
    
    expect(model1).toBe(model2);
  });

  test('should return null for non-existent model', () => {
    expect(client.getModel('NonExistent')).toBeNull();
  });

  // CRUD operation tests
  describe('CRUD Operations', () => {
    const collectionName = 'test_collection';
    
    beforeEach(async () => {
      // Clear the collection before each test
      const collection = await client.getCollection(collectionName);
      await collection.deleteMany({});
    });

    test('should insert a document', async () => {
      const testDoc = { name: 'Test Document' };
      const result = await client.insertOne(collectionName, testDoc);
      
      expect(result).toHaveProperty('acknowledged', true);
      expect(result).toHaveProperty('insertedId');
    });

    test('should insert multiple documents', async () => {
      const testDocs = [
        { name: 'Test Document 1' },
        { name: 'Test Document 2' }
      ];
      const result = await client.insertMany(collectionName, testDocs);
      
      expect(result).toHaveProperty('acknowledged', true);
      expect(result).toHaveProperty('insertedCount', 2);
    });

    test('should find a document', async () => {
      // Insert a test document
      const testDoc = { name: 'Find Test' };
      const insertResult = await client.insertOne(collectionName, testDoc);
      
      // Find the document
      const foundDoc = await client.findOne(collectionName, { name: 'Find Test' });
      
      expect(foundDoc).toHaveProperty('_id');
      expect(foundDoc).toHaveProperty('name', 'Find Test');
    });

    test('should find multiple documents', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Find Test 1', category: 'A' },
        { name: 'Find Test 2', category: 'A' },
        { name: 'Find Test 3', category: 'B' }
      ]);
      
      // Find documents
      const foundDocs = await client.find(collectionName, { category: 'A' });
      
      expect(Array.isArray(foundDocs)).toBe(true);
      expect(foundDocs.length).toBe(2);
      expect(foundDocs[0]).toHaveProperty('name');
      expect(foundDocs[0].category).toBe('A');
    });

    test('should update a document', async () => {
      // Insert a test document
      const testDoc = { name: 'Update Test', status: 'pending' };
      const insertResult = await client.insertOne(collectionName, testDoc);
      
      // Update the document
      const updateResult = await client.updateOne(
        collectionName,
        { name: 'Update Test' },
        { $set: { status: 'completed' } }
      );
      
      expect(updateResult).toHaveProperty('acknowledged', true);
      expect(updateResult).toHaveProperty('modifiedCount', 1);
      
      // Verify the update
      const updatedDoc = await client.findOne(collectionName, { name: 'Update Test' });
      expect(updatedDoc).toHaveProperty('status', 'completed');
    });

    test('should update multiple documents', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Update Test 1', status: 'pending', category: 'batch' },
        { name: 'Update Test 2', status: 'pending', category: 'batch' },
        { name: 'Update Test 3', status: 'pending', category: 'other' }
      ]);
      
      // Update documents
      const updateResult = await client.updateMany(
        collectionName,
        { category: 'batch' },
        { $set: { status: 'completed' } }
      );
      
      expect(updateResult).toHaveProperty('acknowledged', true);
      expect(updateResult).toHaveProperty('modifiedCount', 2);
      
      // Verify the updates
      const updatedDocs = await client.find(collectionName, { category: 'batch' });
      expect(updatedDocs.length).toBe(2);
      expect(updatedDocs[0]).toHaveProperty('status', 'completed');
      expect(updatedDocs[1]).toHaveProperty('status', 'completed');
      
      // Verify other document wasn't updated
      const otherDoc = await client.findOne(collectionName, { category: 'other' });
      expect(otherDoc).toHaveProperty('status', 'pending');
    });

    test('should delete a document', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Delete Test 1' },
        { name: 'Delete Test 2' }
      ]);
      
      // Delete a document
      const deleteResult = await client.deleteOne(collectionName, { name: 'Delete Test 1' });
      
      expect(deleteResult).toHaveProperty('acknowledged', true);
      expect(deleteResult).toHaveProperty('deletedCount', 1);
      
      // Verify deletion
      const remainingDocs = await client.find(collectionName, {});
      expect(remainingDocs.length).toBe(1);
      expect(remainingDocs[0]).toHaveProperty('name', 'Delete Test 2');
    });

    test('should delete multiple documents', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Delete Test 1', category: 'batch' },
        { name: 'Delete Test 2', category: 'batch' },
        { name: 'Delete Test 3', category: 'keep' }
      ]);
      
      // Delete documents
      const deleteResult = await client.deleteMany(collectionName, { category: 'batch' });
      
      expect(deleteResult).toHaveProperty('acknowledged', true);
      expect(deleteResult).toHaveProperty('deletedCount', 2);
      
      // Verify deletion
      const remainingDocs = await client.find(collectionName, {});
      expect(remainingDocs.length).toBe(1);
      expect(remainingDocs[0]).toHaveProperty('name', 'Delete Test 3');
    });

    test('should count documents', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Count Test 1', category: 'A' },
        { name: 'Count Test 2', category: 'A' },
        { name: 'Count Test 3', category: 'B' }
      ]);
      
      // Count all documents
      const totalCount = await client.countDocuments(collectionName);
      expect(totalCount).toBe(3);
      
      // Count filtered documents
      const filteredCount = await client.countDocuments(collectionName, { category: 'A' });
      expect(filteredCount).toBe(2);
    });

    test('should perform aggregation', async () => {
      // Insert test documents
      await client.insertMany(collectionName, [
        { name: 'Agg Test 1', category: 'A', value: 10 },
        { name: 'Agg Test 2', category: 'A', value: 20 },
        { name: 'Agg Test 3', category: 'B', value: 30 }
      ]);
      
      // Perform aggregation
      const result = await client.aggregate(collectionName, [
        { $match: { category: 'A' } },
        { $group: { _id: '$category', total: { $sum: '$value' } } }
      ]);
      
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('_id', 'A');
      expect(result[0]).toHaveProperty('total', 30);
    });
  });
});

/**
 * Tests for SchemaBuilder
 */
describe('SchemaBuilder', () => {
  test('should create a schema builder with default options', () => {
    const builder = new SchemaBuilder();
    const { definition, options } = builder.build();
    
    expect(definition).toEqual({});
    expect(options).toHaveProperty('timestamps', true);
    expect(options).toHaveProperty('versionKey', false);
  });

  test('should add string field', () => {
    const builder = new SchemaBuilder();
    builder.addString('name', { required: true });
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('name');
    expect(definition.name).toHaveProperty('type', String);
    expect(definition.name).toHaveProperty('required', true);
  });

  test('should add number field', () => {
    const builder = new SchemaBuilder();
    builder.addNumber('age', { min: 0 });
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('age');
    expect(definition.age).toHaveProperty('type', Number);
    expect(definition.age).toHaveProperty('min', 0);
  });

  test('should add boolean field', () => {
    const builder = new SchemaBuilder();
    builder.addBoolean('active', { default: true });
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('active');
    expect(definition.active).toHaveProperty('type', Boolean);
    expect(definition.active).toHaveProperty('default', true);
  });

  test('should add date field', () => {
    const builder = new SchemaBuilder();
    builder.addDate('createdAt');
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('createdAt');
    expect(definition.createdAt).toHaveProperty('type', Date);
  });

  test('should add object ID field', () => {
    const builder = new SchemaBuilder();
    builder.addObjectId('userId', { ref: 'User' });
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('userId');
    expect(definition.userId).toHaveProperty('type', mongoose.Schema.Types.ObjectId);
    expect(definition.userId).toHaveProperty('ref', 'User');
  });

  test('should add array field', () => {
    const builder = new SchemaBuilder();
    builder.addArray('tags', String);
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('tags');
    expect(Array.isArray(definition.tags)).toBe(true);
    expect(definition.tags[0]).toHaveProperty('type', String);
  });

  test('should add object field', () => {
    const builder = new SchemaBuilder();
    const addressSchema = {
      street: { type: String },
      city: { type: String }
    };
    builder.addObject('address', addressSchema);
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('address');
    expect(definition.address).toHaveProperty('type', addressSchema);
  });

  test('should configure timestamps', () => {
    const builder = new SchemaBuilder();
    builder.withTimestamps(false);
    
    const { options } = builder.build();
    expect(options).toHaveProperty('timestamps', false);
  });

  test('should set custom options', () => {
    const builder = new SchemaBuilder();
    builder.withOptions({ collection: 'custom_collection', strict: false });
    
    const { options } = builder.build();
    expect(options).toHaveProperty('collection', 'custom_collection');
    expect(options).toHaveProperty('strict', false);
  });

  test('should create a model', () => {
    const builder = new SchemaBuilder();
    builder.addString('name');
    
    // Mock client.createModel
    const mockClient = {
      createModel: jest.fn().mockReturnValue({ name: 'MockModel' })
    };
    
    const model = builder.createModel('TestModel', mockClient);
    
    expect(mockClient.createModel).toHaveBeenCalledWith(
      'TestModel',
      expect.any(Object),
      expect.any(Object)
    );
    expect(model).toEqual({ name: 'MockModel' });
  });

  test('should chain methods', () => {
    const builder = new SchemaBuilder();
    const result = builder
      .addString('name')
      .addNumber('age')
      .addBoolean('active')
      .withTimestamps();
    
    expect(result).toBe(builder);
    
    const { definition } = builder.build();
    expect(definition).toHaveProperty('name');
    expect(definition).toHaveProperty('age');
    expect(definition).toHaveProperty('active');
  });
});

/**
 * Tests for Repository
 */
describe('Repository', () => {
  const collectionName = 'test_repository';
  let repository;
  
  beforeEach(async () => {
    // Create a new repository for each test
    repository = new Repository(client, collectionName);
    
    // Clear the collection
    const collection = await client.getCollection(collectionName);
    await collection.deleteMany({});
  });

  test('should create a repository instance', () => {
    expect(repository).toHaveProperty('client', client);
    expect(repository).toHaveProperty('collectionName', collectionName);
  });

  test('should create a document', async () => {
    const testDoc = { name: 'Repo Test' };
    const result = await repository.create(testDoc);
    
    expect(result).toHaveProperty('acknowledged', true);
    expect(result).toHaveProperty('insertedId');
  });

  test('should create multiple documents', async () => {
    const testDocs = [
      { name: 'Repo Test 1' },
      { name: 'Repo Test 2' }
    ];
    const result = await repository.createMany(testDocs);
    
    expect(result).toHaveProperty('acknowledged', true);
    expect(result).toHaveProperty('insertedCount', 2);
  });

  test('should find a document by ID', async () => {
    // Create a test document
    const testDoc = { name: 'Repo Find Test' };
    const createResult = await repository.create(testDoc);
    const id = createResult.insertedId;
    
    // Find by ID
    const foundDoc = await repository.findById(id);
    
    expect(foundDoc).toHaveProperty('_id');
    expect(foundDoc._id.toString()).toBe(id.toString());
    expect(foundDoc).toHaveProperty('name', 'Repo Find Test');
  });

  test('should find a document by criteria', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Find Test 1', category: 'A' },
      { name: 'Repo Find Test 2', category: 'B' }
    ]);
    
    // Find by criteria
    const foundDoc = await repository.findOne({ category: 'B' });
    
    expect(foundDoc).toHaveProperty('name', 'Repo Find Test 2');
  });

  test('should find multiple documents', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Find Test 1', category: 'A' },
      { name: 'Repo Find Test 2', category: 'A' },
      { name: 'Repo Find Test 3', category: 'B' }
    ]);
    
    // Find documents
    const foundDocs = await repository.find({ category: 'A' });
    
    expect(Array.isArray(foundDocs)).toBe(true);
    expect(foundDocs.length).toBe(2);
    expect(foundDocs[0]).toHaveProperty('category', 'A');
  });

  test('should update a document by ID', async () => {
    // Create a test document
    const testDoc = { name: 'Repo Update Test', status: 'pending' };
    const createResult = await repository.create(testDoc);
    const id = createResult.insertedId;
    
    // Update by ID
    const updateResult = await repository.updateById(id, { status: 'completed' });
    
    expect(updateResult).toHaveProperty('acknowledged', true);
    expect(updateResult).toHaveProperty('modifiedCount', 1);
    
    // Verify update
    const updatedDoc = await repository.findById(id);
    expect(updatedDoc).toHaveProperty('status', 'completed');
    expect(updatedDoc).toHaveProperty('updatedAt');
  });

  test('should update documents by criteria', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Update Test 1', status: 'pending', category: 'batch' },
      { name: 'Repo Update Test 2', status: 'pending', category: 'batch' },
      { name: 'Repo Update Test 3', status: 'pending', category: 'other' }
    ]);
    
    // Update by criteria
    const updateResult = await repository.update(
      { category: 'batch' },
      { status: 'completed' }
    );
    
    expect(updateResult).toHaveProperty('acknowledged', true);
    expect(updateResult).toHaveProperty('modifiedCount', 2);
    
    // Verify updates
    const updatedDocs = await repository.find({ category: 'batch' });
    expect(updatedDocs.length).toBe(2);
    expect(updatedDocs[0]).toHaveProperty('status', 'completed');
    expect(updatedDocs[1]).toHaveProperty('status', 'completed');
  });

  test('should delete a document by ID', async () => {
    // Create a test document
    const testDoc = { name: 'Repo Delete Test' };
    const createResult = await repository.create(testDoc);
    const id = createResult.insertedId;
    
    // Delete by ID
    const deleteResult = await repository.deleteById(id);
    
    expect(deleteResult).toHaveProperty('acknowledged', true);
    expect(deleteResult).toHaveProperty('deletedCount', 1);
    
    // Verify deletion
    const foundDoc = await repository.findById(id);
    expect(foundDoc).toBeNull();
  });

  test('should delete documents by criteria', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Delete Test 1', category: 'delete' },
      { name: 'Repo Delete Test 2', category: 'delete' },
      { name: 'Repo Delete Test 3', category: 'keep' }
    ]);
    
    // Delete by criteria
    const deleteResult = await repository.delete({ category: 'delete' });
    
    expect(deleteResult).toHaveProperty('acknowledged', true);
    expect(deleteResult).toHaveProperty('deletedCount', 2);
    
    // Verify deletion
    const remainingDocs = await repository.find();
    expect(remainingDocs.length).toBe(1);
    expect(remainingDocs[0]).toHaveProperty('category', 'keep');
  });

  test('should count documents', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Count Test 1', category: 'A' },
      { name: 'Repo Count Test 2', category: 'A' },
      { name: 'Repo Count Test 3', category: 'B' }
    ]);
    
    // Count all documents
    const totalCount = await repository.count();
    expect(totalCount).toBe(3);
    
    // Count filtered documents
    const filteredCount = await repository.count({ category: 'A' });
    expect(filteredCount).toBe(2);
  });

  test('should perform aggregation', async () => {
    // Create test documents
    await repository.createMany([
      { name: 'Repo Agg Test 1', category: 'A', value: 10 },
      { name: 'Repo Agg Test 2', category: 'A', value: 20 },
      { name: 'Repo Agg Test 3', category: 'B', value: 30 }
    ]);
    
    // Perform aggregation
    const result = await repository.aggregate([
      { $match: { category: 'A' } },
      { $group: { _id: '$category', total: { $sum: '$value' } } }
    ]);
    
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('_id', 'A');
    expect(result[0]).toHaveProperty('total', 30);
  });
});
