/**
 * Generic MongoDB Client and Configuration
 * A flexible MongoDB client implementation with schema builder methods
 */

const mongoose = require('mongoose');

/**
 * MongoDB Configuration class
 * Handles connection settings and string generation
 */
class MongoConfiguration {
    /**
     * Create a new MongoDB configuration
     * @param {string} dbName - Database name
     * @param {Object} connectionOptions - Mongoose connection options
     */
    constructor(dbName = 'default', connectionOptions = {}) {
        this.dbName = dbName;
        this.connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            ...connectionOptions
        };
    }

    /**
     * Generate a MongoDB connection string
     * @param {string} host - MongoDB host
     * @param {number} port - MongoDB port
     * @param {string} username - MongoDB username (optional)
     * @param {string} password - MongoDB password (optional)
     * @returns {string} MongoDB connection string
     */
    getConnectionString(host = 'localhost', port = 27017, username = '', password = '') {
        if (username && password) {
            return `mongodb://${username}:${password}@${host}:${port}/${this.dbName}`;
        }
        return `mongodb://${host}:${port}/${this.dbName}`;
    }

    /**
     * Generate a MongoDB Atlas connection string
     * @param {string} username - MongoDB Atlas username
     * @param {string} password - MongoDB Atlas password
     * @param {string} cluster - MongoDB Atlas cluster address
     * @param {Object} options - Connection string options
     * @returns {string} MongoDB Atlas connection string
     */
    getAtlasConnectionString(username, password, cluster, options = {}) {
        const optionsStr = Object.entries(options)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        return `mongodb+srv://${username}:${password}@${cluster}/${this.dbName}${optionsStr ? `?${optionsStr}` : ''}`;
    }
}

/**
 * MongoDB Client class
 * Handles database connections and operations
 */
class MongoClient {
    /**
     * Create a new MongoDB client
     * @param {string} connStr - MongoDB connection string
     */
    constructor(connStr) {
        this.connStr = connStr;
        this.isConnected = false;
        this.models = new Map();
    }

    /**
     * Connect to MongoDB
     * @returns {Promise<boolean>} Connection success
     */
    async connect() {
        try {
            await mongoose.connect(this.connStr, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            this.isConnected = true;
            console.log('Connected to MongoDB');
            return true;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Disconnect from MongoDB
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('Disconnected from MongoDB');
        }
    }

    /**
     * Get connection status
     * @returns {Object} Connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            connectionString: this.connStr.replace(/\/\/(.+?)@/, '//***@') // Hide credentials in logs
        };
    }

    /**
     * Get a MongoDB collection
     * @param {string} collectionName - Collection name
     * @returns {Promise<Collection>} MongoDB collection
     */
    async getCollection(collectionName) {
        if (!this.isConnected) {
            await this.connect();
        }
        return mongoose.connection.db.collection(collectionName);
    }

    /**
     * Create a Mongoose model from a schema
     * @param {string} modelName - Model name
     * @param {Object} schemaDefinition - Schema definition
     * @param {Object} options - Schema options
     * @returns {Model} Mongoose model
     */
    createModel(modelName, schemaDefinition, options = {}) {
        if (this.models.has(modelName)) {
            return this.models.get(modelName);
        }
        
        const schema = new mongoose.Schema(schemaDefinition, options);
        const model = mongoose.model(modelName, schema);
        this.models.set(modelName, model);
        
        return model;
    }

    /**
     * Get a Mongoose model
     * @param {string} modelName - Model name
     * @returns {Model|null} Mongoose model or null if not found
     */
    getModel(modelName) {
        return this.models.get(modelName) || null;
    }

    /**
     * Insert a single document
     * @param {string} collectionName - Collection name
     * @param {Object} data - Document to insert
     * @returns {Promise<Object>} Insert result
     */
    async insertOne(collectionName, data) {
        const collection = await this.getCollection(collectionName);
        return await collection.insertOne(data);
    }

    /**
     * Insert multiple documents
     * @param {string} collectionName - Collection name
     * @param {Array} data - Documents to insert
     * @returns {Promise<Object>} Insert result
     */
    async insertMany(collectionName, data) {
        const collection = await this.getCollection(collectionName);
        return await collection.insertMany(data);
    }

    /**
     * Find a single document
     * @param {string} collectionName - Collection name
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Found document or null
     */
    async findOne(collectionName, query, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.findOne(query, options);
    }

    /**
     * Find multiple documents
     * @param {string} collectionName - Collection name
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of documents
     */
    async find(collectionName, query = {}, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.find(query, options).toArray();
    }

    /**
     * Update a single document
     * @param {string} collectionName - Collection name
     * @param {Object} filter - Filter criteria
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Promise<Object>} Update result
     */
    async updateOne(collectionName, filter, update, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.updateOne(filter, update, options);
    }

    /**
     * Update multiple documents
     * @param {string} collectionName - Collection name
     * @param {Object} filter - Filter criteria
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Promise<Object>} Update result
     */
    async updateMany(collectionName, filter, update, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.updateMany(filter, update, options);
    }

    /**
     * Delete a single document
     * @param {string} collectionName - Collection name
     * @param {Object} filter - Filter criteria
     * @param {Object} options - Delete options
     * @returns {Promise<Object>} Delete result
     */
    async deleteOne(collectionName, filter, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.deleteOne(filter, options);
    }

    /**
     * Delete multiple documents
     * @param {string} collectionName - Collection name
     * @param {Object} filter - Filter criteria
     * @param {Object} options - Delete options
     * @returns {Promise<Object>} Delete result
     */
    async deleteMany(collectionName, filter, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.deleteMany(filter, options);
    }

    /**
     * Count documents in a collection
     * @param {string} collectionName - Collection name
     * @param {Object} filter - Filter criteria
     * @param {Object} options - Count options
     * @returns {Promise<number>} Document count
     */
    async countDocuments(collectionName, filter = {}, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.countDocuments(filter, options);
    }

    /**
     * Perform an aggregation pipeline
     * @param {string} collectionName - Collection name
     * @param {Array} pipeline - Aggregation pipeline
     * @param {Object} options - Aggregation options
     * @returns {Promise<Array>} Aggregation results
     */
    async aggregate(collectionName, pipeline, options = {}) {
        const collection = await this.getCollection(collectionName);
        return await collection.aggregate(pipeline, options).toArray();
    }
}

/**
 * Schema Builder class
 * Provides helper methods for creating MongoDB schemas
 */
class SchemaBuilder {
    constructor() {
        this.schemaDefinition = {};
        this.schemaOptions = {
            timestamps: true,
            versionKey: false
        };
    }

    /**
     * Add a string field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addString(fieldName, options = {}) {
        this.schemaDefinition[fieldName] = { type: String, ...options };
        return this;
    }

    /**
     * Add a number field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addNumber(fieldName, options = {}) {
        this.schemaDefinition[fieldName] = { type: Number, ...options };
        return this;
    }

    /**
     * Add a boolean field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addBoolean(fieldName, options = {}) {
        this.schemaDefinition[fieldName] = { type: Boolean, ...options };
        return this;
    }

    /**
     * Add a date field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addDate(fieldName, options = {}) {
        this.schemaDefinition[fieldName] = { type: Date, ...options };
        return this;
    }

    /**
     * Add an object ID field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addObjectId(fieldName, options = {}) {
        this.schemaDefinition[fieldName] = { type: mongoose.Schema.Types.ObjectId, ...options };
        return this;
    }

    /**
     * Add an array field to the schema
     * @param {string} fieldName - Field name
     * @param {Object|Array} type - Array type definition
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addArray(fieldName, type, options = {}) {
        this.schemaDefinition[fieldName] = [{ type, ...options }];
        return this;
    }

    /**
     * Add a nested object field to the schema
     * @param {string} fieldName - Field name
     * @param {Object} schema - Nested schema definition
     * @param {Object} options - Field options
     * @returns {SchemaBuilder} This instance for chaining
     */
    addObject(fieldName, schema, options = {}) {
        this.schemaDefinition[fieldName] = { type: schema, ...options };
        return this;
    }

    /**
     * Add timestamps (createdAt, updatedAt) to the schema
     * @param {boolean} value - Whether to include timestamps
     * @returns {SchemaBuilder} This instance for chaining
     */
    withTimestamps(value = true) {
        this.schemaOptions.timestamps = value;
        return this;
    }

    /**
     * Set schema options
     * @param {Object} options - Schema options
     * @returns {SchemaBuilder} This instance for chaining
     */
    withOptions(options) {
        this.schemaOptions = { ...this.schemaOptions, ...options };
        return this;
    }

    /**
     * Build the schema
     * @returns {Object} Schema definition and options
     */
    build() {
        return {
            definition: this.schemaDefinition,
            options: this.schemaOptions
        };
    }

    /**
     * Create a Mongoose model from the schema
     * @param {string} modelName - Model name
     * @param {MongoClient} client - MongoDB client instance
     * @returns {Model} Mongoose model
     */
    createModel(modelName, client) {
        const { definition, options } = this.build();
        return client.createModel(modelName, definition, options);
    }
}

/**
 * Repository class
 * Provides a higher-level interface for working with a specific collection
 */
class Repository {
    /**
     * Create a new repository
     * @param {MongoClient} client - MongoDB client instance
     * @param {string} collectionName - Collection name
     */
    constructor(client, collectionName) {
        this.client = client;
        this.collectionName = collectionName;
    }

    /**
     * Create a document
     * @param {Object} data - Document data
     * @returns {Promise<Object>} Created document
     */
    async create(data) {
        return await this.client.insertOne(this.collectionName, data);
    }

    /**
     * Create multiple documents
     * @param {Array} data - Document data array
     * @returns {Promise<Object>} Insert result
     */
    async createMany(data) {
        return await this.client.insertMany(this.collectionName, data);
    }

    /**
     * Find a document by ID
     * @param {string|ObjectId} id - Document ID
     * @returns {Promise<Object>} Found document or null
     */
    async findById(id) {
        const objectId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
        return await this.client.findOne(this.collectionName, { _id: objectId });
    }

    /**
     * Find a document by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Object>} Found document or null
     */
    async findOne(criteria) {
        return await this.client.findOne(this.collectionName, criteria);
    }

    /**
     * Find documents by criteria
     * @param {Object} criteria - Search criteria
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Found documents
     */
    async find(criteria = {}, options = {}) {
        return await this.client.find(this.collectionName, criteria, options);
    }

    /**
     * Update a document by ID
     * @param {string|ObjectId} id - Document ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Update result
     */
    async updateById(id, data) {
        const objectId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
        return await this.client.updateOne(
            this.collectionName, 
            { _id: objectId }, 
            { $set: { ...data, updatedAt: new Date() } }
        );
    }

    /**
     * Update documents by criteria
     * @param {Object} criteria - Search criteria
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Update result
     */
    async update(criteria, data) {
        return await this.client.updateMany(
            this.collectionName, 
            criteria, 
            { $set: { ...data, updatedAt: new Date() } }
        );
    }

    /**
     * Delete a document by ID
     * @param {string|ObjectId} id - Document ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteById(id) {
        const objectId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
        return await this.client.deleteOne(this.collectionName, { _id: objectId });
    }

    /**
     * Delete documents by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Object>} Delete result
     */
    async delete(criteria) {
        return await this.client.deleteMany(this.collectionName, criteria);
    }

    /**
     * Count documents by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<number>} Document count
     */
    async count(criteria = {}) {
        return await this.client.countDocuments(this.collectionName, criteria);
    }

    /**
     * Perform an aggregation pipeline
     * @param {Array} pipeline - Aggregation pipeline
     * @returns {Promise<Array>} Aggregation results
     */
    async aggregate(pipeline) {
        return await this.client.aggregate(this.collectionName, pipeline);
    }
}

// Export the classes
module.exports = {
    MongoConfiguration,
    MongoClient,
    SchemaBuilder,
    Repository
};
